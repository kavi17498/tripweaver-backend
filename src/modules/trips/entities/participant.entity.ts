import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class Participant {
  @ApiProperty({ description: 'Participant name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Participant address', example: '123 Main St, Colombo' })
  @IsNotEmpty()
  @IsString()
  address!: string;

  @ApiProperty({ description: 'Participant phone number', example: '+94701234567' })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiProperty({ description: 'Participant email', example: 'john@example.com' })
  @IsNotEmpty()
  @IsString()
  email!: string;
}
