import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../../firebase/firebase.service';
import { Trip } from './entities/trip.entity';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripStatus } from './entities/trip-status.enum';
import { TripPaymentMethod } from './entities/trip-payment-method.enum';
import { Participant } from './entities/participant.entity';
import { TripCategory } from './entities/trip-category.enum';
import { ApprovedPublicTripsQueryDto } from './dto/approved-public-trips-query.dto';
import { TripCardDto } from './dto/trip-card.dto';
import { UsersService } from '../users/users.service';
import { ChatGroupsService } from '../chatgroups/chatgroups.service';
import { ChatMessagesService } from '../chatmessages/chatmessages.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TripsService {
  private readonly collectionName = 'trips';

  // small cache for organizerName lookups to avoid repeated DB calls
  private organizerNameCache = new Map<string, string>();

  private normalizeEndTime(endTime?: string): string {
    if (!endTime) return '23:59:59.999';

    const trimmedEndTime = endTime.trim();
    if (/^\d{2}:\d{2}$/.test(trimmedEndTime)) return `${trimmedEndTime}:59.999`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedEndTime)) return `${trimmedEndTime}.999`;

    return trimmedEndTime;
  }

  private isTripExpired(endDate?: string, endTime?: string): boolean {
    if (!endDate) return true;

    const tripEnd = new Date(`${endDate}T${this.normalizeEndTime(endTime)}`);
    if (Number.isNaN(tripEnd.getTime())) return true;

    return new Date() > tripEnd;
  }

  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
    @Inject(forwardRef(() => ChatGroupsService))
    private chatGroupsService: ChatGroupsService,
    private chatMessagesService: ChatMessagesService,
    private notificationsService: NotificationsService,
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

  private async resolveUserDisplayName(userId: string): Promise<string> {
    try {
      const user = await this.usersService.findOne(userId);
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userId;
    } catch {
      return userId;
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

    await this.chatGroupsService.ensureTripChatGroup({
      tripId: id,
      name: newTrip.tripName,
      adminId: newTrip.organizer,
      adminName: await this.resolveOrganizerName(newTrip.organizer),
      description: `Discussion group for ${newTrip.tripName}`,
      members: [newTrip.organizer],
    });

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

    const trip = { id: doc.id, ...doc.data() } as Trip & { organizerProfile?: any };

    // Attempt to attach public organizer profile for client convenience
    try {
      if (trip.organizer) {
        const profile = await this.usersService.getOrganizerPublicProfile(String(trip.organizer));
        if (profile && profile.organizer) {
          (trip as any).organizerProfile = profile.organizer;
          // Attach aggregate stats if available
          if (profile.overallRating !== undefined) {
            (trip as any).organizerProfile.overallRating = profile.overallRating;
          }
          if (profile.totalReviews !== undefined) {
            (trip as any).organizerProfile.totalReviews = profile.totalReviews;
          }
        }
      }
    } catch (err) {
      // non-fatal - if users service fails, return trip without profile
    }

    return trip as Trip;
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
   * Get trips where the user participated but did not create the trip
   */
  async findParticipatedTrips(userId: string): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();

    const trips: Trip[] = [];

    snapshot.forEach((doc) => {
      const trip = { id: doc.id, ...doc.data() } as Trip;
      const isCreator = trip.organizer === userId;
      const hasParticipated = Array.isArray(trip.participants)
        ? trip.participants.some((participant) => participant.parentUserId === userId)
        : false;

      if (!isCreator && hasParticipated) {
        trips.push(trip);
      }
    });

    return trips;
  }

  /**
   * Cancel the current user's booking for a trip.
   */
  async cancelBooking(tripId: string, userId: string): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collectionName).doc(tripId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const trip = { id: doc.id, ...doc.data() } as Trip;

    if (trip.organizer === userId) {
      throw new BadRequestException('Trip creators cannot cancel their own trip booking here.');
    }

    const existingParticipants = Array.isArray(trip.participants) ? trip.participants : [];
    const matchedParticipants = existingParticipants.filter((participant) => participant.parentUserId === userId);

    if (matchedParticipants.length === 0) {
      throw new BadRequestException('You do not have an active booking for this trip.');
    }

    const updatedParticipants = existingParticipants.filter((participant) => participant.parentUserId !== userId);
    const userName = await this.resolveUserDisplayName(userId);
    const chatGroup = await this.chatGroupsService.findOneByTripId(tripId);
    const cancelMessage = `${userName} said: Sorry, I am leaving the trip.`;

    if (chatGroup) {
      await this.chatMessagesService.create(chatGroup.id!, {
        senderId: userId,
        senderName: userName,
        message: cancelMessage,
      });
    }

    await docRef.update({
      participants: updatedParticipants,
      updatedAt: new Date(),
    });

    if (chatGroup) {
      await this.chatGroupsService.removeMember(chatGroup.id!, userId);
    }

    await this.notificationsService.create({
      userId: trip.organizer,
      type: 'account-alert',
      title: 'Booking canceled',
      description: `${userName} canceled their booking for "${trip.tripName}".`,
      tripId,
      read: false,
    });

    const paymentsSnapshot = await db.collection('payments').where('tripId', '==', tripId).get();
    const deletions: Array<Promise<unknown>> = [];

    paymentsSnapshot.forEach((paymentDoc) => {
      const data = paymentDoc.data() as Record<string, unknown>;
      const paymentUserId = data.userId ?? data.parentUserId ?? data.buyerId ?? data.customerId ?? data.payerId;
      if (paymentUserId === userId) {
        deletions.push(paymentDoc.ref.delete());
      }
    });

    await Promise.all(deletions);

    return this.findOne(tripId);
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
    const availablePaymentMethods = trip.paymentMethods ?? [];

    if (!availablePaymentMethods.length) {
      throw new BadRequestException('This trip does not have any payment methods configured.');
    }

    const selectedPaymentMethod =
      request.paymentMethod ??
      (availablePaymentMethods.length === 1 ? availablePaymentMethods[0] : undefined);

    if (!selectedPaymentMethod) {
      throw new BadRequestException('Please select a payment method for this booking.');
    }

    if (!availablePaymentMethods.includes(selectedPaymentMethod as TripPaymentMethod)) {
      throw new BadRequestException('The selected payment method is not available for this trip.');
    }

    if (trip.status !== TripStatus.APPROVED) {
      throw new BadRequestException('This trip is not available for booking.');
    }

    if (this.isTripExpired(trip.endDate, trip.endTime)) {
      throw new BadRequestException('This trip has expired.');
    }

    // Enforce trip-category specific booking rules (server-authoritative)
    const category = trip.tripCategory;

    // If trip is already explicitly reserved (for family/solo), prevent further bookings
    const isReservedFor = (trip as any).reservedFor as string | undefined;
    if (isReservedFor === 'family' || isReservedFor === 'solo') {
      throw new BadRequestException('This trip has been reserved and is no longer bookable.');
    }

    const bookingId = randomUUID();
    const newParticipants: Participant[] = request.participants.map((participant) => ({
      participantId: participant.participantId ?? randomUUID(),
      parentUserId: participant.parentUserId ?? null,
      name: participant.name,
      gender: participant.gender,
      age: participant.age,
      paymentMethod: selectedPaymentMethod as TripPaymentMethod,
      status: 'pending',
      bookingId: bookingId,
      ...(participant.address !== undefined ? { address: participant.address } : {}),
      ...(participant.phone !== undefined ? { phone: participant.phone } : {}),
      ...(participant.email !== undefined ? { email: participant.email } : {}),
    }));

    if (!trip.participants) {
      trip.participants = [];
    }

    // Prevent duplicate bookings by the same user for the same trip (ignoring rejected ones)
    const existingParticipants = trip.participants || [];
    for (const np of newParticipants) {
      if (np.parentUserId) {
        const duplicate = existingParticipants.find((ep) => ep.parentUserId && ep.parentUserId === np.parentUserId && ep.status !== 'rejected');
        if (duplicate) {
          throw new BadRequestException('You have already booked this trip.');
        }
      }

      if (np.email) {
        const duplicateByEmail = existingParticipants.find((ep) => ep.email && ep.email === np.email && ep.status !== 'rejected');
        if (duplicateByEmail) {
          throw new BadRequestException('A participant with this email has already been booked for this trip.');
        }
      }
    }

    const activeParticipantsCount = existingParticipants.filter((p) => p.status !== 'rejected').length;
    const nextParticipantCount = activeParticipantsCount + newParticipants.length;
    if (trip.maxParticipants && nextParticipantCount > trip.maxParticipants) {
      throw new BadRequestException(
        `This trip can only accept ${trip.maxParticipants} participants. The request would exceed that limit.`,
      );
    }

    // Category-specific restrictions: Family and Solo trips can only be booked once (one active booking may contain multiple family members)
    if (
      category === TripCategory.FAMILY_TRIP_WITH_GUIDE ||
      category === TripCategory.SOLO_TRIP_WITH_GUIDE
    ) {
      // If there are already active (not rejected) participants, the trip is finished for booking
      if (activeParticipantsCount > 0) {
        // If any of the new participants match existing active participants by parentUserId or email,
        // return a user-friendly message indicating they already booked this trip.
        const alreadyBooked = newParticipants.some((np) => {
          if (np.parentUserId) {
            return existingParticipants.some((ep) => ep.parentUserId && ep.parentUserId === np.parentUserId && ep.status !== 'rejected');
          }
          if (np.email) {
            return existingParticipants.some((ep) => ep.email && ep.email === np.email && ep.status !== 'rejected');
          }
          return false;
        });

        if (alreadyBooked) {
          throw new BadRequestException('You have already booked this trip.');
        }

        throw new BadRequestException('This trip is no longer available for booking.');
      }
    }

    trip.participants.push(...newParticipants);

    // If this booking reserves the trip (family or solo), mark reservation metadata - we will handle reservation on acceptance, not request

    const updatePayload: any = {
      participants: trip.participants,
      updatedAt: new Date(),
    };

    await db.collection(this.collectionName).doc(tripId).update(updatePayload);

    // Send notification to the organizer/guide
    const bookerName = newParticipants[0]?.name || 'Someone';
    await this.notificationsService.create({
      userId: trip.organizer,
      type: 'join-request',
      title: 'New Booking Request',
      description: `${bookerName} requested to participate in your trip "${trip.tripName}".`,
      tripId,
      read: false,
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
   * Update status of multiple participants (approve/reject)
   */
  async updateParticipantsStatus(
    tripId: string,
    participantIds: string[],
    status: 'accepted' | 'rejected',
  ): Promise<Trip> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collectionName).doc(tripId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const trip = { id: doc.id, ...doc.data() } as Trip;
    const participants = Array.isArray(trip.participants) ? trip.participants : [];

    let updatedCount = 0;
    const matchedParticipants: Participant[] = [];
    const updatedParticipants = participants.map((p) => {
      if (p.participantId && participantIds.includes(p.participantId)) {
        updatedCount++;
        matchedParticipants.push(p);
        return { ...p, status };
      }
      return p;
    });

    if (updatedCount === 0) {
      throw new NotFoundException('No matching participants found on this trip.');
    }

    const updatePayload: any = {
      participants: updatedParticipants,
      updatedAt: new Date(),
    };

    const firstMatched = matchedParticipants[0];

    if (status === 'accepted') {
      // Add unique parentUserIds to the chat group
      const bookingMemberIds = Array.from(
        new Set(
          matchedParticipants
            .map((p) => p.parentUserId)
            .filter((uid): uid is string => Boolean(uid)),
        ),
      );

      if (bookingMemberIds.length > 0) {
        const chatGroup = await this.chatGroupsService.ensureTripChatGroup({
          tripId,
          name: trip.tripName,
          adminId: trip.organizer,
          adminName: await this.resolveOrganizerName(trip.organizer),
          description: `Discussion group for ${trip.tripName}`,
          members: [trip.organizer],
        });

        await this.chatGroupsService.addMembers(chatGroup.id!, bookingMemberIds);

        // Send welcome message(s) from the chat admin (trip organizer)
        const adminName = await this.resolveOrganizerName(trip.organizer);
        for (const userId of bookingMemberIds) {
          try {
            const memberName = await this.resolveUserDisplayName(userId);
            await this.chatMessagesService.create(chatGroup.id!, {
              senderId: trip.organizer,
              senderName: adminName,
              message: `Hello, welcome ${memberName} to the chat group!`,
            });
          } catch (msgErr) {
            console.error('Failed to send welcome message for user:', userId, msgErr);
          }
        }
      }


      // Handle category-specific reservation
      const category = trip.tripCategory;
      if (category === TripCategory.FAMILY_TRIP_WITH_GUIDE) {
        updatePayload.reservedFor = 'family';
        updatePayload.reservedByUserId = firstMatched.parentUserId ?? null;
        updatePayload.reservedAt = new Date();
      } else if (category === TripCategory.SOLO_TRIP_WITH_GUIDE) {
        updatePayload.reservedFor = 'solo';
        updatePayload.reservedByUserId = firstMatched.parentUserId ?? null;
        updatePayload.reservedAt = new Date();
      }

      // Notify user(s)
      const notifyPromises = bookingMemberIds.map((userId) =>
        this.notificationsService.create({
          userId,
          type: 'account-alert',
          title: 'Booking Accepted',
          description: `Your booking request for "${trip.tripName}" has been accepted by the guide.`,
          tripId,
          read: false,
        }),
      );
      await Promise.all(notifyPromises);
    } else if (status === 'rejected') {
      const bookingMemberIds = Array.from(
        new Set(
          matchedParticipants
            .map((p) => p.parentUserId)
            .filter((uid): uid is string => Boolean(uid)),
        ),
      );

      // Notify user(s)
      const notifyPromises = bookingMemberIds.map((userId) =>
        this.notificationsService.create({
          userId,
          type: 'account-alert',
          title: 'Booking Rejected',
          description: `Your booking request for "${trip.tripName}" was not accepted.`,
          tripId,
          read: false,
        }),
      );
      await Promise.all(notifyPromises);
    }

    await docRef.update(updatePayload);
    return this.findOne(tripId);
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

      const bookedCount = (trip.participants || []).length;
      const reservedFor = (trip as any).reservedFor as string | undefined;
      const isFamilyOrSolo =
        trip.tripCategory === TripCategory.FAMILY_TRIP_WITH_GUIDE ||
        trip.tripCategory === TripCategory.SOLO_TRIP_WITH_GUIDE;

      // Family and solo trips disappear from home once they have any booking.
      if (isFamilyOrSolo && (bookedCount > 0 || reservedFor === 'family' || reservedFor === 'solo')) {
        return false;
      }

      // Stranger trips stay public until they are fully booked.
      if (trip.tripCategory === TripCategory.STRANGERS_TRIP_WITH_GUIDE && trip.maxParticipants && bookedCount >= trip.maxParticipants) {
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

    const organizerRatingCache = new Map<string, number | null>();

    const results = await Promise.all(
      filtered.map(async (trip) => {
        const mainDestNames = (trip.mainDestinations || []).map((d: any) => d.name || d);
        const bookedCount = (trip.participants || []).length;
        const organizerName = await this.resolveOrganizerName(trip.organizer as string | undefined);

        const db = this.firebaseService.getFirestore();
        const reviewsSnapshot = await db
          .collection('reviews')
          .where('tripId', '==', trip.id)
          .get();

        let totalRating = 0;
        let reviewCount = 0;
        reviewsSnapshot.forEach((rDoc) => {
          const rData = rDoc.data() || {};
          if (typeof rData.rating === 'number') {
            totalRating += rData.rating;
            reviewCount++;
          }
        });
        const tripRating = reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : null;

        // Calculate organizer rating using cache
        const organizerId = trip.organizer;
        let organizerRating: number | null = null;
        if (organizerId) {
          if (organizerRatingCache.has(organizerId)) {
            organizerRating = organizerRatingCache.get(organizerId)!;
          } else {
            organizerRating = await this.getOrganizerOverallRating(organizerId);
            organizerRatingCache.set(organizerId, organizerRating);
          }
        }

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
          organizer: trip.organizer,
          rating: tripRating,
          organizerRating,
          status: trip.status,
        } as TripCardDto;
      }),
    );

    return results;
  }

  async getOrganizerOverallRating(organizerId: string): Promise<number | null> {
    const db = this.firebaseService.getFirestore();
    const tripsSnapshot = await db
      .collection(this.collectionName)
      .where('organizer', '==', organizerId)
      .get();

    const tripIds: string[] = [];
    tripsSnapshot.forEach((doc) => {
      const data = doc.data() || {};
      if (data.tripCategory !== 'Private trip') {
        tripIds.push(doc.id);
      }
    });

    if (tripIds.length === 0) {
      return null;
    }

    let totalRating = 0;
    let reviewCount = 0;

    const reviewSnapshots = await Promise.all(
      tripIds.map(async (tripId) => {
        return db.collection('reviews').where('tripId', '==', tripId).get();
      }),
    );

    reviewSnapshots.forEach((snapshot) => {
      snapshot.forEach((rDoc) => {
        const rData = rDoc.data() || {};
        if (typeof rData.rating === 'number') {
          totalRating += rData.rating;
          reviewCount++;
        }
      });
    });

    return reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : null;
  }
}
