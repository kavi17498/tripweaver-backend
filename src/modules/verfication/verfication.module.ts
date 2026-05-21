import { Module } from '@nestjs/common';
import { VerficationService } from './verfication.service';
import { VerficationController } from './verfication.controller';
import { UsersModule } from '../users/users.module';
import { TripsModule } from '../trips/trips.module';
import { VerificationMeetingModule } from '../verificationmeeting/verificationmeeting.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, TripsModule, VerificationMeetingModule, NotificationsModule],
  controllers: [VerficationController],
  providers: [VerficationService],
})
export class VerficationModule {}
