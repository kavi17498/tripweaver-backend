import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateTripPlanRequestDto } from './dto/create-trip-plan-request.dto';
import { AutoItineraryRequestDto } from './dto/auto-itinerary-request.dto';
import { LocationsRequestDto } from './dto/locations-request.dto';
import { TripPlan } from './entities/tripplan.entity';
import { AutoItineraryResponse } from './entities/auto-itinerary-response.entity';
import { LocationDestinationsResponse } from './entities/locations-response.entity';
import { TripPlannerService } from './tripplanner.service';

@ApiTags('trip-plan')
@Controller('trip-plan')
export class TripPlanController {
    constructor(private readonly tripPlannerService: TripPlannerService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: CreateTripPlanRequestDto })
    @ApiOkResponse({ type: TripPlan })
    async createTripPlan(
        @Body() dto: CreateTripPlanRequestDto,
    ): Promise<TripPlan> {
        return this.tripPlannerService.createTripPlan(dto);
    }

    @Post('destinations')
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: LocationsRequestDto })
    @ApiOkResponse({ type: [LocationDestinationsResponse] })
    async getDestinationsByLocations(
        @Body() dto: LocationsRequestDto,
    ): Promise<LocationDestinationsResponse[]> {
        return this.tripPlannerService.getDestinationsByLocations(dto);
    }

    @Post('itinerary/auto')
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: AutoItineraryRequestDto })
    @ApiOkResponse({ type: AutoItineraryResponse })
    async generateAutoItinerary(
        @Body() dto: AutoItineraryRequestDto,
    ): Promise<AutoItineraryResponse> {
        return this.tripPlannerService.generateAutoItinerary(dto);
    }
}