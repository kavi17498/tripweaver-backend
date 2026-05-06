import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TripPlanController } from './tripplanner.controller';
import { TripPlannerService } from './tripplanner.service';

@Module({
  imports: [HttpModule],
  controllers: [TripPlanController],
  providers: [TripPlannerService],
})
export class TripPlannerModule {}
