import { Module } from '@nestjs/common';
import { OnDemandTripsController } from './onDemandTrips.controller';
import { OnDemandTripsService } from './onDemandTrips.service';
import { UsersModule } from '../users/users.module';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [UsersModule, TripsModule],
  controllers: [OnDemandTripsController],
  providers: [OnDemandTripsService],
  exports: [OnDemandTripsService],
})
export class OnDemandTripsModule {}