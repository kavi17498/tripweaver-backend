import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID', example: 'user_12345' })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({ description: 'Notification type', example: 'trip-approved' })
  @IsString()
  @MinLength(1)
  type!: NotificationType;

  @ApiProperty({ description: 'Notification title', example: 'Trip approved' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Notification description', example: 'Your trip to Bali has been approved.' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ description: 'Related trip ID', required: false, example: 'trip_12345' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiProperty({ description: 'Whether the notification starts as read', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
