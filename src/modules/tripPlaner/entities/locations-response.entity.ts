import { ApiProperty } from '@nestjs/swagger';

export class LocationDestination {
  @ApiProperty({ description: 'Destination name', example: 'Little Adam\'s Peak' })
  name: string;

  @ApiProperty({ description: 'Latitude', example: 6.8640932 })
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 81.0647229 })
  lng: number;

  @ApiProperty({
    description: 'Image URL (Google Places photo endpoint)',
    example:
      'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=PHOTO_REF&key=API_KEY',
  })
  imageUrl: string | null;

  @ApiProperty({ description: 'Description/address', example: 'Ella, Sri Lanka' })
  description: string | null;
}

export class LocationDestinationsResponse {
  @ApiProperty({ description: 'Location name', example: 'Ella' })
  location: string;

  @ApiProperty({ type: [LocationDestination] })
  destinations: LocationDestination[];
}
