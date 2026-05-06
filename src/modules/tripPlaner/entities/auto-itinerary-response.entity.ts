import { ApiProperty } from '@nestjs/swagger';

export class AutoItineraryActivity {
  @ApiProperty({ description: 'Start time', example: '08:00 AM' })
  startTime: string;

  @ApiProperty({ description: 'End time', example: '10:00 AM' })
  endTime: string;

  @ApiProperty({ description: 'Activity title', example: 'Visit Galle Fort' })
  activity: string;

  @ApiProperty({ description: 'Location name', example: 'Galle Fort' })
  location: string;

  @ApiProperty({ description: 'Activity description', example: 'Walk along the ramparts' })
  description: string;
}

export class AutoItineraryDay {
  @ApiProperty({ description: 'Day number', example: 1 })
  day: number;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2026-05-10' })
  date: string;

  @ApiProperty({ description: 'Primary location for the day', example: 'Galle' })
  location: string;

  @ApiProperty({ type: [AutoItineraryActivity] })
  activities: AutoItineraryActivity[];
}

export class AutoItineraryResponse {
  @ApiProperty({ description: 'Trip name', example: 'Sri Lanka Adventure' })
  tripName: string;

  @ApiProperty({ type: [AutoItineraryDay] })
  days: AutoItineraryDay[];
}
