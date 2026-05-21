import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'Sender user ID', example: 'user_12345' })
  @IsNotEmpty()
  @IsString()
  senderId!: string;

  @ApiProperty({ description: 'Sender display name', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  senderName!: string;

  @ApiProperty({ description: 'Text message content', required: false, example: 'Hello everyone!' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Image attachment URL', required: false, example: 'https://firebasestorage.googleapis.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
