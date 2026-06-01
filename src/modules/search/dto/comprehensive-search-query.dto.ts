import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ComprehensiveSearchQueryDto {
  @ApiPropertyOptional({ description: 'Free text search query', example: 'Ella' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Max number of regular trips to return', example: 12, default: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  tripLimit?: number;

  @ApiPropertyOptional({ description: 'Max number of on-demand trips to return', example: 12, default: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  onDemandLimit?: number;
}
