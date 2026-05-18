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
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto';
import { User } from './entities/user.entity';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
  };
};

@ApiTags('users')
@ApiSecurity('firebase-token')
@ApiBadRequestResponse({ description: 'Invalid request body or validation failed' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid Firebase token' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getRequesterIdentity(request: AuthenticatedRequest): {
    uid: string;
    role?: string;
  } {
    const uid = request.user?.uid || request.user?.sub;
    const role = request.user?.role;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return { uid, role };
  }

  private assertSelfOrAdmin(
    request: AuthenticatedRequest,
    targetUserId: string,
  ): void {
    const { uid, role } = this.getRequesterIdentity(request);
    const isAdmin = role === 'admin' || role === 'superadmin';

    if (!isAdmin && uid !== targetUserId) {
      throw new ForbiddenException(
        'You can only access your own user data unless you are admin or superadmin',
      );
    }
  }

  private assertAdminOnly(request: AuthenticatedRequest): void {
    const { role } = this.getRequesterIdentity(request);

    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }
  }

  /**
   * Create a new user
   * POST /users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account with personal information and address details. All users are created with isVerified set to false by default.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
    example: {
      id: 'user_12345',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
        dateOfBirth: '1990-05-20',
        gender: 'male',
      phone: '+1234567890',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      isVerified: false,
      createdAt: '2026-03-20T10:30:00Z',
      updatedAt: '2026-03-20T10:30:00Z',
    },
  })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Get all users
   * GET /users
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all registered users in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users retrieved successfully',
    type: [User],
  })
  async findAll(@Req() request: AuthenticatedRequest): Promise<User[]> {
    this.assertAdminOnly(request);
    return this.usersService.findAll();
  }

  /**
   * Get verified users
   * GET /users/verified
   */
  @Get('verified')
  @ApiOperation({
    summary: 'Get all verified users',
    description: 'Retrieve a list of all users who have been verified (isVerified = true).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of verified users',
    type: [User],
  })
  async findVerified(@Req() request: AuthenticatedRequest): Promise<User[]> {
    this.assertAdminOnly(request);
    return this.usersService.findVerified();
  }

  /**
   * Check current authenticated user role
   * GET /users/checkuserrole
   */
  @Get('checkuserrole')
  @ApiOperation({
    summary: 'Check current user role',
    description:
      'Returns only the role from Firebase custom claims for the authenticated user. Returns null when role is not set.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user role returned successfully',
    schema: {
      example: {
        role: 'superadmin',
      },
    },
  })
  async checkUserRole(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ role: string | null }> {
    const uid = request.user?.uid || request.user?.sub;

    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return this.usersService.getCurrentUserRole(uid);
  }

  /**
   * Get a user by ID
   * GET /users/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'Retrieve detailed information for a specific user by their user ID.',
  })
  @ApiParam({ name: 'id', description: 'Unique user identifier', example: 'user_12345' })
  @ApiResponse({
    status: 200,
    description: 'User found and returned',
    type: User,
  })
  @ApiNotFoundResponse({ description: 'User with specified ID not found' })
  async findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<User> {
    this.assertSelfOrAdmin(request, id);
    return this.usersService.findOne(id);
  }

  /**
   * Update a user
   * PUT /users/:id
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Update user information. All fields are optional - only provide fields you want to modify.',
  })
  @ApiParam({ name: 'id', description: 'Unique user identifier', example: 'user_12345' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email already exists for another user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<User> {
    this.assertSelfOrAdmin(request, id);
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Delete a user
   * DELETE /users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Permanently delete a user account and all associated data.',
  })
  @ApiParam({ name: 'id', description: 'Unique user identifier', example: 'user_12345' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    this.assertSelfOrAdmin(request, id);
    return this.usersService.remove(id);
  }

  /**
   * Set superadmin role for the authenticated user
   * POST /users/set-custom-claims/superadmin
   */
  @Post('set-custom-claims/superadmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set role=superadmin from current token',
    description:
      'Sets Firebase custom claim role=superadmin for the authenticated user extracted from the bearer token. Client must refresh token after success.',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom claim updated successfully',
    schema: {
      example: {
        status: 'success',
      },
    },
  })
  async setCustomClaimsSuperadmin(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ status: 'success' }> {
    const { uid } = this.getRequesterIdentity(request);

    return this.usersService.setSelfAsSuperadmin(uid);
  }

  /**
   * Assign roles to users (superadmin only)
   * POST /users/assign-roles
   */
  @Post('assign-roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign role to one or multiple users',
    description:
      'Superadmin users can assign roles to other users. Current user is skipped if included. Accepts single userId (string) or multiple userIds (array) with a role name.',
  })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role assignment completed',
    schema: {
      example: {
        status: 'success',
        assigned: ['user_123', 'user_456'],
        failed: [
          {
            userId: 'user_789',
            reason: 'User not found in Firebase Auth',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request: invalid userIds or role format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async assignRoles(
    @Req() request: AuthenticatedRequest,
    @Body() assignRoleDto: AssignRoleDto,
  ): Promise<{
    status: 'success';
    assigned: string[];
    failed: Array<{ userId: string; reason: string }>;
  }> {
    const { uid: currentUid } = this.getRequesterIdentity(request);

    this.assertAdminOnly(request);

    const { role } = this.getRequesterIdentity(request);
    if (role !== 'superadmin') {
      throw new ForbiddenException('Only superadmin users can assign roles to other users');
    }

    return this.usersService.assignRolesToUsers(
      currentUid,
      assignRoleDto.userIds?.length ? assignRoleDto.userIds : assignRoleDto.userId,
      assignRoleDto.role,
    );
  }
}
