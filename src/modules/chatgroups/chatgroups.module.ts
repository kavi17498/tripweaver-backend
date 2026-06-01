import { Module, forwardRef } from '@nestjs/common';
import { ChatGroupsService } from './chatgroups.service';
import { ChatGroupsController } from './chatgroups.controller';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => TripsModule), UsersModule],
  controllers: [ChatGroupsController],
  providers: [ChatGroupsService],
  exports: [ChatGroupsService],
})
export class ChatGroupsModule {}
