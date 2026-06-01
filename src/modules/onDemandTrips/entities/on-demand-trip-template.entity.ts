import { ApiProperty } from '@nestjs/swagger';
import { TripStatus } from '../../trips/entities/trip-status.enum';

export class OnDemandTripTemplate {
  @ApiProperty({ description: 'Template ID', example: 'ondemand_12345', required: false })
  id?: string;

  @ApiProperty({ description: 'Template title', example: '3-Day Cultural Escape' })
  tripName!: string;

  @ApiProperty({ description: 'Template duration label', example: '3 days' })
  durationLabel!: string;

  @ApiProperty({ description: 'Template duration in days', example: 3 })
  durationDays!: number;

  @ApiProperty({ description: 'Trip category shown in the UI', example: 'On-demand trip' })
  tripCategory!: string;

  @ApiProperty({ description: 'Trip description' })
  description!: string;

  @ApiProperty({ description: 'Organizer user ID' })
  organizer!: string;

  @ApiProperty({ description: 'Organizer name', required: false })
  organizerName?: string;

  @ApiProperty({ description: 'Organizer rating', required: false, type: Number })
  organizerRating?: number | null;

  @ApiProperty({ description: 'Trip price per person', example: 1200 })
  price!: number;

  @ApiProperty({ description: 'Trip destinations', type: [Object] })
  destinations!: Array<{
    name: string;
    description: string;
    geoCode: { latitude: number; longitude: number };
    photos: string[];
  }>;

  @ApiProperty({ description: 'Main destinations', required: false, type: [Object] })
  mainDestinations?: Array<{
    name: string;
    lat: number;
    lng: number;
  }>;

  @ApiProperty({ description: 'Start location/address', example: 'Colombo' })
  startLocation!: string;

  @ApiProperty({ description: 'Itinerary data', required: false, type: Object })
  itinerary?: {
    days: Array<{
      day: number;
      title: string;
      activities: Array<{
        title: string;
        timeSlot?: {
          startTime: string;
          endTime: string;
        };
        notes?: string[];
        isAIGenerated?: boolean;
      }>;
    }>;
  };

  @ApiProperty({ description: 'Included services', required: false, type: Object })
  included?: {
    hotelFacilities: string[];
    transportFacilities: string[];
    otherInclusions: string[];
    exclusions: string[];
  };

  @ApiProperty({ description: 'Payment methods', isArray: true, required: false })
  paymentMethods?: string[];

  @ApiProperty({ description: 'Participant capacity', example: 15 })
  maxParticipants!: number;

  @ApiProperty({ description: 'Photo URLs', isArray: true, required: false })
  photos?: string[];

  @ApiProperty({ description: 'Cover image URL', required: false })
  coverImage?: string;

  @ApiProperty({ description: 'Pickup type', required: false })
  pickupType?: string;

  @ApiProperty({ description: 'Pickup cost per km', required: false })
  pickupCostPerKm?: number;

  @ApiProperty({ description: 'Pickup start location', required: false, type: Object })
  pickupStartLocation?: {
    name: string;
    lat: number;
    lng: number;
  };

  @ApiProperty({ description: 'Template visibility', example: true })
  isHidden!: boolean;

  @ApiProperty({ description: 'Moderation status', enum: TripStatus, example: TripStatus.PENDING })
  status!: TripStatus;

  @ApiProperty({ description: 'Created at', required: false })
  createdAt?: Date;

  @ApiProperty({ description: 'Updated at', required: false })
  updatedAt?: Date;
}