import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

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
	createPayment(@Body() body: CreatePaymentDto) {
		return this.paymentsService.createPayment(body);
	}
}
