import { IsOptional, IsString, IsEnum, IsArray, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripCategory } from '../entities/trip-category.enum';
import { Destination } from '../entities/destination.entity';
import { Itinerary } from '../entities/itinerary.entity';
import { Included } from '../entities/included.entity';
import { Participant } from '../entities/participant.entity';

export class UpdateTripDto {
  @ApiPropertyOptional({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  @IsOptional()
  @IsString()
  tripName?: string;

  @ApiPropertyOptional({
    description: 'Trip category',
    enum: TripCategory,
  })
  @IsOptional()
  @IsEnum(TripCategory)
  tripCategory?: TripCategory;

  @ApiPropertyOptional({
    description: 'Array of destinations',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  destinations?: Destination[];

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Start location',
    example: 'Colombo International Airport',
  })
  @IsOptional()
  @IsString()
  startLocation?: string;

  @ApiPropertyOptional({ description: 'Trip price per person', example: 1200 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    description: 'Itinerary details',
    type: Object,
  })
  @IsOptional()
  itinerary?: Itinerary;

  @ApiPropertyOptional({
    description: 'What is included in the trip',
    type: Object,
  })
  @IsOptional()
  included?: Included;

  @ApiPropertyOptional({
    description: 'Trip participants',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  participants?: Participant[];

  @ApiPropertyOptional({
    description: 'Trip description',
    example: 'An amazing trip to explore Sri Lanka',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Cover photo URL',
    example: 'https://example.com/trip-cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverPhoto?: string;

  @ApiPropertyOptional({
    description: 'Maximum participants allowed',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}
