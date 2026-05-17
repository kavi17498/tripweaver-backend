import { ApiProperty } from '@nestjs/swagger';
import { TripCore } from './trip-core.entity';
import { TripStatus } from './trip-status.enum';

export class Trip extends TripCore {
  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  id?: string;

  @ApiProperty({
    description: 'Current trip status',
    enum: TripStatus,
    example: TripStatus.DRAFT,
  })
  status!: TripStatus;

  @ApiProperty({
    description: 'Reason for the latest status update',
    required: false,
    example: 'All the details are good and organizer has a good history',
  })
  statusReason?: string;

  @ApiProperty({
    description: 'User ID that last changed the trip status',
    required: false,
    example: 'admin_12345',
  })
  statusUpdatedBy?: string;

  @ApiProperty({
    description: 'Name of the user that last changed the trip status',
    required: false,
    example: 'John Doe',
  })
  statusUpdatedByName?: string;

  @ApiProperty({
    description: 'Timestamp of the latest status update',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  statusUpdatedAt?: Date;

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
