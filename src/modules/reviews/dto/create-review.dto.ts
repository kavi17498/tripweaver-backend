import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Trip ID being reviewed', example: 'trip_12345' })
  @IsString()
  @MinLength(1)
  tripId!: string;

  @ApiProperty({ description: 'Rating from 1 to 5', example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Review comment', example: 'The trip was well organized and memorable.' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Optional display name fallback for the reviewer',
    example: 'Maya Fernandes',
  })
  @IsOptional()
  @IsString()
  userName?: string;
}