import { ApiProperty } from '@nestjs/swagger';
import { PlaceDto } from './place.dto';

export class DayItineraryDto {
  @ApiProperty({ example: 1 })
  day!: number;

  @ApiProperty({ example: 'Ella' })
  location!: string;

  @ApiProperty({ type: [PlaceDto] })
  places!: PlaceDto[];
}
