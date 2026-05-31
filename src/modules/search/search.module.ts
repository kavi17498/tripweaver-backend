import { Module } from '@nestjs/common';
import { OnDemandTripsModule } from '../onDemandTrips/onDemandTrips.module';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TripsModule, OnDemandTripsModule, UsersModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
