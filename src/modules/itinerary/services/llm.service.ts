import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GenerateItineraryResponseDto } from '../dto/generate-itinerary-response.dto';
import { AttractionDto } from '../dto/attraction.dto';

interface ItineraryPromptInput {
  totalDays: number;
  startLocation: string;
  locations: Array<{ location: string; days: number }>;
  attractionsByLocation: Record<string, AttractionDto[]>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generateItinerary(
    input: ItineraryPromptInput,
  ): Promise<GenerateItineraryResponseDto> {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl =
      this.configService.get<string>('LLM_BASE_URL') ?? 'https://api.openai.com';
    const model = this.configService.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';

    if (!apiKey) {
      throw new HttpException('LLM API key not configured', HttpStatus.BAD_REQUEST);
    }

    const prompt = this.buildPrompt(input);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: 'You are a travel itinerary planner.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('LLM response missing content');
      }

      const parsed = this.safeParseJson(content);
      if (!parsed?.days || !Array.isArray(parsed.days)) {
        throw new Error('Invalid itinerary format');
      }

      return parsed as GenerateItineraryResponseDto;
    } catch (error) {
      this.logger.error('LLM request failed', error as Error);
      throw new HttpException('LLM request failed', HttpStatus.BAD_GATEWAY);
    }
  }

  private buildPrompt(input: ItineraryPromptInput): string {
    return [
      'Generate a travel itinerary as strictly valid JSON only.',
      'Output schema:',
      '{"days":[{"day":1,"location":"Ella","places":[{"name":"","lat":0,"lng":0,"rating":0}]}]}',
      '',
      `Total trip days: ${input.totalDays}.`,
      `Start location: ${input.startLocation}.`,
      'Days per location:',
      JSON.stringify(input.locations),
      '',
      'Attractions grouped by location:',
      JSON.stringify(input.attractionsByLocation),
      '',
      'Rules:',
      '- Group by location and respect the days per location.',
      '- Max 4-5 places per day.',
      '- Prefer nearby places in the same day.',
      '- Use only the provided attractions.',
      '- Return JSON only, no markdown, no commentary.',
    ].join('\n');
  }

  private safeParseJson(content: string): GenerateItineraryResponseDto {
    const trimmed = content.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('No JSON object found');
    }

    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText) as GenerateItineraryResponseDto;
  }
}
