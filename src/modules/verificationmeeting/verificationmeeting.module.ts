import { Module } from '@nestjs/common';

import { VerificationMeetingController } from './verificationmeeting.controller';
import { VerificationMeetingService } from './verificationmeeting.service';

@Module({
  controllers: [VerificationMeetingController],
  providers: [VerificationMeetingService],
  exports: [VerificationMeetingService],
})
export class VerificationMeetingModule {}
