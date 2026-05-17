import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TripsService } from './trips.service';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip } from './entities/trip.entity';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
  };
};

@ApiTags('trips')
@ApiSecurity('firebase-token')
@ApiBadRequestResponse({ description: 'Invalid request body or validation failed' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid Firebase token' })
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * Create a new trip
   * POST /trips
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new trip',
    description:
      'Create a new trip with comprehensive details including destinations, itinerary, pricing, included services, a photo gallery, and a separate cover image. Required: organizer must be a valid user ID.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({
    status: 201,
    description: 'Trip created successfully',
    type: Trip,
  })
  async create(
    @Body() createTripDto: CreateTripDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Trip> {
    const userRole = request.user?.role;
    return this.tripsService.create(createTripDto, userRole);
  }

  /**
   * Get all trips
   * GET /trips
   */
  @Get()
  @ApiOperation({
    summary: 'Get all trips',
    description:
      'Returns all trips for admin and superadmin users. Other authenticated users only receive trips organized by their own Firebase user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all trips retrieved successfully',
    type: [Trip],
  })
  async findAll(@Req() request: AuthenticatedRequest): Promise<Trip[]> {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }
    return this.tripsService.findByOrganizer(uid);
  }

  /**
   * Get trips by organizer
   * GET /trips/organizer/:organizerId
   */
  // @Get('organizer/:organizerId')
  // @ApiOperation({
  //   summary: 'Get trips by organizer',
  //   description: 'Retrieve all trips organized by a specific user.',
  // })
  // @ApiParam({
  //   name: 'organizerId',
  //   description: 'ID of the user who organized the trip',
  //   example: 'user_12345',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'List of trips organized by the user',
  //   type: [Trip],
  // })
  // async findByOrganizer(
  //   @Param('organizerId') organizerId: string,
  // ): Promise<Trip[]> {
  //   return this.tripsService.findByOrganizer(organizerId);
  // }

  /**
   * Get trips by category
   * GET /trips/category/:category
   */
  @Get('category/:category')
  @ApiOperation({
    summary: 'Get trips by category',
    description:
      'Retrieve all trips in a specific category (Travel with Guide, Join Group Trip, Family Trip with Guide, Private Trip).',
  })
  @ApiParam({
    name: 'category',
    description: 'Trip category',
    example: 'Family Trip with Guide',
    enum: [
      'Solo Trip with guide',
      'Family Trip with guide',
      'Strangers Trip with guide',
      'Private trip',
    ],
  })
  @ApiResponse({
    status: 200,
    description: 'List of trips in the specified category',
    type: [Trip],
  })
  async findByCategory(@Param('category') category: string): Promise<Trip[]> {
    return this.tripsService.findByCategory(category);
  }

  /**
   * Get trips within date range
   * GET /trips/search/date-range?startDate=2026-04-01&endDate=2026-04-30
   */
  @Get('search/date-range')
  @ApiOperation({
    summary: 'Search trips by date range',
    description:
      'Find all trips that operate within the specified date range. Dates should be in YYYY-MM-DD format.',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Trip start date (YYYY-MM-DD format)',
    example: '2026-04-01',
    required: true,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Trip end date (YYYY-MM-DD format)',
    example: '2026-04-30',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Trips within the specified date range',
    type: [Trip],
  })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<Trip[]> {
    return this.tripsService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get a trip by ID
   * GET /trips/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a trip by ID',
    description: 'Retrieve detailed information for a specific trip including all itineraries and participants.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique trip identifier',
    example: 'trip_12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip found and returned',
    type: Trip,
  })
  @ApiNotFoundResponse({ description: 'Trip with specified ID not found' })
  async findOne(@Param('id') id: string): Promise<Trip> {
    return this.tripsService.findOne(id);
  }

  /**
   * Update a trip
   * PUT /trips/:id
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a trip',
    description: 'Modify trip details. All fields are optional - only provide fields you want to update. You can update the photos gallery and cover image separately. Regular users can only change trip status from DRAFT to PENDING; admins can change to any status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique trip identifier',
    example: 'trip_12345',
  })
  @ApiBody({ type: UpdateTripDto })
  @ApiResponse({
    status: 200,
    description: 'Trip updated successfully',
    type: Trip,
  })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Trip> {
    const userRole = request.user?.role;
    return this.tripsService.update(id, updateTripDto, userRole);
  }

  /**
   * Add participant to trip
   * POST /trips/:id/participants
   */
  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add multiple participants to a trip',
    description:
      'Register one or more participants for a trip in a single request. Each participant can have its own parentUserId, and self-purchases should leave parentUserId null or omitted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique trip identifier',
    example: 'trip_12345',
  })
  @ApiBody({
    description: 'Bulk participant registration information',
    schema: {
      example: {
        participants: [
          {
            parentUserId: 'user_12345',
            name: 'John Doe',
            gender: 'male',
            age: 28,
            address: '123 Main St, New York',
            phone: '+1234567890',
            email: 'john@example.com',
          },
          {
            name: 'Jane Doe',
            gender: 'female',
            age: 26,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Participants added successfully',
    type: Trip,
  })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  async addParticipant(
    @Param('id') id: string,
    @Body() participant: AddParticipantsDto,
  ): Promise<Trip> {
    return this.tripsService.addParticipants(id, participant);
  }

  /**
   * Update a participant on a trip
   * PATCH /trips/:id/participants/:participantId
   */
  @Patch(':id/participants/:participantId')
  @ApiOperation({
    summary: 'Update a participant on a trip',
    description:
      'Partially update a participant record. Use this when correcting traveler details or linking a parent user after creation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique trip identifier',
    example: 'trip_12345',
  })
  @ApiParam({
    name: 'participantId',
    description: 'Unique participant identifier',
    example: 'participant_12345',
  })
  @ApiBody({ type: UpdateParticipantDto })
  @ApiResponse({
    status: 200,
    description: 'Participant updated successfully',
    type: Trip,
  })
  @ApiNotFoundResponse({ description: 'Trip or participant not found' })
  async updateParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Body() participant: UpdateParticipantDto,
  ): Promise<Trip> {
    return this.tripsService.updateParticipant(id, participantId, participant);
  }

  /**
   * Delete a trip
   * DELETE /trips/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a trip',
    description: 'Permanently delete a trip and all associated data including participants and itineraries.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique trip identifier',
    example: 'trip_12345',
  })
  @ApiResponse({ status: 204, description: 'Trip deleted successfully' })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tripsService.remove(id);
  }
}
