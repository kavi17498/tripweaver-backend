import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrganizedTripReviewSummaryEntity } from './entities/organized-trip-review-summary.entity';
import { ReviewEntity } from './entities/review.entity';
import { TripReviewSummaryEntity } from './entities/trip-review-summary.entity';
import { ReviewsService } from './reviews.service';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
  };
};

@ApiTags('reviews')
@ApiSecurity('firebase-token')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  private getUserId(request: AuthenticatedRequest) {
    const userId = request.user?.uid || request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return userId;
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current user review dashboard',
    description: 'Returns all participated trips with review state, existing reviews, and reminder status.',
  })
  @ApiOkResponse({ type: [TripReviewSummaryEntity] })
  async getMine(@Req() request: AuthenticatedRequest): Promise<TripReviewSummaryEntity[]> {
    const userId = this.getUserId(request);
    return this.reviewsService.findParticipantReviewSummaries(userId);
  }

  @Get('organized')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get review summaries for trips organized by the current user',
    description: 'Returns all trips organized by the authenticated user, including expired trips and their reviews.',
  })
  @ApiOkResponse({ type: [OrganizedTripReviewSummaryEntity] })
  async getOrganized(@Req() request: AuthenticatedRequest): Promise<OrganizedTripReviewSummaryEntity[]> {
    const userId = this.getUserId(request);
    return this.reviewsService.findOrganizedTripReviewSummaries(userId);
  }

  @Get('trip/:tripId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reviews for a trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID', example: 'trip_12345' })
  @ApiOkResponse({ type: [ReviewEntity] })
  async getByTrip(@Param('tripId') tripId: string): Promise<ReviewEntity[]> {
    return this.reviewsService.findByTripId(tripId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a trip review' })
  @ApiBody({ type: CreateReviewDto })
  @ApiOkResponse({ type: ReviewEntity })
  async submitReview(
    @Body() dto: CreateReviewDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReviewEntity> {
    const userId = this.getUserId(request);
    return this.reviewsService.submitReview(userId, dto);
  }
}