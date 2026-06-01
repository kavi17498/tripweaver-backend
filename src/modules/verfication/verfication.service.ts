
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVerficationDto } from './dto/create-verfication.dto';
import { UpdateVerficationDto } from './dto/update-verfication.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { Verfication } from './entities/verfication.entity';
import { UsersService } from '../users/users.service';
import { TripsService } from '../trips/trips.service';
import { VerificationMeetingService } from '../verificationmeeting/verificationmeeting.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VerficationService {
  private collectionName = 'verificationRequests';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly tripsService: TripsService,
    private readonly verificationMeetingService: VerificationMeetingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  private asVerfication(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Verfication {
    return { id: doc.id, ...(doc.data() as any) } as Verfication;
  }

  private toMillis(value: any): number {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?._seconds === 'number') return value._seconds * 1000;
    if (value instanceof Date) return value.getTime();
    return 0;
  }

  async create(userId: string, createVerficationDto: CreateVerficationDto): Promise<Verfication> {
    if (!userId) throw new BadRequestException('Missing user id');
    if (!createVerficationDto.sltdaGuideLicense || !createVerficationDto.nicImageFront || !createVerficationDto.nicImageBack) {
      throw new BadRequestException('Missing required verification files');
    }

    const payload = {
      ...createVerficationDto,
      userId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any;

    const docRef = await this.getCollection().add(payload);
    const snap = await docRef.get();
    return { id: docRef.id, ...(snap.data() as any) } as Verfication;
  }

  async findForUser(userId: string): Promise<Verfication[]> {
    if (!userId) return [];

    let q: FirebaseFirestore.QuerySnapshot;
    try {
      q = await this.getCollection().where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    } catch (error: any) {
      // Composite index may be missing for userId + createdAt; fall back to local sorting.
      const needsIndex =
        error?.code === 9 ||
        error?.code === 'failed-precondition' ||
        `${error?.details ?? ''}`.toLowerCase().includes('requires an index');

      if (!needsIndex) throw error;

      q = await this.getCollection().where('userId', '==', userId).get();
    }

    const items: Verfication[] = [];
    q.forEach((d) => items.push(this.asVerfication(d)));

    items.sort((a: any, b: any) => {
      const createdA = this.toMillis(a?.createdAt);
      const createdB = this.toMillis(b?.createdAt);
      return createdB - createdA;
    });

    return items;
  }

  async findPendingForAdmin(): Promise<Verfication[]> {
    const snap = await this.getCollection().where('status', '==', 'pending').get();
    const items: Verfication[] = [];
    snap.forEach((doc) => items.push(this.asVerfication(doc)));

    items.sort((a: any, b: any) => {
      const createdA = this.toMillis(a?.createdAt);
      const createdB = this.toMillis(b?.createdAt);
      return createdB - createdA;
    });

    return items;
  }

  async findInReviewForAdmin(adminId: string): Promise<Verfication[]> {
    if (!adminId) return [];

    const snap = await this.getCollection()
      .where('status', '==', 'in-review')
      .where('inReviewBy', '==', adminId)
      .get();

    const items: Verfication[] = [];
    snap.forEach((doc) => items.push(this.asVerfication(doc)));

    items.sort((a: any, b: any) => {
      const createdA = this.toMillis(a?.createdAt);
      const createdB = this.toMillis(b?.createdAt);
      return createdB - createdA;
    });

    return items;
  }

  async moveManyToInReview(ids: string[], adminId: string, adminName?: string): Promise<{ movedIds: string[]; skippedIds: string[] }> {
    if (!adminId) throw new BadRequestException('Missing admin id');
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Request ids are required');
    }

    const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0)));
    if (!uniqueIds.length) {
      throw new BadRequestException('No valid request ids provided');
    }

    const refs = uniqueIds.map((id) => this.getCollection().doc(id));
    const snaps = await Promise.all(refs.map((ref) => ref.get()));

    const batch = this.firebaseService.getFirestore().batch();
    const movedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const snap of snaps) {
      if (!snap.exists) {
        skippedIds.push(snap.id);
        continue;
      }

      const data = snap.data() as any;
      if (data?.status !== 'pending') {
        skippedIds.push(snap.id);
        continue;
      }

      batch.update(snap.ref, {
        status: 'in-review',
        inReviewBy: adminId,
        inReviewByName: adminName || 'Admin',
        inReviewAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      movedIds.push(snap.id);
    }

    if (movedIds.length) {
      await batch.commit();
    }

    return { movedIds, skippedIds };
  }

  async findOne(id: string, userId?: string): Promise<Verfication> {
    const doc = await this.getCollection().doc(id).get();
    if (!doc.exists) throw new NotFoundException('Verification request not found');
    const data = doc.data() as any;
    if (userId && data.userId !== userId) throw new ForbiddenException('Not allowed to view this request');
    return { id: doc.id, ...data } as Verfication;
  }

  async getAdminReviewDetails(id: string): Promise<{
    verification: Verfication;
    user: any;
    trips: any[];
    meeting: any | null;
  }> {
    const verification = await this.findOne(id);
    const user = await this.usersService.findOne(verification.userId);
    const trips = await this.tripsService.findByOrganizer(verification.userId);
    const meeting = await this.verificationMeetingService.getByVerificationId(id);

    return {
      verification,
      user,
      trips,
      meeting,
    };
  }

  async approveByAdmin(id: string, adminId: string, adminName?: string): Promise<Verfication> {
    const docRef = this.getCollection().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Verification request not found');

    const data = snap.data() as any;
    if (data.status === 'rejected') {
      throw new BadRequestException('Cannot approve a rejected request');
    }

    await docRef.update({
      status: 'approved',
      approvedBy: adminId,
      approvedByName: adminName || 'Admin',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, ...(updatedSnap.data() as any) } as Verfication;
  }

  async rejectByAdmin(id: string, adminId: string, reason: string, adminName?: string): Promise<Verfication> {
    const docRef = this.getCollection().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Verification request not found');

    const data = snap.data() as any;
    if (data.status === 'approved') {
      throw new BadRequestException('Cannot reject an approved request');
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    await docRef.update({
      status: 'rejected',
      rejectionReason: trimmedReason,
      rejectedBy: adminId,
      rejectedByName: adminName || 'Admin',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await this.notificationsService.create({
      userId: data.userId,
      type: 'account-alert',
      title: 'Verification request rejected',
      description: `Your verification request was rejected. Reason: ${trimmedReason}`,
      read: false,
    });

    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, ...(updatedSnap.data() as any) } as Verfication;
  }

  async update(id: string, userId: string, updateDto: UpdateVerficationDto): Promise<Verfication> {
    const docRef = this.getCollection().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Verification request not found');
    const data = snap.data() as any;
    if (data.userId !== userId) throw new ForbiddenException('Not allowed to edit this request');
    if (data.status === 'approved' || data.status === 'in-review') {
      throw new BadRequestException('Cannot edit a request that is in-review or approved');
    }

    const payload = {
      // always apply the requested changes but force user edits back to 'pending'
      ...updateDto,
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any;

    await docRef.update(payload);
    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, ...(updatedSnap.data() as any) } as Verfication;
  }

  async remove(id: string, userId: string): Promise<void> {
    const docRef = this.getCollection().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Verification request not found');
    const data = snap.data() as any;
    if (data.userId !== userId) throw new ForbiddenException('Not allowed to delete this request');
    if (data.status === 'approved') {
      throw new BadRequestException('Cannot delete an approved request');
    }

    await docRef.delete();
  }
}
