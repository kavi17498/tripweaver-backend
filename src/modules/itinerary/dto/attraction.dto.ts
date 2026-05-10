import { ApiProperty } from '@nestjs/swagger';

export class AttractionDto {
  @ApiProperty({ example: 'Nine Arches Bridge' })
  name!: string;

  @ApiProperty({ example: 6.8765 })
  lat!: number;

  @ApiProperty({ example: 81.0591 })
  lng!: number;

  @ApiProperty({ example: 4.6 })
  rating!: number;

  @ApiProperty({ example: 'Ella' })
  location!: string;
}
