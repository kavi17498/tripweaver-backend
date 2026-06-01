import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantPickupLocation, Participant } from '../../trips/entities/participant.entity';

export class BookOnDemandTripDto {
  @ApiProperty({ description: 'Selected booking start date', example: '2026-06-12' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Requested pickup or meetup time', example: '08:30' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ description: 'Optional user note for the guide', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Optional pickup location details', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParticipantPickupLocation)
  pickupLocation?: ParticipantPickupLocation;

  @ApiProperty({ description: 'Optional pickup distance in kilometers', required: false })
  @IsOptional()
  @IsNumber()
  pickupDistanceKm?: number;

  @ApiProperty({ description: 'Optional pickup cost', required: false })
  @IsOptional()
  @IsNumber()
  pickupCost?: number;

  @ApiProperty({ description: 'Optional list of participants', type: [Participant], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Participant)
  participants?: Participant[];
}