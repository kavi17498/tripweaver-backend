import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovedPublicTripsQueryDto {
  @ApiPropertyOptional({ description: 'Trip category to filter by', example: 'Family Trip with guide' })
  tripCategory?: string;

  @ApiPropertyOptional({ description: 'Trip name to filter by', example: 'Sri Lanka Adventure' })
  tripName?: string;

  @ApiPropertyOptional({ description: 'Organizer ID to filter by', example: 'user_123' })
  organizer?: string;

  @ApiPropertyOptional({ description: 'Start location to filter by', example: 'Colombo' })
  startLocation?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD) to filter by', example: '2026-04-01' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD) to filter by', example: '2026-04-10' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum price to filter by', example: 100 })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price to filter by', example: 2000 })
  maxPrice?: number;
}
