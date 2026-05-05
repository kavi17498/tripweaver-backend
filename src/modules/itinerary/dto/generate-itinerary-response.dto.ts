import { ApiProperty } from '@nestjs/swagger';
import { DayItineraryDto } from './day-itinerary.dto';

export class GenerateItineraryResponseDto {
  @ApiProperty({ type: [DayItineraryDto] })
  days!: DayItineraryDto[];
}
