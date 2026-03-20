import { ApiProperty } from '@nestjs/swagger';

export class TimeSlot {
  @ApiProperty({ description: 'Start time', example: '08:00 AM' })
  startTime: string;

  @ApiProperty({ description: 'End time', example: '10:00 AM' })
  endTime: string;
}

export class ItineraryDay {
  @ApiProperty({ description: 'Day number', example: 1 })
  day: number;

  @ApiProperty({ type: TimeSlot, description: 'Time slot for activities' })
  timeSlot: TimeSlot;

  @ApiProperty({
    description: 'Activities for the day',
    type: [String],
    example: [
      'Arrival and check-in',
      'Welcome dinner with southern cuisine tasting',
    ],
  })
  activities: string[];

  @ApiProperty({ description: 'Title for the day', example: 'Arrival and Check-in' })
  title: string;
}

export class Itinerary {
  @ApiProperty({
    description: 'Daily itinerary details',
    type: [ItineraryDay],
  })
  days: ItineraryDay[];
}
