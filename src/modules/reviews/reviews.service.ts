import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FirebaseService } from '../../firebase/firebase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TripsService } from '../trips/trips.service';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewEntity } from './entities/review.entity';
import { TripReviewSummaryEntity } from './entities/trip-review-summary.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Participant } from '../trips/entities/participant.entity';

@Injectable()
export class ReviewsService implements OnModuleInit {
  private readonly collectionName = 'reviews';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly tripsService: TripsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.runReminderSweep();
  }

  @Cron('0 */15 * * * *', { name: 'review-reminder-sweep' })
  async handleReminderSweep(): Promise<void> {
    await this.runReminderSweep();
  }

  private getCollection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  private normalizeEndTime(endTime?: string): string {
    if (!endTime) return '23:59:59.999';

    const trimmedEndTime = endTime.trim();
    if (/^\d{2}:\d{2}$/.test(trimmedEndTime)) return `${trimmedEndTime}:59.999`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedEndTime)) return `${trimmedEndTime}.999`;

    return trimmedEndTime;
  }

  private isTripEnded(trip: Trip): boolean {
    const tripEnd = new Date(`${trip.endDate}T${this.normalizeEndTime(trip.endTime)}`);
    return !Number.isNaN(tripEnd.getTime()) && new Date() > tripEnd;
  }

  private toDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }

    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date(0);
  }

  private mapReview(docId: string, data: Record<string, unknown>): ReviewEntity {
    const createdAt = this.toDate(data.createdAt);
    const updatedAt = this.toDate(data.updatedAt ?? data.createdAt);

    return {
      id: docId,
      tripId: String(data.tripId ?? ''),
      userId: String(data.userId ?? ''),
      userName: String(data.userName ?? ''),
      rating: Number(data.rating ?? 0),
      comment: String(data.comment ?? ''),
      createdAt,
      updatedAt,
    };
  }

  private async findParticipantForUser(trip: Trip, userId: string): Promise<Participant | null> {
    const participants = Array.isArray(trip.participants) ? trip.participants : [];
    const directParticipant = participants.find((participant) => participant.parentUserId === userId);
    if (directParticipant) {
      return directParticipant;
    }

    try {
      const user = await this.usersService.findOne(userId);
      const userEmail = user.email?.trim().toLowerCase();
      if (!userEmail) {
        return null;
      }

      return participants.find((participant) => participant.email?.trim().toLowerCase() === userEmail) ?? null;
    } catch {
      return null;
    }
  }

  private async findBookingParticipants(trip: Trip, userId: string): Promise<Participant[]> {
    const participants = Array.isArray(trip.participants) ? trip.participants : [];
    const directParticipants = participants.filter((participant) => participant.parentUserId === userId);

    if (directParticipants.length > 0) {
      return directParticipants;
    }

    try {
      const user = await this.usersService.findOne(userId);
      const userEmail = user.email?.trim().toLowerCase();
      if (!userEmail) {
        return [];
      }

      return participants.filter((participant) => participant.email?.trim().toLowerCase() === userEmail);
    } catch {
      return [];
    }
  }

  private async resolveParticipantUserId(participant: Participant): Promise<string | null> {
    if (participant.parentUserId) {
      return participant.parentUserId;
    }

    const participantEmail = participant.email?.trim();
    if (!participantEmail) {
      return null;
    }

    const user = await this.usersService.findByEmail(participantEmail);
    return user?.id ?? null;
  }

  private async resolveUserName(userId: string, fallbackName?: string): Promise<string> {
    if (fallbackName?.trim()) {
      return fallbackName.trim();
    }

    try {
      const user = await this.usersService.findOne(userId);
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return fullName || user.email || userId;
    } catch {
      return userId;
    }
  }

  private async loadTripReviews(tripId: string): Promise<ReviewEntity[]> {
    const snapshot = await this.getCollection().where('tripId', '==', tripId).get();
    const reviews: ReviewEntity[] = [];

    snapshot.forEach((doc) => {
      reviews.push(this.mapReview(doc.id, doc.data() as Record<string, unknown>));
    });

    reviews.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return reviews;
  }

  private async ensureReviewReminder(userId: string, trip: Trip, participantName: string, hasReview: boolean): Promise<boolean> {
    if (!this.isTripEnded(trip) || hasReview) {
      return false;
    }

    const existingNotifications = await this.notificationsService.findByUserId(userId);
    const reminderTitle = `Post your review for ${trip.tripName}`;
    const alreadyQueued = existingNotifications.some(
      (notification) =>
        notification.type === 'reminder' &&
        notification.tripId === trip.id &&
        notification.title === reminderTitle,
    );

    if (alreadyQueued) {
      return true;
    }

    await this.notificationsService.createReviewReminderNotification({
      userId,
      tripId: trip.id ?? '',
      tripName: trip.tripName,
    });

    return true;
  }

  private async runReminderSweep(): Promise<void> {
    const trips = await this.tripsService.findAll();

    for (const trip of trips) {
      if (!this.isTripEnded(trip) || !Array.isArray(trip.participants) || trip.participants.length === 0) {
        continue;
      }

      const tripReviews = await this.loadTripReviews(trip.id ?? '');
      const processedUserIds = new Set<string>();

      for (const participant of trip.participants) {
        const userId = await this.resolveParticipantUserId(participant);
        if (!userId || processedUserIds.has(userId)) {
          continue;
        }

        processedUserIds.add(userId);

        const alreadyReviewed = tripReviews.some((review) => review.userId === userId);
        if (alreadyReviewed) {
          continue;
        }

        const existingNotifications = await this.notificationsService.findByUserId(userId);
        const reminderTitle = `Post your review for ${trip.tripName}`;
        const reminderExists = existingNotifications.some(
          (notification) =>
            notification.type === 'reminder' &&
            notification.tripId === trip.id &&
            notification.title === reminderTitle,
        );

        if (reminderExists) {
          continue;
        }

        await this.notificationsService.createReviewReminderNotification({
          userId,
          tripId: trip.id ?? '',
          tripName: trip.tripName,
        });
      }
    }
  }

  async findByTripId(tripId: string): Promise<ReviewEntity[]> {
    const reviews = await this.loadTripReviews(tripId);
    return reviews;
  }

  async findParticipantReviewSummaries(userId: string): Promise<TripReviewSummaryEntity[]> {
    const trips = await this.tripsService.findParticipatedTrips(userId);
    const summaries: Array<TripReviewSummaryEntity | null> = await Promise.all(
      trips.map(async (trip) => {
        const participant = await this.findParticipantForUser(trip, userId);
        if (!participant) {
          return null;
        }

        const bookingParticipants = await this.findBookingParticipants(trip, userId);

        const reviews = await this.loadTripReviews(trip.id ?? '');
        const myReview = reviews.find((review) => review.userId === userId) ?? null;
        const tripEnded = this.isTripEnded(trip);
        const reminderSent = await this.ensureReviewReminder(userId, trip, participant.name, Boolean(myReview));

        return {
          tripId: trip.id ?? '',
          tripName: trip.tripName,
          destination: trip.destinations?.[0]?.name ?? trip.startLocation ?? 'Unknown destination',
          startDate: trip.startDate,
          endDate: trip.endDate,
          startTime: trip.startTime ?? '',
          endTime: trip.endTime,
          participantId: participant.participantId,
          participantName: participant.name,
          participantEmail: participant.email,
          bookingSeatCount: bookingParticipants.length || 1,
          participantCount: Array.isArray(trip.participants) ? trip.participants.length : 0,
          tripEnded,
          canReview: tripEnded && !myReview,
          reminderSent,
          reviews,
          myReview,
        } satisfies TripReviewSummaryEntity;
      }),
    );

    return summaries
      .filter((summary): summary is TripReviewSummaryEntity => summary !== null)
      .sort((left, right) => {
        if (left.tripEnded !== right.tripEnded) {
          return left.tripEnded ? -1 : 1;
        }

        return right.endDate.localeCompare(left.endDate);
      });
  }

  async submitReview(userId: string, dto: CreateReviewDto): Promise<ReviewEntity> {
    const trip = await this.tripsService.findOne(dto.tripId);
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${dto.tripId} not found`);
    }

    const participant = await this.findParticipantForUser(trip, userId);
    if (!participant) {
      throw new ForbiddenException('Only trip participants can submit reviews for this trip.');
    }

    if (!this.isTripEnded(trip)) {
      throw new BadRequestException('Reviews are only available after the trip ends.');
    }

    const rating = Number(dto.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5.');
    }

    const comment = dto.comment?.trim();
    if (!comment) {
      throw new BadRequestException('comment is required');
    }

    const userName = await this.resolveUserName(userId, dto.userName || participant.name);
    const now = new Date();

    const existingSnapshot = await this.getCollection()
      .where('tripId', '==', dto.tripId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const docRef = existingSnapshot.docs[0].ref;
      await docRef.set(
        {
          tripId: dto.tripId,
          userId,
          userName,
          rating,
          comment,
          updatedAt: now,
        },
        { merge: true },
      );

      const updated = await docRef.get();
      return this.mapReview(updated.id, updated.data() as Record<string, unknown>);
    }

    const review: ReviewEntity = {
      tripId: dto.tripId,
      userId,
      userName,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.getCollection().add(review);
    return { ...review, id: docRef.id };
  }
}