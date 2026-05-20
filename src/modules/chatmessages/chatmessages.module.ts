import { Module } from '@nestjs/common';
import { ChatMessagesController } from './chatmessages.controller';
import { ChatMessagesService } from './chatmessages.service';
import { ChatGroupsModule } from '../chatgroups/chatgroups.module';

@Module({
  imports: [ChatGroupsModule],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService],
  exports: [ChatMessagesService],
})
export class ChatMessagesModule {}
