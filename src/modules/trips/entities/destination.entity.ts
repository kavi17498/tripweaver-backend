import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GeoCode {
  @ApiProperty({ description: 'Latitude', example: 6.9271 })
  @IsNotEmpty()
  @IsNumber()
  latitude!: number;

  @ApiProperty({ description: 'Longitude', example: 80.7744 })
  @IsNotEmpty()
  @IsNumber()
  longitude!: number;
}

export class Destination {
  @ApiProperty({ description: 'Destination name', example: 'Galle Dutch Fort' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Destination description',
    example: 'Historic fort in southern Sri Lanka',
  })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Geographic coordinates',
    type: GeoCode,
  })
  @ValidateNested()
  @Type(() => GeoCode)
  geoCode!: GeoCode;

  @ApiProperty({
    description: 'Destination photos URLs',
    type: [String],
    example: ['https://example.com/fort1.jpg', 'https://example.com/fort2.jpg'],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  photos!: string[];
}
