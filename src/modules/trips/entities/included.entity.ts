import { ApiProperty } from '@nestjs/swagger';

export class Included {
  @ApiProperty({
    description: 'Hotel facilities included',
    type: [String],
    example: ['3-star hotel', 'Air conditioning', 'WiFi'],
    required: false,
  })
  hotelFacilities?: string[];

  @ApiProperty({
    description: 'Transport facilities included',
    type: [String],
    example: ['Air-conditioned coach', 'Airport transfers', 'Daily transport'],
    required: false,
  })
  transportFacilities?: string[];

  @ApiProperty({
    description: 'Other inclusions',
    type: [String],
    example: ['Breakfast', 'Guided tours', 'Entrance fees'],
    required: false,
  })
  otherInclusions?: string[];

  @ApiProperty({
    description: 'Exclusions',
    type: [String],
    example: ['Visa fees', 'Personal expenses', 'Meals not mentioned'],
    required: false,
  })
  exclusions?: string[];
}
