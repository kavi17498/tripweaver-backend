import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../trips/entities/trip-status.enum';

class OnDemandDestinationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @ValidateNested()
  geoCode!: { latitude: number; longitude: number };

  @ApiProperty({ isArray: true })
  @IsArray()
  photos!: string[];
}

export class CreateOnDemandTripDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tripName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  durationLabel!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationDays!: number;

  @ApiPropertyOptional({ default: 'On-demand trip' })
  @IsOptional()
  @IsString()
  tripCategory?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizer!: string;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiProperty({ type: [OnDemandDestinationDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OnDemandDestinationDto)
  destinations!: OnDemandDestinationDto[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  mainDestinations?: Array<{ name: string; lat: number; lng: number }>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startLocation!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  itinerary?: {
    days: Array<{
      day: number;
      title: string;
      activities: Array<{
        title: string;
        timeSlot?: { startTime: string; endTime: string };
        notes?: string[];
        isAIGenerated?: boolean;
      }>;
    }>;
  };

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  included?: {
    hotelFacilities: string[];
    transportFacilities: string[];
    otherInclusions: string[];
    exclusions: string[];
  };

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  paymentMethods?: string[];

  @ApiProperty()
  @IsNumber()
  maxParticipants!: number;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pickupType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pickupCostPerKm?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  pickupStartLocation?: {
    name: string;
    lat: number;
    lng: number;
  };

  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}