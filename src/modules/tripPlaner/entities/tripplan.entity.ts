import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TripPlanPlace {
    @ApiProperty({ description: 'Place name', example: 'Little Adam\'s Peak' })
    name: string;

    @ApiProperty({ description: 'Latitude', example: 6.8640932 })
    lat: number;

    @ApiProperty({ description: 'Longitude', example: 81.0647229 })
    lng: number;

    @ApiProperty({ description: 'Rating', example: 4.7 })
    rating: number;
}

export class TripPlanLocationPlan {
    @ApiProperty({ description: 'Location name', example: 'Ella' })
    location: string;

    @ApiProperty({ type: [TripPlanPlace] })
    places: TripPlanPlace[];
}

export class TripPlan {
    @ApiPropertyOptional({ description: 'Trip plan id', example: 'tp_123' })
    id?: string;

    @ApiProperty({ description: 'Start date', example: '2026-05-10' })
    startdate: Date;

    @ApiProperty({ description: 'End date', example: '2026-05-15' })
    enddate: Date;

    @ApiProperty({ description: 'Number of days', example: 6 })
    numberOfDays: number;

    @ApiProperty({ description: 'Starting location', example: 'Colombo' })
    startLocation: string;

    @ApiProperty({ type: [String], description: 'Main locations', example: ['Ella', 'Kandy'] })
    mainLocations: string[];

    @ApiProperty({ type: [TripPlanLocationPlan] })
    destinationsByLocation: TripPlanLocationPlan[];

    @ApiPropertyOptional({ description: 'Creation time', example: '2026-05-06T10:00:00.000Z' })
    createdAt?: Date;
}