import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/public.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrganizerEarningsSummaryEntity } from './entities/organizer-earnings.entity';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
  };
};

@ApiTags('payments')
@ApiSecurity('firebase-token')
@Controller('payments')
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	private getUserId(request: AuthenticatedRequest) {
		const userId = request.user?.uid || request.user?.sub;
		if (!userId) {
			throw new UnauthorizedException('Unable to extract user identity from token');
		}

		return userId;
	}

	@Post('create')
	@Public()
	@ApiOperation({
		summary: 'Create PayHere payment payload',
		description:
			'Generates a PayHere payment object with server-side hash for secure client checkout.',
	})
	@ApiBody({ type: CreatePaymentDto })
	@ApiResponse({
		status: 201,
		description: 'Payment payload generated successfully',
	})
	@UsePipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	)
	createPayment(@Body() body: CreatePaymentDto) {
		return this.paymentsService.createPayment(body);
	}

	@Get('earnings/organizer')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get organizer earnings summary',
		description:
			'Returns total earnings and per-trip earnings split by Pay Online and Pay to Guide on Trip Day for trips organized by the authenticated user.',
	})
	@ApiOkResponse({ type: OrganizerEarningsSummaryEntity })
	getOrganizerEarnings(@Req() request: AuthenticatedRequest): Promise<OrganizerEarningsSummaryEntity> {
		const userId = this.getUserId(request);
		return this.paymentsService.getOrganizerEarnings(userId);
	}
}
