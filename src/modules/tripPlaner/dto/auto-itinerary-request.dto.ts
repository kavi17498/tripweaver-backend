import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AutoItineraryGeoCodeDto {
  @ApiProperty({ description: 'Latitude', example: 6.9271 })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 79.8612 })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class AutoItineraryDestinationDto {
  @ApiProperty({ description: 'Destination name', example: 'Galle Fort' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Destination description', example: 'Historic coastal fort' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ type: AutoItineraryGeoCodeDto })
  @ValidateNested()
  @Type(() => AutoItineraryGeoCodeDto)
  geoCode: AutoItineraryGeoCodeDto;
}

export class AutoItineraryIncludedDto {
  @ApiProperty({
    description: 'Hotel facilities',
    type: [String],
    example: ['3-star hotel', 'WiFi'],
  })
  @IsArray()
  @IsString({ each: true })
  hotelFacilities: string[];

  @ApiProperty({
    description: 'Transport facilities',
    type: [String],
    example: ['Airport pickup', 'AC vehicle'],
  })
  @IsArray()
  @IsString({ each: true })
  transportFacilities: string[];

  @ApiProperty({
    description: 'Other inclusions',
    type: [String],
    example: ['Breakfast', 'Guided tours'],
  })
  @IsArray()
  @IsString({ each: true })
  otherInclusions: string[];

  @ApiProperty({
    description: 'Exclusions',
    type: [String],
    example: ['Visa fees', 'Personal expenses'],
  })
  @IsArray()
  @IsString({ each: true })
  exclusions: string[];
}

export class AutoItineraryRequestDto {
  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  @IsNotEmpty()
  @IsString()
  tripName: string;

  @ApiProperty({ description: 'Trip category', example: 'Family Trip with Guide' })
  @IsNotEmpty()
  @IsString()
  tripCategory: string;

  @ApiProperty({ type: [AutoItineraryDestinationDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoItineraryDestinationDto)
  destinations: AutoItineraryDestinationDto[];

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-05-10' })
  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-05-15' })
  @IsNotEmpty()
  @IsDateString()
  endDate: Date;

  @ApiProperty({ description: 'Start time (HH:MM AM/PM)', example: '08:00 AM' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM AM/PM)', example: '06:00 PM' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Start location', example: 'Colombo' })
  @IsNotEmpty()
  @IsString()
  startLocation: string;

  @ApiProperty({ type: AutoItineraryIncludedDto })
  @ValidateNested()
  @Type(() => AutoItineraryIncludedDto)
  included: AutoItineraryIncludedDto;

  @ApiProperty({ description: 'Max participants', example: 20 })
  @IsNotEmpty()
  @IsNumber()
  maxParticipants: number;
}
