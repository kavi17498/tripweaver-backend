import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TripStatus } from '../../trips/entities/trip-status.enum';

export class UpdateTripStatusDto {
  @ApiProperty({
    description: 'New trip status',
    enum: TripStatus,
    example: TripStatus.APPROVED,
  })
  @IsNotEmpty()
  @IsEnum(TripStatus)
  status!: TripStatus;

  @ApiProperty({
    description: 'Reason for the status change',
    example: 'All the details are good and organizer has a good history',
  })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}