import { ApiProperty } from '@nestjs/swagger';

export type NotificationType = 'trip-approved' | 'join-request' | 'payment' | 'reminder' | 'account-alert';

export class NotificationEntity {
  @ApiProperty({ description: 'Notification ID', example: 'notification_12345' })
  id?: string;

  @ApiProperty({ description: 'Recipient user ID', example: 'user_12345' })
  userId!: string;

  @ApiProperty({ description: 'Notification type', example: 'trip-approved' })
  type!: NotificationType;

  @ApiProperty({ description: 'Notification title', example: 'Trip approved' })
  title!: string;

  @ApiProperty({ description: 'Notification description', example: 'Your trip to Bali has been approved.' })
  description!: string;

  @ApiProperty({ description: 'Related trip ID', required: false, example: 'trip_12345' })
  tripId?: string;

  @ApiProperty({ description: 'Whether the notification has been read', example: false })
  read!: boolean;

  @ApiProperty({ description: 'Notification creation timestamp', example: '2026-05-20T10:30:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Notification update timestamp', example: '2026-05-20T10:30:00Z' })
  updatedAt!: Date;
}
