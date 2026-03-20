import { ApiProperty } from '@nestjs/swagger';
import { TripCategory } from './trip-category.enum';
import { Destination } from './destination.entity';
import { Itinerary } from './itinerary.entity';
import { Included } from './included.entity';
import { Participant } from './participant.entity';

export class Trip {
  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  id?: string;

  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  tripName: string;

  @ApiProperty({
    description: 'Trip category',
    enum: TripCategory,
    example: TripCategory.FAMILY_TRIP_WITH_GUIDE,
  })
  tripCategory: TripCategory;

  @ApiProperty({
    description: 'Array of destinations',
    type: [Object],
  })
  destinations: Destination[];

  @ApiProperty({ description: 'Start date', example: '2026-04-01' })
  startDate: Date;

  @ApiProperty({ description: 'End date', example: '2026-04-10' })
  endDate: Date;

  @ApiProperty({
    description: 'Start location',
    example: 'Colombo International Airport',
  })
  startLocation: string;

  @ApiProperty({
    description: 'Organizer user ID (who created this trip)',
    example: 'user_12345',
  })
  organizer: string;

  @ApiProperty({ description: 'Trip price per person', example: 1200 })
  price: number;

  @ApiProperty({
    description: 'Itinerary details',
    type: Object,
  })
  itinerary: Itinerary;

  @ApiProperty({
    description: 'What is included in the trip',
    type: Object,
  })
  included: Included;

  @ApiProperty({
    description: 'Trip participants',
    type: [Object],
  })
  participants?: Participant[];

  @ApiProperty({
    description: 'Gallery photos for the trip and destinations',
    type: [String],
    example: [
      'https://example.com/trip-1.jpg',
      'https://example.com/trip-2.jpg',
      'https://example.com/trip-3.jpg',
    ],
    required: false,
  })
  photos?: string[];

  @ApiProperty({
    description: 'Cover image selected from the photos array',
    example: 'https://example.com/trip-cover.jpg',
    required: false,
  })
  coverImage?: string;

  @ApiProperty({
    description: 'Trip description',
    example: 'An amazing trip to explore Sri Lanka',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Maximum participants allowed',
    example: 20,
    required: false,
  })
  maxParticipants?: number;

  @ApiProperty({
    description: 'Trip creation timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Trip last update timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  updatedAt?: Date;
}
