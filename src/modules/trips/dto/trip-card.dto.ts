import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TripCardDto {
  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  id!: string;

  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  tripName!: string;

  @ApiProperty({ description: 'Cover image URL', example: 'https://example.com/cover.jpg' })
  coverImage!: string;

  @ApiProperty({ description: 'Trip category', example: 'Family Trip with guide' })
  tripCategory!: string;

  @ApiProperty({ description: 'Price per person', example: 1200 })
  price!: number;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-04-01' })
  startDate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-04-10' })
  endDate!: string;

  @ApiProperty({ description: 'Start location/address', example: 'Colombo International Airport' })
  startLocation!: string;

  @ApiProperty({ description: 'Main destination names', type: [String], example: ['Galle Fort'] })
  mainDestinations!: string[];

  @ApiProperty({ description: 'Maximum participants allowed', example: 20 })
  maxParticipants!: number;

  @ApiProperty({ description: 'Number of booked participants', example: 4 })
  bookedCount!: number;

  @ApiProperty({ description: 'Organizer display name', example: 'John Doe' })
  organizerName!: string;

  @ApiProperty({ description: 'Organizer user ID', example: 'user_12345' })
  organizer!: string;

  @ApiPropertyOptional({ description: 'Average rating', example: 4.5 })
  rating?: number;

  @ApiPropertyOptional({ description: 'Organizer overall profile rating', example: 4.8 })
  organizerRating?: number | null;

  @ApiProperty({ description: 'Trip status', example: 'approved' })
  status!: string;
}
