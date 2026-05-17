import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TripCore } from '../entities/trip-core.entity';
import { TripStatus } from '../entities/trip-status.enum';

export class UpdateTripDto extends PartialType(TripCore) {
	@ApiPropertyOptional({
		description: 'Current trip status',
		enum: TripStatus,
	})
	@IsOptional()
	@IsEnum(TripStatus)
	status?: TripStatus;
}
