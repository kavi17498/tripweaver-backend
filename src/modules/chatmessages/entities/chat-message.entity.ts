import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageEntity {
  @ApiProperty({ description: 'Message ID', example: 'message_12345' })
  id?: string;

  @ApiProperty({ description: 'Chat group ID', example: 'chatgroup_12345' })
  chatGroupId!: string;

  @ApiProperty({ description: 'Trip ID', example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ description: 'Sender user ID', example: 'user_12345' })
  senderId!: string;

  @ApiProperty({ description: 'Sender display name', example: 'John Doe' })
  senderName!: string;

  @ApiProperty({ description: 'Text message content', required: false, example: 'We will arrive at 10 AM.' })
  message?: string;

  @ApiProperty({ description: 'Image attachment URL', required: false, example: 'https://firebasestorage.googleapis.com/...' })
  imageUrl?: string;

  @ApiProperty({ description: 'Message creation timestamp', required: false, example: '2026-03-20T10:30:00Z' })
  createdAt?: Date;

  @ApiProperty({ description: 'Message last update timestamp', required: false, example: '2026-03-20T10:30:00Z' })
  updatedAt?: Date;
}
