import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../firebase/firebase.service';
import { VerificationMeeting } from './entities/verificationmeeting.entity';
import { CreateVerificationMeetingDto } from './dto/create-verificationmeeting.dto';

@Injectable()
export class VerificationMeetingService {
  private readonly collectionName = 'verificationMeetings';
  private readonly verificationCollectionName = 'verificationRequests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  async createMeeting(dto: CreateVerificationMeetingDto, adminId: string, adminName?: string): Promise<VerificationMeeting> {
    if (!dto.verificationId) {
      throw new BadRequestException('verificationId is required');
    }
    if (!dto.scheduledAt) {
      throw new BadRequestException('scheduledAt is required');
    }

    const verificationRef = this.firebaseService
      .getFirestore()
      .collection(this.verificationCollectionName)
      .doc(dto.verificationId);

    const verificationSnap = await verificationRef.get();
    if (!verificationSnap.exists) {
      throw new NotFoundException('Verification request not found');
    }

    const verificationData = verificationSnap.data() as any;
    const userId = verificationData?.userId;
    if (!userId) {
      throw new BadRequestException('Verification request is missing user id');
    }

    const existing = await this.getCollection().where('verificationId', '==', dto.verificationId).limit(1).get();

    const payload = {
      verificationId: dto.verificationId,
      userId,
      scheduledAt: dto.scheduledAt,
      createdBy: adminId,
      createdByName: adminName || 'Admin',
      mailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      await docRef.set(payload, { merge: true });
      const updated = await docRef.get();
      return { id: updated.id, ...(updated.data() as any) } as VerificationMeeting;
    }

    const docRef = this.getCollection().doc();
    await docRef.set({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const created = await docRef.get();
    return { id: created.id, ...(created.data() as any) } as VerificationMeeting;
  }

  async submitSummary(verificationId: string, summary: string, adminId: string): Promise<VerificationMeeting> {
    if (!verificationId) {
      throw new BadRequestException('verificationId is required');
    }

    const nextSummary = summary?.trim();
    if (!nextSummary) {
      throw new BadRequestException('summary is required');
    }

    const existing = await this.getCollection().where('verificationId', '==', verificationId).limit(1).get();
    if (existing.empty) {
      throw new NotFoundException('Verification meeting not found. Schedule a meeting first.');
    }

    const docRef = existing.docs[0].ref;
    await docRef.set(
      {
        meetingSummary: nextSummary,
        summarySubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminId,
      },
      { merge: true },
    );

    const updated = await docRef.get();
    return { id: updated.id, ...(updated.data() as any) } as VerificationMeeting;
  }

  async getByVerificationId(verificationId: string): Promise<VerificationMeeting | null> {
    if (!verificationId) return null;

    const existing = await this.getCollection().where('verificationId', '==', verificationId).limit(1).get();
    if (existing.empty) {
      return null;
    }

    const doc = existing.docs[0];
    return { id: doc.id, ...(doc.data() as any) } as VerificationMeeting;
  }
}
