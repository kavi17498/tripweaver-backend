import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { TripsService } from '../trips/trips.service';
import { ChatGroupsService } from '../chatgroups/chatgroups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { Trip } from '../trips/entities/trip.entity';
import { TripStatusChangeLogs } from '../trips/entities/trip-status-change-logs.entity';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { OnDemandTripTemplate } from '../onDemandTrips/entities/on-demand-trip-template.entity';

@Injectable()
export class AdminService {
  private readonly tripStatusChangeLogsCollection = 'tripStatusChangeLogs';
  private readonly onDemandTripsCollection = 'onDemandTrips';

  constructor(
    private readonly tripsService: TripsService,
    private readonly usersService: UsersService,
    private readonly chatGroupsService: ChatGroupsService,
    private readonly notificationsService: NotificationsService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getAllTrips(status?: TripStatus) {
    return this.tripsService.findAll(status);
  }

  async getAllOnDemandTrips(status?: TripStatus): Promise<OnDemandTripTemplate[]> {
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection(this.onDemandTripsCollection);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.normalizeOnDemandTrip(doc.data() || {}, doc.id));
  }

  async getTripById(id: string) {
    return this.tripsService.findOne(id);
  }

  async getOnDemandTripById(id: string): Promise<OnDemandTripTemplate> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.onDemandTripsCollection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`On-demand trip template with ID ${id} not found`);
    }

    return this.normalizeOnDemandTrip(doc.data() || {}, doc.id);
  }

  async updateTripStatus(
    tripId: string,
    dto: UpdateTripStatusDto,
    adminUserId: string,
  ): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const trip = await this.tripsService.findOne(tripId);

    const [organizerUser, adminUser] = await Promise.all([
      this.usersService.findOne(trip.organizer),
      this.usersService.findOne(adminUserId),
    ]);

    const organizerName = this.getUserName(organizerUser);
    const adminName = this.getUserName(adminUser);
    const now = new Date();
    const logRef = db.collection(this.tripStatusChangeLogsCollection).doc();
    const tripRef = db.collection('trips').doc(tripId);
    const reason = dto.reason?.trim() || (dto.status === TripStatus.IN_REVIEW ? 'Moved to the review queue.' : 'Status updated by admin.');

    const logEntry: TripStatusChangeLogs = {
      id: logRef.id,
      tripId,
      organizerId: trip.organizer,
      organizerName,
      userId: adminUserId,
      userName: adminName,
      status: dto.status,
      reason,
      updatedAt: now,
    };

    const tripUpdate: Record<string, unknown> = {
      status: dto.status,
      statusUpdatedBy: adminUserId,
      statusUpdatedByName: adminName,
      statusUpdatedAt: now,
      updatedAt: now,
    };

    if (reason) {
      tripUpdate.statusReason = reason;
    }

    const batch = db.batch();
    batch.update(tripRef, tripUpdate);
    batch.set(logRef, logEntry);

    await batch.commit();

    // Automatically create chat group and notify the organizer if trip is being approved.
    if (dto.status === TripStatus.APPROVED && trip.status !== TripStatus.APPROVED) {
      await this.chatGroupsService.ensureTripChatGroup({
        name: trip.tripName,
        tripId,
        adminId: trip.organizer,
        adminName: organizerName,
        description: `Discussion group for ${trip.tripName}`,
        members: [trip.organizer],
      });

      await this.notificationsService.createTripApprovedNotification({
        userId: trip.organizer,
        tripId,
        tripName: trip.tripName,
      });
    }

    return this.tripsService.findOne(tripId);
  }

  async updateOnDemandTripStatus(
    tripId: string,
    dto: UpdateTripStatusDto,
    adminUserId: string,
  ): Promise<OnDemandTripTemplate> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.onDemandTripsCollection).doc(tripId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`On-demand trip template with ID ${tripId} not found`);
    }

    const template = this.normalizeOnDemandTrip(doc.data() || {}, doc.id);
    const [organizerUser, adminUser] = await Promise.all([
      this.usersService.findOne(template.organizer),
      this.usersService.findOne(adminUserId),
    ]);

    const organizerName = this.getUserName(organizerUser);
    const adminName = this.getUserName(adminUser);
    const now = new Date();
    const logRef = db.collection(this.tripStatusChangeLogsCollection).doc();
    const reason = dto.reason?.trim() || (dto.status === TripStatus.IN_REVIEW ? 'Moved to the review queue.' : 'Status updated by admin.');

    const logEntry: TripStatusChangeLogs = {
      id: logRef.id,
      tripId,
      organizerId: template.organizer,
      organizerName,
      userId: adminUserId,
      userName: adminName,
      status: dto.status,
      reason,
      updatedAt: now,
    };

    const templateUpdate: Record<string, unknown> = {
      status: dto.status,
      statusUpdatedBy: adminUserId,
      statusUpdatedByName: adminName,
      statusUpdatedAt: now,
      updatedAt: now,
    };

    if (reason) {
      templateUpdate.statusReason = reason;
    }

    const batch = db.batch();
    batch.update(docRef, templateUpdate);
    batch.set(logRef, logEntry);
    await batch.commit();

    if (dto.status === TripStatus.APPROVED && template.status !== TripStatus.APPROVED) {
      await this.notificationsService.createTripApprovedNotification({
        userId: template.organizer,
        tripId,
        tripName: template.tripName,
      });
    }

    return this.getOnDemandTripById(tripId);
  }

  private getUserName(user: { firstName?: string; lastName?: string; email?: string; id?: string }): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      return fullName;
    }

    return user.email || user.id || 'Unknown user';
  }

  private normalizeOnDemandTrip(data: Record<string, any>, id?: string): OnDemandTripTemplate {
    return {
      id,
      tripName: data.tripName || '',
      durationLabel: data.durationLabel || `${Number(data.durationDays || 1)} day${Number(data.durationDays || 1) === 1 ? '' : 's'}`,
      durationDays: Number(data.durationDays || 1),
      tripCategory: data.tripCategory || 'On-demand trip',
      description: data.description || '',
      organizer: data.organizer || '',
      price: Number(data.price || 0),
      destinations: data.destinations || [],
      mainDestinations: data.mainDestinations || [],
      startLocation: data.startLocation || '',
      itinerary: data.itinerary,
      included: data.included,
      paymentMethods: data.paymentMethods || [],
      maxParticipants: Number(data.maxParticipants || 0),
      photos: data.photos || [],
      coverImage: data.coverImage || data.photos?.[0] || '',
      pickupType: data.pickupType,
      pickupCostPerKm: data.pickupCostPerKm,
      pickupStartLocation: data.pickupStartLocation,
      isHidden: Boolean(data.isHidden),
      status: (data.status as TripStatus) || TripStatus.PENDING,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    };
  }
}