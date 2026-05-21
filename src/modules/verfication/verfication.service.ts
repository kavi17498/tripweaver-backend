
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVerficationDto } from './dto/create-verfication.dto';
import { UpdateVerficationDto } from './dto/update-verfication.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { Verfication } from './entities/verfication.entity';

@Injectable()
export class VerficationService {
  private collectionName = 'verificationRequests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
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
    q.forEach((d) => items.push({ id: d.id, ...(d.data() as any) } as Verfication));

    const toMillis = (value: any): number => {
      if (!value) return 0;
      if (typeof value?.toMillis === 'function') return value.toMillis();
      if (typeof value?._seconds === 'number') return value._seconds * 1000;
      if (value instanceof Date) return value.getTime();
      return 0;
    };

    items.sort((a: any, b: any) => {
      const createdA = toMillis(a?.createdAt);
      const createdB = toMillis(b?.createdAt);
      return createdB - createdA;
    });

    return items;
  }

  async findOne(id: string, userId?: string): Promise<Verfication> {
    const doc = await this.getCollection().doc(id).get();
    if (!doc.exists) throw new NotFoundException('Verification request not found');
    const data = doc.data() as any;
    if (userId && data.userId !== userId) throw new ForbiddenException('Not allowed to view this request');
    return { id: doc.id, ...data } as Verfication;
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
