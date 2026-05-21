import { Module } from '@nestjs/common';
import { VerficationService } from './verfication.service';
import { VerficationController } from './verfication.controller';

@Module({
  controllers: [VerficationController],
  providers: [VerficationService],
})
export class VerficationModule {}
