import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AttractionDto } from '../dto/attraction.dto';

interface PlacesCacheEntry {
  expiresAt: number;
  data: AttractionDto[];
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly cache = new Map<string, PlacesCacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const ttlSeconds = Number(this.configService.get('PLACES_CACHE_TTL_SECONDS')) || 3600;
    this.cacheTtlMs = ttlSeconds * 1000;
  }

  async getAttractions(location: string): Promise<AttractionDto[]> {
    const cacheKey = location.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new HttpException('Google Places API key not configured', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: {
            query: `tourist attractions in ${location}`,
            key: apiKey,
          },
        }),
      );

      const results = Array.isArray(response.data?.results) ? response.data.results : [];
      const mapped = results
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
            location,
          }),
        );

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + this.cacheTtlMs,
        data: mapped,
      });

      return mapped;
    } catch (error) {
      this.logger.error(`Google Places API failed for ${location}`, error as Error);
      throw new HttpException(
        'Failed to fetch places from Google Places',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
