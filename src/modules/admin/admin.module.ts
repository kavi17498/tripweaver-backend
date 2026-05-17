import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { ChatGroupsModule } from '../chatgroups/chatgroups.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TripsModule, UsersModule, ChatGroupsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}