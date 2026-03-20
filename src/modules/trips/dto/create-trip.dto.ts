import { IsNotEmpty, IsString, IsEnum, IsArray, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripCategory } from '../entities/trip-category.enum';
import { Destination } from '../entities/destination.entity';
import { Itinerary } from '../entities/itinerary.entity';
import { Included } from '../entities/included.entity';
import { Participant } from '../entities/participant.entity';

export class CreateTripDto {
  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  @IsNotEmpty()
  @IsString()
  tripName: string;

  @ApiProperty({
    description: 'Trip category',
    enum: TripCategory,
    example: TripCategory.FAMILY_TRIP_WITH_GUIDE,
  })
  @IsNotEmpty()
  @IsEnum(TripCategory)
  tripCategory: TripCategory;

  @ApiProperty({
    description: 'Array of destinations',
    type: [Object],
  })
  @IsNotEmpty()
  @IsArray()
  destinations: Destination[];

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-04-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-04-10' })
  @IsNotEmpty()
  @IsDateString()
  endDate: Date;

  @ApiProperty({
    description: 'Start location',
    example: 'Colombo International Airport',
  })
  @IsNotEmpty()
  @IsString()
  startLocation: string;

  @ApiProperty({
    description: 'Organizer user ID (who created this trip)',
    example: 'user_12345',
  })
  @IsNotEmpty()
  @IsString()
  organizer: string;

  @ApiProperty({ description: 'Trip price per person', example: 1200 })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Itinerary details',
    type: Object,
  })
  @IsNotEmpty()
  itinerary: Itinerary;

  @ApiProperty({
    description: 'What is included in the trip',
    type: Object,
  })
  @IsNotEmpty()
  included: Included;

  @ApiPropertyOptional({
    description: 'Trip participants',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  participants?: Participant[];

  @ApiPropertyOptional({
    description: 'Gallery photos for the trip and destinations',
    type: [String],
    example: [
      'https://example.com/trip-1.jpg',
      'https://example.com/trip-2.jpg',
      'https://example.com/trip-3.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Cover image selected from the photos array',
    example: 'https://example.com/trip-cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    example: 'An amazing trip to explore Sri Lanka',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum participants allowed',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}
