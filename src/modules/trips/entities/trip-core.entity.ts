import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TripCategory } from './trip-category.enum';
import { Destination } from './destination.entity';
import { Included } from './included.entity';
import { Itinerary } from './itinerary.entity';
import { Participant } from './participant.entity';

export enum TripPaymentMethod {
  PAY_ONLINE = 'Pay Online',
  PAY_TO_GUIDE_ON_TRIP_DAY = 'Pay to Guide on Trip Day',
}

export class MainDestination {
  @ApiProperty({ description: 'Main destination name', example: 'Galle Fort' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Latitude', example: 6.026 })
  @IsNotEmpty()
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'Longitude', example: 80.217 })
  @IsNotEmpty()
  @IsNumber()
  lng!: number;
}

export class TripCore {
  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  @IsNotEmpty()
  @IsString()
  tripName!: string;

  @ApiProperty({
    description: 'Trip category',
    enum: TripCategory,
    example: TripCategory.SOLO_TRIP_WITH_GUIDE,
  })
  @IsNotEmpty()
  @IsEnum(TripCategory)
  tripCategory!: TripCategory;

  @ApiProperty({
    description: 'Array of destinations with geo-coordinates',
    type: [Destination],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Destination)
  destinations!: Destination[];

  @ApiProperty({
    description: 'Main destinations for the trip',
    type: [MainDestination],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MainDestination)
  mainDestinations!: MainDestination[];

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD format)',
    example: '2026-04-01',
    type: String,
  })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD format)',
    example: '2026-04-10',
    type: String,
  })
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    description: 'Start time (HH:mm format, 24-hour)',
    example: '08:30',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  startTime!: string;

  @ApiProperty({
    description: 'End time (HH:mm format, 24-hour)',
    example: '18:00',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({
    description: 'Start location/address',
    example: 'Colombo International Airport',
  })
  @IsNotEmpty()
  @IsString()
  startLocation!: string;

  @ApiProperty({
    description: 'Organizer user ID',
    example: 'user_12345',
  })
  @IsNotEmpty()
  @IsString()
  organizer!: string;

  @ApiProperty({ description: 'Trip price per person', example: 1200 })
  @IsNotEmpty()
  @IsNumber()
  price!: number;

  @ApiProperty({
    description: 'Complete itinerary with daily activities',
    type: Itinerary,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Itinerary)
  itinerary!: Itinerary;

  @ApiProperty({
    description: 'Included facilities and exclusions',
    type: Included,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Included)
  included!: Included;

  @ApiProperty({
    description: 'Accepted payment methods for the trip',
    enum: TripPaymentMethod,
    isArray: true,
    example: [TripPaymentMethod.PAY_ONLINE, TripPaymentMethod.PAY_TO_GUIDE_ON_TRIP_DAY],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TripPaymentMethod, { each: true })
  paymentMethods!: TripPaymentMethod[];

  @ApiProperty({
    description: 'Trip participants',
    type: [Participant],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Participant)
  participants?: Participant[];

  @ApiProperty({
    description: 'Trip photos URLs',
    type: [String],
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({
    description: 'Cover image URL (from photos array)',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({
    description: 'Trip description',
    example: 'Explore Sri Lanka beaches and mountains',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Maximum participants allowed',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}