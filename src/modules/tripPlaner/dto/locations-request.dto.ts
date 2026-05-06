import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class LocationsRequestDto {
  @ApiProperty({
    description: 'List of locations to fetch destinations for',
    type: [String],
    example: ['Ella', 'Kandy'],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  locations: string[];
}
