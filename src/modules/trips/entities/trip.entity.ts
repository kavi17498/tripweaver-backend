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
