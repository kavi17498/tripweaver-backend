import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelTripDto {
  @ApiProperty({
    description: 'Reason for canceling the trip',
    example: 'Severe weather and route closures make the trip unsafe.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason!: string;
}