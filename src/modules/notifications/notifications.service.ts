import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly collectionName = 'notifications';

  constructor(private readonly firebaseService: FirebaseService) {}

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const now = new Date();
    const notification: NotificationEntity = {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      tripId: dto.tripId,
      read: dto.read ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.getCollection().add(notification);
    return { ...notification, id: docRef.id };
  }

  async findByUserId(userId: string): Promise<NotificationEntity[]> {
    const snapshot = await this.getCollection().where('userId', '==', userId).get();
    const notifications: NotificationEntity[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      const createdAt = data?.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate()
        : data?.createdAt ? new Date(data.createdAt) : new Date(0);
      const updatedAt = data?.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data?.updatedAt ? new Date(data.updatedAt) : createdAt;

      notifications.push({
        id: doc.id,
        ...data,
        createdAt,
        updatedAt,
      } as NotificationEntity);
    });

    notifications.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return notifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.findByUserId(userId);
    return notifications.filter((notification) => !notification.read).length;
  }

  async markAsRead(id: string): Promise<NotificationEntity> {
    const docRef = this.getCollection().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const now = new Date();
    await docRef.update({ read: true, updatedAt: now });

    return { id: doc.id, ...(doc.data() as Omit<NotificationEntity, 'id'>), read: true, updatedAt: now } as NotificationEntity;
  }

  async createTripApprovedNotification(params: {
    userId: string;
    tripId: string;
    tripName: string;
  }): Promise<NotificationEntity> {
    return this.create({
      userId: params.userId,
      type: 'trip-approved',
      title: 'Your trip was approved',
      description: `Your trip "${params.tripName}" is now approved and visible to travelers.`,
      tripId: params.tripId,
      read: false,
    });
  }
}
