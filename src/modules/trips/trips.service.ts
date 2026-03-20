import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { Trip } from './entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  private readonly collectionName = 'trips';

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Create a new trip
   */
  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const db = this.firebaseService.getFirestore();

    // Validate date range
    const startDate = new Date(createTripDto.startDate);
    const endDate = new Date(createTripDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const photos = createTripDto.photos ?? [];
    const coverImage = createTripDto.coverImage ?? photos[0];

    const newTrip: Trip = {
      ...createTripDto,
      photos,
      coverImage,
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
  async findAll(): Promise<Trip[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();

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
   */
  async update(id: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    const db = this.firebaseService.getFirestore();

    // Check if trip exists
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    // Validate date range if dates are being updated
    if (updateTripDto.startDate && updateTripDto.endDate) {
      const startDate = new Date(updateTripDto.startDate);
      const endDate = new Date(updateTripDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
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
  async addParticipant(
    tripId: string,
    participant: any,
  ): Promise<Trip> {
    const db = this.firebaseService.getFirestore();

    const trip = await this.findOne(tripId);

    if (!trip.participants) {
      trip.participants = [];
    }

    trip.participants.push(participant);

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
}
