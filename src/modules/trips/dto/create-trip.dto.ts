import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TripCore } from '../entities/trip-core.entity';
import { TripStatus } from '../entities/trip-status.enum';

export class CreateTripDto extends TripCore {
  @ApiPropertyOptional({
    description:
      'Initial trip status - users can create as DRAFT or PENDING. Defaults to DRAFT if not provided.',
    enum: [TripStatus.DRAFT, TripStatus.PENDING],
    example: TripStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}
