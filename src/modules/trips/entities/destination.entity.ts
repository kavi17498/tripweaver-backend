import { ApiProperty } from '@nestjs/swagger';

export class GeoCode {
  @ApiProperty({ description: 'Latitude coordinate', example: 6.9271 })
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 80.7789 })
  longitude: number;
}

export class Destination {
  @ApiProperty({ description: 'Destination name', example: 'Galle Fort' })
  name: string;

  @ApiProperty({ description: 'Destination description', example: 'A historic fort...' })
  description?: string;

  @ApiProperty({ type: GeoCode, description: 'Geographic coordinates' })
  geoCode: GeoCode;

  @ApiProperty({
    description: 'Photos of the destination',
    type: [String],
    example: [
      'https://example.com/galle-1.jpg',
      'https://example.com/galle-2.jpg',
    ],
  })
  photos?: string[];
}
