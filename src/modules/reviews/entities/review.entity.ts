import { ApiProperty } from '@nestjs/swagger';

export class ReviewEntity {
  @ApiProperty({ description: 'Review ID', example: 'review_12345' })
  id?: string;

  @ApiProperty({ description: 'Trip ID being reviewed', example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ description: 'Reviewer user ID', example: 'user_12345' })
  userId!: string;

  @ApiProperty({ description: 'Reviewer display name', example: 'Maya Fernandes' })
  userName!: string;

  @ApiProperty({ description: 'Rating from 1 to 5', example: 5 })
  rating!: number;

  @ApiProperty({ description: 'Review comment', example: 'The trip was well organized and memorable.' })
  comment!: string;

  @ApiProperty({ description: 'Review creation timestamp', example: '2026-05-20T10:30:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Review update timestamp', example: '2026-05-20T10:30:00Z' })
  updatedAt!: Date;
}