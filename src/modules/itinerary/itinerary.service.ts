import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GenerateItineraryRequestDto } from './dto/generate-itinerary-request.dto';
import { GenerateItineraryResponseDto } from './dto/generate-itinerary-response.dto';
import { PlacesService } from './services/places.service';
import { LlmService } from './services/llm.service';
import { AttractionDto } from './dto/attraction.dto';

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly placesService: PlacesService,
    private readonly llmService: LlmService,
  ) {}

  async generateItinerary(
    dto: GenerateItineraryRequestDto,
  ): Promise<GenerateItineraryResponseDto> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
    }

    if (endDate < startDate) {
      throw new HttpException(
        'endDate must be after startDate',
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalDays = this.getTotalTripDays(startDate, endDate);
    const mainLocations = dto.mainLocations
      .map((location) => location.trim())
      .filter((location) => location.length > 0);

    if (mainLocations.length === 0) {
      throw new HttpException(
        'mainLocations must not be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attractionsByLocation = await this.fetchAttractions(mainLocations);
    const locationDayPlan = this.distributeDays(totalDays, mainLocations);

    try {
      return await this.llmService.generateItinerary({
        totalDays,
        startLocation: dto.startLocation,
        locations: locationDayPlan,
        attractionsByLocation,
      });
    } catch (error) {
      this.logger.error('LLM itinerary generation failed', error as Error);
      throw new HttpException(
        'Failed to generate itinerary',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private getTotalTripDays(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
    return diff + 1;
  }

  private distributeDays(totalDays: number, locations: string[]) {
    const baseDays = Math.floor(totalDays / locations.length);
    let remainder = totalDays % locations.length;

    return locations.map((location) => {
      const days = baseDays + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }
      return { location, days };
    });
  }

  private async fetchAttractions(locations: string[]) {
    const results = await Promise.all(
      locations.map((location) => this.placesService.getAttractions(location)),
    );

    const map: Record<string, AttractionDto[]> = {};
    results.forEach((attractions, index) => {
      map[locations[index]] = attractions;
    });

    return map;
  }
}
