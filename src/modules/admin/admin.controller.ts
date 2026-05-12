import { BadRequestException, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Trip } from '../trips/entities/trip.entity';
import { TripStatus } from '../trips/entities/trip-status.enum';
import { AdminService } from './admin.service';

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
}