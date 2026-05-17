import { ApiProperty } from '@nestjs/swagger';
import { TripStatus } from './trip-status.enum';

export class TripStatusChangeLogs {
  @ApiProperty({ description: 'Log ID', example: 'log_12345' })
  id?: string;

  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ description: 'Organizer user ID', example: 'user_12345' })
  organizerId!: string;

  @ApiProperty({ description: 'Organizer full name', example: 'John Doe' })
  organizerName!: string;

  @ApiProperty({ description: 'Admin user ID who changed the status', example: 'admin_12345' })
  userId!: string;

  @ApiProperty({ description: 'Admin full name who changed the status', example: 'Jane Smith' })
  userName!: string;

  @ApiProperty({ description: 'Updated trip status', enum: TripStatus, example: TripStatus.APPROVED })
  status!: TripStatus;

  @ApiProperty({
    description: 'Reason for the status change',
    example: 'All the details are good and organizer has a good history',
  })
  reason!: string;

  @ApiProperty({
    description: 'Status change timestamp',
    example: '2026-03-20T10:30:00Z',
  })
  updatedAt!: Date;
}