import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryRequestDto } from './dto/generate-itinerary-request.dto';
import { GenerateItineraryResponseDto } from './dto/generate-itinerary-response.dto';

@ApiTags('itinerary')
@Controller('itinerary')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: GenerateItineraryRequestDto })
  @ApiOkResponse({ type: GenerateItineraryResponseDto })
  async generate(
    
    @Body() dto: GenerateItineraryRequestDto,
  ): Promise<GenerateItineraryResponseDto> {
    return this.itineraryService.generateItinerary(dto);
  }
}
