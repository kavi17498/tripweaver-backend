import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { NotificationEntity } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
  };
};

@ApiTags('notifications')
@ApiSecurity('firebase-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiOkResponse({ type: [NotificationEntity] })
  async getMine(@Req() request: AuthenticatedRequest): Promise<NotificationEntity[]> {
    const userId = request.user?.uid || request.user?.sub;
    return userId ? this.notificationsService.findByUserId(userId) : [];
  }

  @Get('me/unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user unread notification count' })
  async getUnreadCount(@Req() request: AuthenticatedRequest): Promise<{ count: number }> {
    const userId = request.user?.uid || request.user?.sub;
    return { count: userId ? await this.notificationsService.getUnreadCount(userId) : 0 };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(@Param('id') id: string): Promise<NotificationEntity> {
    return this.notificationsService.markAsRead(id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a notification manually for testing' })
  @ApiBody({ type: CreateNotificationDto })
  async seed(@Body() dto: CreateNotificationDto): Promise<NotificationEntity> {
    return this.notificationsService.create(dto);
  }
}
