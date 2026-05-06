import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateTripPlanRequestDto } from './dto/create-trip-plan-request.dto';
import { AutoItineraryRequestDto } from './dto/auto-itinerary-request.dto';
import { LocationsRequestDto } from './dto/locations-request.dto';
import { AutoItineraryResponse } from './entities/auto-itinerary-response.entity';
import { LocationDestinationsResponse } from './entities/locations-response.entity';
import { TripPlan, TripPlanLocationPlan, TripPlanPlace } from './entities/tripplan.entity';

@Injectable()
export class TripPlannerService {
       private readonly logger = new Logger(TripPlannerService.name);

       constructor(
              private readonly httpService: HttpService,
              private readonly configService: ConfigService,
       ) {}

       async createTripPlan(dto: CreateTripPlanRequestDto): Promise<TripPlan> {
              const startDate = new Date(dto.startdate);
              const endDate = new Date(dto.enddate);

              if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                     throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
              }

              if (endDate < startDate) {
                     throw new HttpException('enddate must be after startdate', HttpStatus.BAD_REQUEST);
              }

              const numberOfDays = this.getTotalTripDays(startDate, endDate);
              const mainLocations = (dto.mainLocations ?? [])
                     .map((location) => location.trim())
                     .filter((location) => location.length > 0);

              if (mainLocations.length === 0) {
                     throw new HttpException('mainLocations must not be empty', HttpStatus.BAD_REQUEST);
              }

              const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
              if (!apiKey) {
                     throw new HttpException(
                            'Google Places API key not configured',
                            HttpStatus.BAD_REQUEST,
                     );
              }

              const destinationsByLocation = await this.fetchDestinationsByLocation(
                     mainLocations,
                     apiKey,
              );

              return {
                     startdate: startDate,
                     enddate: endDate,
                     numberOfDays,
                     startLocation: dto.startLocation,
                     mainLocations,
                     destinationsByLocation,
                     createdAt: new Date(),
              };
       }

       async getDestinationsByLocations(
              dto: LocationsRequestDto,
       ): Promise<LocationDestinationsResponse[]> {
              const locations = (dto.locations ?? [])
                     .map((location) => location.trim())
                     .filter((location) => location.length > 0);

              if (locations.length === 0) {
                     throw new HttpException('locations must not be empty', HttpStatus.BAD_REQUEST);
              }

              const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
              if (!apiKey) {
                     throw new HttpException(
                            'Google Places API key not configured',
                            HttpStatus.BAD_REQUEST,
                     );
              }

              const results = await Promise.all(
                     locations.map((location) => this.fetchDestinationsWithPhotos(location, apiKey)),
              );

              return results.map((destinations, index) => ({
                     location: locations[index],
                     destinations,
              }));
       }

       async generateAutoItinerary(
              dto: AutoItineraryRequestDto,
       ): Promise<AutoItineraryResponse> {
              const apiKey = this.configService.get<string>('LLM_API_KEY');
              const baseUrl =
                     this.configService.get<string>('LLM_BASE_URL') ??
                     'https://generativelanguage.googleapis.com/v1beta';
              const model = this.configService.get<string>('LLM_MODEL') ?? 'gemini-2.5-flash';

              if (!apiKey) {
                     throw new HttpException('LLM API key not configured', HttpStatus.BAD_REQUEST);
              }

              const prompt = this.buildAutoItineraryPrompt(dto);

              try {
                     const response = await firstValueFrom(
                            this.httpService.post(
                                   `${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent?key=${apiKey}`,
                                   {
                                          contents: [
                                                 {
                                                        role: 'user',
                                                        parts: [{ text: prompt }],
                                                 },
                                          ],
                                          generationConfig: {
                                                 temperature: 0.4,
                                                 responseMimeType: 'application/json',
                                          },
                                   },
                                   {
                                          headers: {
                                                 'Content-Type': 'application/json',
                                          },
                                   },
                            ),
                     );

                     const content =
                            response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
                     if (typeof content !== 'string') {
                            throw new Error('LLM response missing content');
                     }

                     const parsed = this.safeParseJson<AutoItineraryResponse>(content);
                     if (!parsed?.days || !Array.isArray(parsed.days)) {
                            throw new Error('Invalid itinerary format');
                     }

                     return parsed;
              } catch (error) {
                     this.logger.error('Auto itinerary generation failed', error as Error);
                     throw new HttpException('Failed to generate itinerary', HttpStatus.BAD_GATEWAY);
              }
       }

       private getTotalTripDays(startDate: Date, endDate: Date): number {
              const msPerDay = 24 * 60 * 60 * 1000;
              const diff = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
              return diff + 1;
       }

       private async fetchDestinationsByLocation(
              locations: string[],
              apiKey: string,
       ): Promise<TripPlanLocationPlan[]> {
              const results = await Promise.all(
                     locations.map((location) => this.fetchPlaces(location, apiKey)),
              );

              return results.map((places, index) => ({
                     location: locations[index],
                     places,
              }));
       }

       private async fetchPlaces(location: string, apiKey: string): Promise<TripPlanPlace[]> {
              try {
                     const response = await firstValueFrom(
                            this.httpService.get(
                                   'https://maps.googleapis.com/maps/api/place/textsearch/json',
                                   {
                                          params: {
                                                 query: `tourist attractions in ${location}`,
                                                 key: apiKey,
                                          },
                                   },
                            ),
                     );

                     const results = Array.isArray(response.data?.results)
                            ? response.data.results
                            : [];

                     return results
                            .filter((place: { rating?: number }) => (place.rating ?? 0) >= 3.5)
                            .slice(0, 15)
                            .map(
                                   (place: {
                                          name?: string;
                                          geometry?: { location?: { lat?: number; lng?: number } };
                                          rating?: number;
                                   }) => ({
                                          name: place.name ?? 'Unknown',
                                          lat: place.geometry?.location?.lat ?? 0,
                                          lng: place.geometry?.location?.lng ?? 0,
                                          rating: place.rating ?? 0,
                                   }),
                            );
              } catch (error) {
                     this.logger.error(`Google Places API failed for ${location}`, error as Error);
                     throw new HttpException(
                            'Failed to fetch places from Google Places',
                            HttpStatus.BAD_GATEWAY,
                     );
              }
       }

       private async fetchDestinationsWithPhotos(
              location: string,
              apiKey: string,
       ): Promise<LocationDestinationsResponse['destinations']> {
              try {
                     const response = await firstValueFrom(
                            this.httpService.get(
                                   'https://maps.googleapis.com/maps/api/place/textsearch/json',
                                   {
                                          params: {
                                                 query: `tourist attractions in ${location}`,
                                                 key: apiKey,
                                          },
                                   },
                            ),
                     );

                     const results = Array.isArray(response.data?.results)
                            ? response.data.results
                            : [];

                     return results.slice(0, 15).map(
                            (place: {
                                   name?: string;
                                   geometry?: { location?: { lat?: number; lng?: number } };
                                   photos?: Array<{ photo_reference?: string }>;
                                   formatted_address?: string;
                            }) => {
                                   const photoRef = place.photos?.[0]?.photo_reference;
                                   const imageUrl = photoRef
                                          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${apiKey}`
                                          : null;

                                   return {
                                          name: place.name ?? 'Unknown',
                                          lat: place.geometry?.location?.lat ?? 0,
                                          lng: place.geometry?.location?.lng ?? 0,
                                          imageUrl,
                                          description: place.formatted_address ?? null,
                                   };
                            },
                     );
              } catch (error) {
                     this.logger.error(`Google Places API failed for ${location}`, error as Error);
                     throw new HttpException(
                            'Failed to fetch places from Google Places',
                            HttpStatus.BAD_GATEWAY,
                     );
              }
       }

       private buildAutoItineraryPrompt(dto: AutoItineraryRequestDto): string {
              return [
                     'Generate a day-by-day itinerary as strictly valid JSON only.',
                     'Output schema:',
                     '{"tripName":"","days":[{"day":1,"date":"YYYY-MM-DD","location":"","activities":[{"startTime":"08:00 AM","endTime":"10:00 AM","activity":"","location":"","description":""}]}]}',
                     '',
                     `Trip name: ${dto.tripName}.`,
                     `Trip category: ${dto.tripCategory}.`,
                     `Start date: ${dto.startDate}.`,
                     `End date: ${dto.endDate}.`,
                     `Daily start time: ${dto.startTime}.`,
                     `Daily end time: ${dto.endTime}.`,
                     `Start location: ${dto.startLocation}.`,
                     `Max participants: ${dto.maxParticipants}.`,
                     'Destinations:',
                     JSON.stringify(dto.destinations),
                     'Included:',
                     JSON.stringify(dto.included),
                     '',
                     'Rules:',
                     '- Use only the provided destinations.',
                     '- Create activities between the daily start and end time.',
                     '- Include travel time or breaks if needed.',
                     '- Return JSON only, no markdown, no commentary.',
              ].join('\n');
       }

       private safeParseJson<T>(content: string): T {
              const trimmed = content.trim();
              const start = trimmed.indexOf('{');
              const end = trimmed.lastIndexOf('}');
              if (start === -1 || end === -1) {
                     throw new Error('No JSON object found');
              }

              const jsonText = trimmed.slice(start, end + 1);
              return JSON.parse(jsonText) as T;
       }
}
