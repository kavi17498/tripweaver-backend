import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Trip } from '../trips/entities/trip.entity';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { AdminService } from './admin.service';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { OnDemandTripTemplate } from '../onDemandTrips/entities/on-demand-trip-template.entity';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
  };
};

@ApiTags('admin')
@ApiSecurity('firebase-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid Firebase token' })
@ApiForbiddenResponse({ description: 'Admin or superadmin role required' })
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('trips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all trips for admins',
    description: 'Returns every trip in the database for admin and superadmin users only.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TripStatus,
    description: 'Optional trip status filter. If omitted, returns all trips.',
  })
  @ApiOkResponse({ type: [Trip] })
  async getAllTrips(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: TripStatus,
  ): Promise<Trip[]> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    if (status && !Object.values(TripStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    return this.adminService.getAllTrips(status);
  }

  @Get('trips/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a trip by id for admins',
    description: 'Returns the full trip record including status, destinations, itinerary, participants, pricing, and all other trip fields for admin and superadmin users only.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Trip ID',
    example: 'trip_12345',
  })
  @ApiOkResponse({ type: Trip })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  async getTripById(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Trip> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    return this.adminService.getTripById(id);
  }

  @Patch('trips/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update trip status for admins',
    description: 'Updates the trip status, stores the reason on the trip, and writes a status change log entry. Admin and superadmin users only.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Trip ID',
    example: 'trip_12345',
  })
  @ApiBody({ type: UpdateTripStatusDto })
  @ApiOkResponse({ type: Trip })
  @ApiBadRequestResponse({ description: 'Invalid status or reason' })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  async updateTripStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTripStatusDto: UpdateTripStatusDto,
  ): Promise<Trip> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    return this.adminService.updateTripStatus(id, updateTripStatusDto, uid);
  }

  @Get('on-demand-trips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all on-demand trip templates for admins',
    description: 'Returns every on-demand trip template in the database for admin and superadmin users only.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TripStatus,
    description: 'Optional on-demand trip status filter. If omitted, returns all templates.',
  })
  @ApiOkResponse({ type: [OnDemandTripTemplate] })
  async getAllOnDemandTrips(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: TripStatus,
  ): Promise<OnDemandTripTemplate[]> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    if (status && !Object.values(TripStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    return this.adminService.getAllOnDemandTrips(status);
  }

  @Get('on-demand-trips/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get an on-demand trip template by id for admins',
    description: 'Returns the full on-demand template record for admin and superadmin users only.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'On-demand trip template ID',
    example: 'ondemand_12345',
  })
  @ApiOkResponse({ type: OnDemandTripTemplate })
  @ApiNotFoundResponse({ description: 'On-demand trip template not found' })
  async getOnDemandTripById(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<OnDemandTripTemplate> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    return this.adminService.getOnDemandTripById(id);
  }

  @Patch('on-demand-trips/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update on-demand trip template status for admins',
    description: 'Updates the template status, stores the reason, and writes a status change log entry. Admin and superadmin users only.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'On-demand trip template ID',
    example: 'ondemand_12345',
  })
  @ApiBody({ type: UpdateTripStatusDto })
  @ApiOkResponse({ type: OnDemandTripTemplate })
  @ApiBadRequestResponse({ description: 'Invalid status or reason' })
  @ApiNotFoundResponse({ description: 'On-demand trip template not found' })
  async updateOnDemandTripStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTripStatusDto: UpdateTripStatusDto,
  ): Promise<OnDemandTripTemplate> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }

    return this.adminService.updateOnDemandTripStatus(id, updateTripStatusDto, uid);
  }
}