import { ApiProperty } from '@nestjs/swagger';
import { Trip } from '../../trips/entities/trip.entity';
import { ReviewEntity } from './review.entity';

export class OrganizedTripReviewSummaryEntity {
  @ApiProperty({ type: Trip })
  trip!: Trip;

  @ApiProperty({ description: 'Number of participants on the trip', example: 12 })
  participantCount!: number;

  @ApiProperty({ description: 'Number of reviews posted for the trip', example: 4 })
  reviewCount!: number;

  @ApiProperty({ type: [ReviewEntity] })
  reviews!: ReviewEntity[];
}