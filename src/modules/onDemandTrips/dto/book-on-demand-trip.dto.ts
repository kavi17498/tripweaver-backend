import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}