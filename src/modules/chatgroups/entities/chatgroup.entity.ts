import { ApiProperty } from '@nestjs/swagger';

export class ChatGroup {
  @ApiProperty({ description: 'Chat group ID', example: 'chatgroup_12345' })
  id?: string;

  @ApiProperty({ description: 'Chat group name', example: 'Sri Lanka Adventure' })
  name!: string;

  @ApiProperty({ description: 'Trip ID associated with this chat group', example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ description: 'Admin user ID (trip organizer)', example: 'user_12345' })
  adminId!: string;

  @ApiProperty({ description: 'Admin name', example: 'John Doe' })
  adminName!: string;

  @ApiProperty({
    description: 'Chat group description',
    example: 'Discussion group for Sri Lanka Adventure trip',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Members of the chat group',
    type: [String],
    example: ['user_12345', 'user_67890'],
    required: false,
  })
  members?: string[];

  @ApiProperty({
    description: 'Chat group creation timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Chat group last message timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  lastMessageAt?: Date;

  @ApiProperty({
    description: 'Last message preview',
    example: 'Hey, are we still on for tomorrow?',
    required: false,
  })
  lastMessage?: string;

  @ApiProperty({
    description: 'Last sender user ID',
    example: 'user_12345',
    required: false,
  })
  lastMessageSenderId?: string;

  @ApiProperty({
    description: 'Unread message counters per user',
    required: false,
  })
  unreadCounts?: Record<string, number>;

  @ApiProperty({
    description: 'Chat group last update timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  updatedAt?: Date;
}
