import { Module, forwardRef } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { UsersModule } from '../users/users.module';
import { ChatGroupsModule } from '../chatgroups/chatgroups.module';
import { ChatMessagesModule } from '../chatmessages/chatmessages.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, forwardRef(() => ChatGroupsModule), ChatMessagesModule, NotificationsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
