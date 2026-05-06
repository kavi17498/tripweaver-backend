import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTripPlanRequestDto {
    @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-05-10' })
    @IsNotEmpty()
    @IsDateString()
    startdate!: Date;

    @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-05-15' })
    @IsNotEmpty()
    @IsDateString()
    enddate!: Date;

    @ApiProperty({ description: 'Starting location', example: 'Colombo' })
    @IsNotEmpty()
    @IsString()
    startLocation!: string;

    @ApiProperty({
        description: 'Main locations to visit',
        type: [String],
        example: ['Ella', 'Kandy'],
    })
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    mainLocations!: string[];
}