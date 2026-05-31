import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { OnDemandTripsService } from '../onDemandTrips/onDemandTrips.service';
import { OnDemandTripTemplate } from '../onDemandTrips/entities/on-demand-trip-template.entity';
import { TripCardDto } from '../trips/dto/trip-card.dto';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { TripCategory } from '../trips/entities/trip-category.enum';
import { TripsService } from '../trips/trips.service';
import { UsersService } from '../users/users.service';
import { ComprehensiveSearchQueryDto } from './dto/comprehensive-search-query.dto';

export type ComprehensiveSearchResponse = {
  query: string;
  totals: {
    trips: number;
    onDemandTrips: number;
    total: number;
  };
  trips: TripCardDto[];
  onDemandTrips: OnDemandTripTemplate[];
};

@Injectable()
export class SearchService {
  constructor(
    private readonly tripsService: TripsService,
    private readonly onDemandTripsService: OnDemandTripsService,
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private normalizeText(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private isNotExpired(endDate?: string): boolean {
    if (!endDate) return false;

    const parsed = new Date(`${endDate}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime())) return false;

    return parsed.getTime() >= Date.now();
  }

  private matchesQuery(fields: unknown[], query: string): boolean {
    if (!query) return true;

    return fields.some((field) => this.normalizeText(field).includes(query));
  }

  private async resolveOrganizerName(organizerId?: string): Promise<string> {
    if (!organizerId) return '';

    try {
      const user = await this.usersService.findOne(organizerId);
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || organizerId;
    } catch {
      return organizerId;
    }
  }

  private async resolveTripRating(tripId: string): Promise<number | null> {
    const db = this.firebaseService.getFirestore();
    const reviewsSnapshot = await db.collection('reviews').where('tripId', '==', tripId).get();

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnapshot.forEach((doc) => {
      const review = doc.data() || {};
      if (typeof review.rating === 'number') {
        totalRating += review.rating;
        reviewCount += 1;
      }
    });

    if (reviewCount === 0) return null;
    return parseFloat((totalRating / reviewCount).toFixed(1));
  }

  async comprehensiveSearch(query: ComprehensiveSearchQueryDto): Promise<ComprehensiveSearchResponse> {
    const q = this.normalizeText(query.q);
    const tripLimit = query.tripLimit ?? 12;
    const onDemandLimit = query.onDemandLimit ?? 12;

    const approvedTrips = await this.tripsService.findAll(TripStatus.APPROVED);
    const organizerRatingCache = new Map<string, number | null>();

    const filteredTrips = approvedTrips
      .filter((trip) => trip.tripCategory !== TripCategory.PRIVATE_TRIP)
      .filter((trip) => this.isNotExpired(trip.endDate))
      .filter((trip) => {
        const destinationTexts = (trip.mainDestinations || []).map((d: any) =>
          typeof d === 'string' ? d : d?.name || '',
        );

        return this.matchesQuery(
          [
            trip.tripName,
            trip.description,
            trip.startLocation,
            trip.tripCategory,
            ...(trip.destinations || []).map((d: any) => d?.name || ''),
            ...destinationTexts,
          ],
          q,
        );
      })
      .sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')))
      .slice(0, tripLimit);

    const trips: TripCardDto[] = await Promise.all(
      filteredTrips.map(async (trip) => {
        const mainDestNames = (trip.mainDestinations || []).map((d: any) =>
          typeof d === 'string' ? d : d?.name || '',
        );

        const organizerName = await this.resolveOrganizerName(trip.organizer as string | undefined);
        const tripRating = await this.resolveTripRating(String(trip.id));

        const organizerId = String(trip.organizer || '');
        let organizerRating: number | null = null;

        if (organizerId) {
          if (organizerRatingCache.has(organizerId)) {
            organizerRating = organizerRatingCache.get(organizerId) ?? null;
          } else {
            organizerRating = await this.tripsService.getOrganizerOverallRating(organizerId);
            organizerRatingCache.set(organizerId, organizerRating);
          }
        }

        const bookedCount = (trip.participants || []).filter((p: any) => p?.status !== 'rejected').length;

        return {
          id: String(trip.id),
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
          organizerName,
          organizer: trip.organizer,
          rating: tripRating ?? undefined,
          organizerRating,
          status: trip.status,
        };
      }),
    );

    const publicOnDemand = await this.onDemandTripsService.findPublic();
    const onDemandTrips = publicOnDemand
      .filter((trip) =>
        this.matchesQuery(
          [
            trip.tripName,
            trip.description,
            trip.startLocation,
            trip.tripCategory,
            trip.organizerName,
            ...(trip.destinations || []).map((d: any) => d?.name || ''),
            ...(trip.mainDestinations || []).map((d: any) => d?.name || ''),
          ],
          q,
        ),
      )
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, onDemandLimit);

    return {
      query: query.q?.trim() || '',
      totals: {
        trips: trips.length,
        onDemandTrips: onDemandTrips.length,
        total: trips.length + onDemandTrips.length,
      },
      trips,
      onDemandTrips,
    };
  }
}
