import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { TripCategory } from '../trips/entities/trip-category.enum';
import { CreateOnDemandTripDto } from './dto/create-on-demand-trip.dto';
import { UpdateOnDemandTripDto } from './dto/update-on-demand-trip.dto';
import { BookOnDemandTripDto } from './dto/book-on-demand-trip.dto';
import { OnDemandTripTemplate } from './entities/on-demand-trip-template.entity';

type AuthRole = 'traveler' | 'organizer' | 'admin' | 'superadmin' | 'guide' | string | undefined;

@Injectable()
export class OnDemandTripsService {
  private readonly collectionName = 'onDemandTrips';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly tripsService: TripsService,
  ) {}

  private async resolveOrganizerName(organizerId?: string): Promise<string> {
    if (!organizerId) return '';

    try {
      const user = await this.usersService.findOne(organizerId);
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || organizerId;
    } catch {
      return organizerId;
    }
  }

  private async resolveOrganizerRating(organizerId?: string): Promise<number | null> {
    if (!organizerId) return null;

    try {
      return await this.tripsService.getOrganizerOverallRating(organizerId);
    } catch {
      return null;
    }
  }

  private canCreate(role?: AuthRole) {
    return role === 'guide' || role === 'admin' || role === 'superadmin';
  }

  private normalizeTemplate(data: Record<string, any>, id?: string): OnDemandTripTemplate {
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

  async create(dto: CreateOnDemandTripDto, role?: AuthRole): Promise<OnDemandTripTemplate> {
    if (!this.canCreate(role)) {
      throw new BadRequestException('Only verified guide, admin, and superadmin users can create on-demand trips.');
    }

    const db = this.firebaseService.getFirestore();
    const now = new Date();
    const initialStatus = dto.status ?? TripStatus.PENDING;

    const template: OnDemandTripTemplate = {
      ...dto,
      tripCategory: dto.tripCategory ?? 'On-demand trip',
      photos: dto.photos ?? [],
      coverImage: dto.coverImage ?? dto.photos?.[0] ?? '',
      isHidden: false,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.collectionName).add(template);
    const result = this.normalizeTemplate(template as Record<string, any>, docRef.id);
    result.organizerName = await this.resolveOrganizerName(result.organizer);
    result.organizerRating = await this.resolveOrganizerRating(result.organizer);
    return result;
  }

  async findOne(id: string): Promise<OnDemandTripTemplate> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`On-demand trip template with ID ${id} not found`);
    }

    const result = this.normalizeTemplate(doc.data() || {}, doc.id);
    result.organizerName = await this.resolveOrganizerName(result.organizer);
    result.organizerRating = await this.resolveOrganizerRating(result.organizer);
    return result;
  }

  async findByOrganizer(organizerId: string): Promise<OnDemandTripTemplate[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).where('organizer', '==', organizerId).get();
    const templates: OnDemandTripTemplate[] = [];
    for (const doc of snapshot.docs) {
      const template = this.normalizeTemplate(doc.data() || {}, doc.id);
      template.organizerName = await this.resolveOrganizerName(template.organizer);
      template.organizerRating = await this.resolveOrganizerRating(template.organizer);
      templates.push(template);
    }
    return templates;
  }

  async findPublic(organizerId?: string): Promise<OnDemandTripTemplate[]> {
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection(this.collectionName).where('status', '==', TripStatus.APPROVED).where('isHidden', '==', false);
    if (organizerId) {
      query = query.where('organizer', '==', organizerId);
    }

    const snapshot = await query.get();
    const templates: OnDemandTripTemplate[] = [];
    for (const doc of snapshot.docs) {
      const template = this.normalizeTemplate(doc.data() || {}, doc.id);
      template.organizerName = await this.resolveOrganizerName(template.organizer);
      template.organizerRating = await this.resolveOrganizerRating(template.organizer);
      templates.push(template);
    }
    return templates;
  }

  async update(id: string, dto: UpdateOnDemandTripDto, role?: AuthRole): Promise<OnDemandTripTemplate> {
    const current = await this.findOne(id);
    if (!this.canCreate(role) && role !== 'admin' && role !== 'superadmin') {
      throw new BadRequestException('You do not have permission to update this template.');
    }

    const db = this.firebaseService.getFirestore();
    const nextData = {
      ...current,
      ...dto,
      coverImage: dto.coverImage ?? (dto.photos && dto.photos.length > 0 ? dto.photos[0] : current.coverImage),
      updatedAt: new Date(),
    };
    delete (nextData as any).organizerName;
    delete (nextData as any).organizerRating;

    await db.collection(this.collectionName).doc(id).update(nextData);
    return this.findOne(id);
  }

  async toggleVisibility(id: string, isHidden: boolean): Promise<OnDemandTripTemplate> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).doc(id).update({ isHidden, updatedAt: new Date() });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`On-demand trip template with ID ${id} not found`);
    }

    await db.collection(this.collectionName).doc(id).delete();
  }

  async getAvailability(templateId: string): Promise<{ busyDates: string[]; busyRanges: Array<{ startDate: string; endDate: string }> }> {
    const template = await this.findOne(templateId);
    const organizerTrips = await this.tripsService.findByOrganizer(template.organizer);
    const busyRanges = organizerTrips
      .filter((trip) => trip.status === TripStatus.APPROVED || trip.status === TripStatus.PENDING || trip.status === TripStatus.IN_REVIEW)
      .filter((trip) => Boolean(trip.startDate && trip.endDate))
      .map((trip) => ({ startDate: trip.startDate, endDate: trip.endDate }));

    const busyDates = new Set<string>();
    busyRanges.forEach((range) => {
      const start = new Date(`${range.startDate}T00:00:00`);
      const end = new Date(`${range.endDate}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const cursor = new Date(start);
      while (cursor <= end) {
        busyDates.add(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return { busyDates: Array.from(busyDates).sort(), busyRanges };
  }

  private removeUndefined(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeUndefined(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, this.removeUndefined(v)])
      );
    }
    return obj;
  }

  async book(templateId: string, dto: BookOnDemandTripDto, userId: string, userRole?: AuthRole): Promise<{ tripId: string }> {
    const template = await this.findOne(templateId);
    if (template.status !== TripStatus.APPROVED || template.isHidden) {
      throw new BadRequestException('This on-demand trip is not currently available for booking.');
    }

    const startDate = new Date(`${dto.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid booking date.');
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(1, template.durationDays) - 1);

    const user = await this.usersService.findOne(userId);
    const participantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Primary Participant';
    
    let age = 25;
    if (user.dateOfBirth) {
      const dob = new Date(user.dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--;
      }
      age = Math.max(0, calculatedAge);
    }

    const participant = {
      participantId: `part_${randomUUID()}`,
      parentUserId: userId,
      name: participantName,
      gender: user.gender || 'male',
      age,
      email: user.email || '',
      phone: user.phone || '',
      status: 'accepted',
      pickupLocation: dto.pickupLocation,
      pickupDistanceKm: dto.pickupDistanceKm,
      pickupCost: dto.pickupCost,
      pickupTime: dto.startTime,
    };

    let tripParticipants: any[] = [];
    if (dto.participants && dto.participants.length > 0) {
      tripParticipants = dto.participants.map((p, idx) => ({
        ...p,
        participantId: p.participantId || `part_${randomUUID()}`,
        parentUserId: idx === 0 ? userId : (p.parentUserId || null),
        status: 'accepted',
      }));
    } else {
      tripParticipants = [];
    }

    const dateObj = new Date(`${dto.startDate}T00:00:00`);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    const customTripName = `${formattedDate} ${template.tripName} with ${participantName}`;

    const rawPayload = {
      tripName: customTripName,
      tripCategory: TripCategory.PRIVATE_TRIP,
      paymentMethods: (template.paymentMethods as any) ?? ['Pay Online', 'Pay to Guide on Trip Day'],
      destinations: template.destinations as any,
      mainDestinations: template.mainDestinations,
      startDate: dto.startDate,
      endDate: endDate.toISOString().slice(0, 10),
      startTime: dto.startTime,
      endTime: '23:59',
      startLocation: template.startLocation,
      organizer: template.organizer,
      price: template.price,
      itinerary: template.itinerary as any,
      included: template.included as any,
      participants: tripParticipants,
      photos: template.photos ?? [],
      coverImage: template.coverImage ?? template.photos?.[0] ?? '',
      description: template.description,
      maxParticipants: template.maxParticipants,
      pickupType: template.pickupType as any,
      pickupCostPerKm: template.pickupCostPerKm,
      pickupStartLocation: template.pickupStartLocation as any,
    };

    const cleanPayload = this.removeUndefined(rawPayload);

    const trip = await this.tripsService.create(
      cleanPayload as any,
      'guide',
    );

    await this.tripsService.update(trip.id as string, { status: TripStatus.APPROVED } as any, 'admin');
    return { tripId: trip.id as string };
  }
}