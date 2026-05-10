import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TimeSlot {
  @ApiProperty({ description: 'Start time (12-hour format)', example: '08:00 AM' })
  @IsNotEmpty()
  @IsString()
  startTime!: string;

  @ApiProperty({ description: 'End time (12-hour format)', example: '06:00 PM' })
  @IsNotEmpty()
  @IsString()
  endTime!: string;
}

export class ItineraryDay {
  @ApiProperty({ description: 'Day number', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  day!: number;

  @ApiProperty({ description: 'Day title', example: 'Day 1' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Time slot for the day',
    type: TimeSlot,
  })
  @ValidateNested()
  @Type(() => TimeSlot)
  timeSlot!: TimeSlot;

  @ApiProperty({
    description: 'Activities for the day',
    type: [String],
    example: [
      'Travel to Galle by Train (05:17 AM - 08:00 AM): Depart from Moratuwa',
      'Hotel Check-in (08:00 AM - 08:30 AM): Freshen up',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  activities!: string[];
}

export class Itinerary {
  @ApiProperty({
    description: 'Daily itinerary',
    type: [ItineraryDay],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDay)
  days!: ItineraryDay[];
}
