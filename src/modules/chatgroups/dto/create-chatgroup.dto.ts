import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateChatGroupDto {
  @ApiProperty({ description: 'Chat group name', example: 'Sri Lanka Adventure' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Trip ID associated with this chat group', example: 'trip_12345' })
  @IsNotEmpty()
  @IsString()
  tripId!: string;

  @ApiProperty({ description: 'Admin user ID (trip organizer)', example: 'user_12345' })
  @IsNotEmpty()
  @IsString()
  adminId!: string;

  @ApiProperty({ description: 'Admin name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  adminName!: string;

  @ApiProperty({
    description: 'Chat group description',
    example: 'Discussion group for trip',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Initial members',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];
}
