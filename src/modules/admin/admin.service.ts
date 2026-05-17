import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { TripsService } from '../trips/trips.service';
import { ChatGroupsService } from '../chatgroups/chatgroups.service';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { Trip } from '../trips/entities/trip.entity';
import { TripStatusChangeLogs } from '../trips/entities/trip-status-change-logs.entity';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';

@Injectable()
export class AdminService {
  private readonly tripStatusChangeLogsCollection = 'tripStatusChangeLogs';

  constructor(
    private readonly tripsService: TripsService,
    private readonly usersService: UsersService,
    private readonly chatGroupsService: ChatGroupsService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getAllTrips(status?: TripStatus) {
    return this.tripsService.findAll(status);
  }

  async getTripById(id: string) {
    return this.tripsService.findOne(id);
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

    const logEntry: TripStatusChangeLogs = {
      id: logRef.id,
      tripId,
      organizerId: trip.organizer,
      organizerName,
      userId: adminUserId,
      userName: adminName,
      status: dto.status,
      reason: dto.reason,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.update(tripRef, {
      status: dto.status,
      statusReason: dto.reason,
      statusUpdatedBy: adminUserId,
      statusUpdatedByName: adminName,
      statusUpdatedAt: now,
      updatedAt: now,
    });
    batch.set(logRef, logEntry);

    await batch.commit();

    // Automatically create chat group if trip is being approved
    if (dto.status === TripStatus.APPROVED) {
      await this.chatGroupsService.create({
        name: trip.tripName,
        tripId,
        adminId: trip.organizer,
        adminName: organizerName,
        description: `Discussion group for ${trip.tripName}`,
        members: [trip.organizer],
      });
    }

    return this.tripsService.findOne(tripId);
  }

  private getUserName(user: { firstName?: string; lastName?: string; email?: string; id?: string }): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      return fullName;
    }

    return user.email || user.id || 'Unknown user';
  }
}