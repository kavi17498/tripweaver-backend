import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewEntity } from './review.entity';

export class TripReviewSummaryEntity {
  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  tripName!: string;

  @ApiProperty({ description: 'Trip destination', example: 'Galle' })
  destination!: string;

  @ApiProperty({ description: 'Trip start date', example: '2026-05-10' })
  startDate!: string;

  @ApiProperty({ description: 'Trip end date', example: '2026-05-16' })
  endDate!: string;

  @ApiProperty({ description: 'Trip start time', example: '08:00' })
  startTime!: string;

  @ApiPropertyOptional({ description: 'Trip end time', example: '18:00' })
  endTime?: string;

  @ApiProperty({ description: 'Current participant name', example: 'Maya Fernandes' })
  participantName!: string;

  @ApiPropertyOptional({ description: 'Current participant email', example: 'maya@example.com' })
  participantEmail?: string;

  @ApiPropertyOptional({ description: 'Current participant record identifier', example: 'participant_12345' })
  participantId?: string;

  @ApiProperty({ description: 'Number of participant records in this booking', example: 2 })
  bookingSeatCount!: number;

  @ApiProperty({ description: 'Number of participants on the trip', example: 12 })
  participantCount!: number;

  @ApiProperty({ description: 'Trip ended flag', example: true })
  tripEnded!: boolean;

  @ApiProperty({ description: 'Whether the participant can submit a review', example: true })
  canReview!: boolean;

  @ApiProperty({ description: 'Whether a reminder notification exists or was created', example: true })
  reminderSent!: boolean;

  @ApiProperty({ type: [ReviewEntity] })
  reviews!: ReviewEntity[];

  @ApiPropertyOptional({ type: ReviewEntity, nullable: true })
  myReview?: ReviewEntity | null;
}