import { BadRequestException, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
}