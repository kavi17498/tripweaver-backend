import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiSecurity,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ChatGroupsService } from './chatgroups.service';
import { CreateChatGroupDto } from './dto/create-chatgroup.dto';
import { UpdateChatGroupDto } from './dto/update-chatgroup.dto';
import { ChatGroup } from './entities/chatgroup.entity';

type AuthenticatedRequest = ExpressRequest & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
  };
};

@ApiTags('chatgroups')
@ApiSecurity('firebase-token')
@Controller('chatgroups')
export class ChatGroupsController {
  constructor(private readonly chatGroupsService: ChatGroupsService) {}

  /**
   * Create a new chat group
   * POST /chatgroups
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new chat group',
    description: 'Create a new chat group for a trip. The admin (trip organizer) is automatically added as a member.',
  })
  @ApiBody({ type: CreateChatGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Chat group created successfully',
    type: ChatGroup,
  })
  async create(@Body() createChatGroupDto: CreateChatGroupDto): Promise<ChatGroup> {
    return this.chatGroupsService.create(createChatGroupDto);
  }

  /**
   * Get all chat groups
   * GET /chatgroups
   */
  @Get()
  @ApiOperation({
    summary: 'Get all chat groups',
    description: 'Returns all chat groups in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all chat groups',
    type: [ChatGroup],
  })
  async findAll(@Request() req: any): Promise<ChatGroup[]> {
    // Return chat groups that the authenticated user administers or is a member of
    const user = req?.user as Record<string, unknown> | undefined;
    const uid = user && typeof user === 'object' && 'uid' in user ? (user as any).uid : undefined;

    if (!uid) {
      // If no authenticated user found, return empty list
      return [];
    }

    return this.chatGroupsService.findForUser(uid);
  }

  /**
   * Get chat groups by trip ID
   * GET /chatgroups/trip/:tripId
   */
  @Get('trip/:tripId')
  @ApiOperation({
    summary: 'Get chat group by trip ID',
    description: 'Retrieve the chat group associated with a specific trip.',
  })
  @ApiParam({
    name: 'tripId',
    description: 'ID of the trip',
    example: 'trip_12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat groups for the trip',
    type: [ChatGroup],
  })
  @ApiNotFoundResponse({ description: 'No chat group found for this trip' })
  async findByTripId(@Param('tripId') tripId: string): Promise<ChatGroup[]> {
    return this.chatGroupsService.findByTripId(tripId);
  }

  @Get('trip/:tripId/context')
  @ApiOperation({
    summary: 'Get trip chat context',
    description: 'Returns the chat group plus trip, organizer, and participant details for the current user.',
  })
  async getTripChatContext(@Param('tripId') tripId: string, @Request() req: AuthenticatedRequest) {
    const uid = req.user?.uid || req.user?.sub;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return this.chatGroupsService.getTripChatContext(tripId, uid);
  }

  /**
   * Mark a chat group's unread count as read for the current user
   */
  @Post(':id/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark chat group as read for current user' })
  async markRead(@Param('id') id: string, @Request() req: any): Promise<ChatGroup> {
    const user = req?.user as Record<string, unknown> | undefined;
    const uid = user && typeof user === 'object' && 'uid' in user ? (user as any).uid : undefined;
    if (!uid) {
      throw new BadRequestException('Missing authenticated user');
    }

    return this.chatGroupsService.markRead(id, uid);
  }

  /**
   * Get a chat group by ID
   * GET /chatgroups/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a chat group by ID',
    description: 'Retrieve detailed information for a specific chat group.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat group ID',
    example: 'chatgroup_12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat group found',
    type: ChatGroup,
  })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async findOne(@Param('id') id: string): Promise<ChatGroup> {
    return this.chatGroupsService.findOne(id);
  }

  /**
   * Update a chat group
   * PUT /chatgroups/:id
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a chat group',
    description: 'Modify chat group details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat group ID',
    example: 'chatgroup_12345',
  })
  @ApiBody({ type: UpdateChatGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Chat group updated successfully',
    type: ChatGroup,
  })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async update(
    @Param('id') id: string,
    @Body() updateChatGroupDto: UpdateChatGroupDto,
  ): Promise<ChatGroup> {
    return this.chatGroupsService.update(id, updateChatGroupDto);
  }

  /**
   * Add a member to chat group
   * POST /chatgroups/:id/members
   */
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a member to chat group',
    description: 'Add a user to the chat group members list.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat group ID',
    example: 'chatgroup_12345',
  })
  @ApiBody({
    schema: {
      example: {
        userId: 'user_67890',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: ChatGroup,
  })
  @ApiBadRequestResponse({ description: 'User is already a member' })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ): Promise<ChatGroup> {
    return this.chatGroupsService.addMember(id, body.userId);
  }

  /**
   * Remove a member from chat group
   * DELETE /chatgroups/:id/members/:userId
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a member from chat group',
    description: 'Remove a user from the chat group members list.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat group ID',
    example: 'chatgroup_12345',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to remove',
    example: 'user_67890',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    type: ChatGroup,
  })
  @ApiBadRequestResponse({ description: 'User is not a member' })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<ChatGroup> {
    return this.chatGroupsService.removeMember(id, userId);
  }

  /**
   * Delete a chat group
   * DELETE /chatgroups/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a chat group',
    description: 'Permanently delete a chat group.',
  })
  @ApiParam({
    name: 'id',
    description: 'Chat group ID',
    example: 'chatgroup_12345',
  })
  @ApiResponse({ status: 204, description: 'Chat group deleted successfully' })
  @ApiNotFoundResponse({ description: 'Chat group not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.chatGroupsService.remove(id);
  }
}
