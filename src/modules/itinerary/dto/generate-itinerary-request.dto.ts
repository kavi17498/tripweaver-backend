import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsISO8601, IsString, MinLength } from 'class-validator';

export class GenerateItineraryRequestDto {
  @ApiProperty({ example: '2026-05-04' })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({ example: '2026-05-08' })
  @IsISO8601()
  endDate!: string;

  @ApiProperty({ example: 'Colombo' })
  @IsString()
  @MinLength(2)
  startLocation!: string;

  @ApiProperty({ example: ['Ella', 'Kandy'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mainLocations!: string[];
}
