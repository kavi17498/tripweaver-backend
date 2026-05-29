import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/public.decorator';
import { CreateOnDemandTripDto } from './dto/create-on-demand-trip.dto';
import { UpdateOnDemandTripDto } from './dto/update-on-demand-trip.dto';
import { BookOnDemandTripDto } from './dto/book-on-demand-trip.dto';
import { OnDemandTripsService } from './onDemandTrips.service';
import { OnDemandTripTemplate } from './entities/on-demand-trip-template.entity';

type AuthenticatedRequest = Request & { user?: { uid?: string; sub?: string; role?: string } };

@ApiTags('on-demand-trips')
@Controller('on-demand-trips')
export class OnDemandTripsController {
  constructor(private readonly onDemandTripsService: OnDemandTripsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an on-demand trip template' })
  @ApiBody({ type: CreateOnDemandTripDto })
  async create(@Body() dto: CreateOnDemandTripDto, @Req() request: AuthenticatedRequest): Promise<OnDemandTripTemplate> {
    const role = request.user?.role;
    return this.onDemandTripsService.create(dto, role);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public on-demand trip templates' })
  @ApiQuery({ name: 'organizerId', required: false })
  async findPublic(@Query('organizerId') organizerId?: string): Promise<OnDemandTripTemplate[]> {
    return this.onDemandTripsService.findPublic(organizerId);
  }

  @Get('organizer/:organizerId')
  @ApiOperation({ summary: 'Get on-demand trip templates by organizer' })
  @ApiParam({ name: 'organizerId' })
  async findByOrganizer(@Param('organizerId') organizerId: string): Promise<OnDemandTripTemplate[]> {
    return this.onDemandTripsService.findByOrganizer(organizerId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an on-demand trip template by ID' })
  async findOne(@Param('id') id: string): Promise<OnDemandTripTemplate> {
    return this.onDemandTripsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an on-demand trip template' })
  async update(@Param('id') id: string, @Body() dto: UpdateOnDemandTripDto, @Req() request: AuthenticatedRequest): Promise<OnDemandTripTemplate> {
    return this.onDemandTripsService.update(id, dto, request.user?.role);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Hide or show an on-demand trip template' })
  async toggleVisibility(@Param('id') id: string, @Body() body: { isHidden: boolean }): Promise<OnDemandTripTemplate> {
    return this.onDemandTripsService.toggleVisibility(id, Boolean(body.isHidden));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an on-demand trip template' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.onDemandTripsService.remove(id);
  }

  @Public()
  @Get(':id/availability')
  @ApiOperation({ summary: 'Get guide busy dates for a template booking calendar' })
  async getAvailability(@Param('id') id: string): Promise<{ busyDates: string[]; busyRanges: Array<{ startDate: string; endDate: string }> }> {
    return this.onDemandTripsService.getAvailability(id);
  }

  @Post(':id/book')
  @ApiOperation({ summary: 'Create a private trip instance from an on-demand template' })
  @ApiBody({ type: BookOnDemandTripDto })
  async book(@Param('id') id: string, @Body() dto: BookOnDemandTripDto, @Req() request: AuthenticatedRequest): Promise<{ tripId: string }> {
    const uid = request.user?.uid || request.user?.sub;
    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return this.onDemandTripsService.book(id, dto, uid, request.user?.role);
  }
}