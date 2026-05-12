import { Module } from '@nestjs/common';
import { ChatGroupsService } from './chatgroups.service';
import { ChatGroupsController } from './chatgroups.controller';

@Module({
  controllers: [ChatGroupsController],
  providers: [ChatGroupsService],
  exports: [ChatGroupsService],
})
export class ChatGroupsModule {}
