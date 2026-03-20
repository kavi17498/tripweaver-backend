import { ApiProperty } from '@nestjs/swagger';

export class Participant {
  @ApiProperty({ description: 'Participant name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'Participant address', example: '123 Main St, City' })
  address: string;

  @ApiProperty({ description: 'Participant phone number', example: '+1234567890' })
  phone: string;

  @ApiProperty({ description: 'Participant email', example: 'john@example.com' })
  email: string;
}
