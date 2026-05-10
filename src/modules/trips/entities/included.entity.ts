import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class Included {
  @ApiProperty({
    description: 'Hotel/accommodation facilities',
    type: [String],
    example: ['Pitza Hotel', 'Beachside Resort'],
  })
  @IsArray()
  @IsString({ each: true })
  hotelFacilities!: string[];

  @ApiProperty({
    description: 'Transport facilities',
    type: [String],
    example: ['Train', 'Bus'],
  })
  @IsArray()
  @IsString({ each: true })
  transportFacilities!: string[];

  @ApiProperty({
    description: 'Other inclusions',
    type: [String],
    example: ['Breakfast', 'Guide service', 'Insurance'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherInclusions?: string[];

  @ApiProperty({
    description: 'Exclusions',
    type: [String],
    example: ['Flights', 'Personal expenses'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];
}
