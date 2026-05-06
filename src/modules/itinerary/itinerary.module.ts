import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { PlacesService } from './services/places.service';
import { LlmService } from './services/llm.service';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [ItineraryController],
  providers: [ItineraryService, PlacesService, LlmService],
})
export class ItineraryModule {}
