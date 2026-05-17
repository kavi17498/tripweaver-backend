import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../../firebase/firebase.service';
import { Trip } from './entities/trip.entity';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripStatus } from './entities/trip-status.enum';
import { Participant } from './entities/participant.entity';
import { TripCategory } from './entities/trip-category.enum';
import { ApprovedPublicTripsQueryDto } from './dto/approved-public-trips-query.dto';
import { TripCardDto } from './dto/trip-card.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class TripsService {
  private readonly collectionName = 'trips';

  // small cache for organizerName lookups to avoid repeated DB calls
  private organizerNameCache = new Map<string, string>();

  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  private async resolveOrganizerName(organizerId?: string): Promise<string> {
    if (!organizerId) return '';
    if (this.organizerNameCache.has(organizerId)) {
      return this.organizerNameCache.get(organizerId)!;
    }

    try {
      const user = await this.usersService.findOne(organizerId);
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || organizerId;
      this.organizerNameCache.set(organizerId, name);
      return name;
    } catch (_) {
      // If user not found or error, fall back to id
      this.organizerNameCache.set(organizerId, organizerId);
      return organizerId;
    }
  }

  /**
   * Create a new trip
   */
  async create(createTripDto: CreateTripDto, userRole?: string): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const isPrivilegedCreator =
      userRole === 'admin' || userRole === 'superadmin' || userRole === 'guide';

    if (
      !isPrivilegedCreator &&
      createTripDto.tripCategory !== TripCategory.PRIVATE_TRIP
    ) {
      throw new BadRequestException(
        'Regular users can only create private trips. Admin, superadmin, and guide users can create all trip types.',
      );
    }

    // Validate date range
    const startDate = new Date(createTripDto.startDate);
    const endDate = new Date(createTripDto.endDate);

    if (startDate > endDate) {
      // Allow startDate === endDate for one-day trips
      throw new BadRequestException('End date must be the same or after the start date');
    }

    const photos = createTripDto.photos ?? [];
    const coverImage = createTripDto.coverImage ?? photos[0];

    // Default status to PENDING if not provided, but allow users to set DRAFT or PENDING on creation
    const initialStatus = createTripDto.status ?? TripStatus.PENDING;
    if (initialStatus !== TripStatus.DRAFT && initialStatus !== TripStatus.PENDING) {
      throw new BadRequestException(
        'On creation, trips can only be set to DRAFT or PENDING status. Other statuses require admin approval.',
      );
    }

    const newTrip: Trip = {
      ...createTripDto,
      photos,
      coverImage,
      status: initialStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(this.collectionName).add(newTrip);
    const id = docRef.id;

    return { ...newTrip, id };
  }

  /**
   * Get all trips
   */
  async findAll(status?: TripStatus): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const collection = db.collection(this.collectionName);
    const snapshot = status
      ? await collection.where('status', '==', status).get()
      : await collection.get();

    const trips: Trip[] = [];
    snapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  }

  /**
   * Get a single trip by ID
   */
  async findOne(id: string): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return { id: doc.id, ...doc.data() } as Trip;
  }

  /**
   * Get trips by organizer ID
   */
  async findByOrganizer(organizerId: string): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('organizer', '==', organizerId)
      .get();

    const trips: Trip[] = [];
    snapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  }

  /**
   * Get trips by category
   */
  async findByCategory(category: string): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('tripCategory', '==', category)
      .get();

    const trips: Trip[] = [];
    snapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  }

  /**
   * Update a trip
   * @param id Trip ID
   * @param updateTripDto Update data
   * @param userRole User role for authorization (optional)
   */
  async update(id: string, updateTripDto: UpdateTripDto, userRole?: string): Promise<Trip> {
    const db = this.firebaseService.getFirestore();

    // Check if trip exists
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    const currentTrip = doc.data() as Trip;

    // Validate status change permissions
    if (updateTripDto.status && updateTripDto.status !== currentTrip.status) {
      const isAdmin = userRole === 'admin' || userRole === 'superadmin';

      if (!isAdmin) {
        // Regular users can only change from DRAFT to PENDING
        if (currentTrip.status !== TripStatus.DRAFT || updateTripDto.status !== TripStatus.PENDING) {
          throw new BadRequestException(
            'Users can only change trip status from DRAFT to PENDING. Other status changes require admin privileges.',
          );
        }
      }
    }

    // Validate date range if dates are being updated
    if (updateTripDto.startDate && updateTripDto.endDate) {
      const startDate = new Date(updateTripDto.startDate);
      const endDate = new Date(updateTripDto.endDate);

      if (startDate > endDate) {
        // Allow startDate === endDate for one-day trips
        throw new BadRequestException('End date must be the same or after the start date');
      }
    }

    const updateData = {
      ...updateTripDto,
      photos: updateTripDto.photos,
      coverImage:
        updateTripDto.coverImage ??
        (updateTripDto.photos && updateTripDto.photos.length > 0
          ? updateTripDto.photos[0]
          : undefined),
      updatedAt: new Date(),
    };

    await db.collection(this.collectionName).doc(id).update(updateData);

    return this.findOne(id);
  }

  /**
   * Delete a trip
   */
  async remove(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();

    // Check if trip exists
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    await db.collection(this.collectionName).doc(id).delete();
  }

  /**
   * Add a participant to a trip
   */
  async addParticipants(
    tripId: string,
    request: AddParticipantsDto,
  ): Promise<Trip> {
    const db = this.firebaseService.getFirestore();

    const trip = await this.findOne(tripId);

    const newParticipants: Participant[] = request.participants.map((participant) => ({
      participantId: participant.participantId ?? randomUUID(),
      parentUserId: participant.parentUserId ?? null,
      name: participant.name,
      gender: participant.gender,
      age: participant.age,
      ...(participant.address !== undefined ? { address: participant.address } : {}),
      ...(participant.phone !== undefined ? { phone: participant.phone } : {}),
      ...(participant.email !== undefined ? { email: participant.email } : {}),
    }));

    if (!trip.participants) {
      trip.participants = [];
    }

    const nextParticipantCount = trip.participants.length + newParticipants.length;
    if (trip.maxParticipants && nextParticipantCount > trip.maxParticipants) {
      throw new BadRequestException(
        `This trip can only accept ${trip.maxParticipants} participants. The request would exceed that limit.`,
      );
    }

    trip.participants.push(...newParticipants);

    await db.collection(this.collectionName).doc(tripId).update({
      participants: trip.participants,
      updatedAt: new Date(),
    });

    return this.findOne(tripId);
  }

  async addParticipant(
    tripId: string,
    participant: Participant,
  ): Promise<Trip> {
    return this.addParticipants(tripId, {
      participants: [participant],
    });
  }

  /**
   * Update a specific participant on a trip
   */
  async updateParticipant(
    tripId: string,
    participantId: string,
    updateParticipantDto: UpdateParticipantDto,
  ): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const trip = await this.findOne(tripId);

    if (!trip.participants || trip.participants.length === 0) {
      throw new NotFoundException(`Participant with ID ${participantId} not found on trip ${tripId}`);
    }

    const participantIndex = trip.participants.findIndex(
      (participant) => participant.participantId === participantId,
    );

    if (participantIndex === -1) {
      throw new NotFoundException(`Participant with ID ${participantId} not found on trip ${tripId}`);
    }

    const currentParticipant = trip.participants[participantIndex];
    const updatedParticipant: Participant = {
      ...currentParticipant,
      ...updateParticipantDto,
      participantId: currentParticipant.participantId,
      ...(updateParticipantDto.parentUserId !== undefined
        ? { parentUserId: updateParticipantDto.parentUserId }
        : {}),
      ...(updateParticipantDto.address !== undefined
        ? { address: updateParticipantDto.address }
        : {}),
      ...(updateParticipantDto.phone !== undefined
        ? { phone: updateParticipantDto.phone }
        : {}),
      ...(updateParticipantDto.email !== undefined
        ? { email: updateParticipantDto.email }
        : {}),
    };

    trip.participants[participantIndex] = updatedParticipant;

    await db.collection(this.collectionName).doc(tripId).update({
      participants: trip.participants,
      updatedAt: new Date(),
    });

    return this.findOne(tripId);
  }

  /**
   * Get trips within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collectionName)
      .where('startDate', '>=', startDate)
      .where('endDate', '<=', endDate)
      .get();

    const trips: Trip[] = [];
    snapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  }

  /**
   * Return approved non-private trips as compact TripCardDto objects, with optional filters.
   */
  async findApprovedPublicTrips(
    filters: ApprovedPublicTripsQueryDto,
  ): Promise<TripCardDto[]> {
    const approvedTrips = await this.findAll(TripStatus.APPROVED);

    const filtered = approvedTrips.filter((trip) => {
      if (trip.tripCategory === TripCategory.PRIVATE_TRIP) {
        return false;
      }

      if (filters.tripCategory && trip.tripCategory !== filters.tripCategory) {
        return false;
      }

      if (filters.tripName && trip.tripName !== filters.tripName) {
        return false;
      }

      if (filters.organizer && trip.organizer !== filters.organizer) {
        return false;
      }

      if (filters.startLocation && trip.startLocation !== filters.startLocation) {
        return false;
      }

      if (filters.startDate && trip.startDate !== filters.startDate) {
        return false;
      }

      if (filters.endDate && trip.endDate !== filters.endDate) {
        return false;
      }

      if (filters.minPrice !== undefined && trip.price < filters.minPrice) {
        return false;
      }

      if (filters.maxPrice !== undefined && trip.price > filters.maxPrice) {
        return false;
      }

      return true;
    });

    const results = await Promise.all(
      filtered.map(async (trip) => {
        const mainDestNames = (trip.mainDestinations || []).map((d: any) => d.name || d);
        const bookedCount = (trip.participants || []).length;
        const organizerName = await this.resolveOrganizerName(trip.organizer as string | undefined);

        return {
          id: trip.id as string,
          tripName: trip.tripName,
          coverImage: trip.coverImage ?? (trip.photos && trip.photos[0]) ?? '',
          tripCategory: trip.tripCategory,
          price: trip.price,
          startDate: trip.startDate,
          endDate: trip.endDate,
          startLocation: trip.startLocation,
          mainDestinations: mainDestNames,
          maxParticipants: trip.maxParticipants ?? 0,
          bookedCount,
          organizerName: organizerName,
          rating: (trip as any).rating,
          status: trip.status,
        } as TripCardDto;
      }),
    );

    return results;
  }
}
