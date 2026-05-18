import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name);

	constructor(private readonly configService: ConfigService) {}

	private toBoolean(value: string | undefined, defaultValue = true): boolean {
		if (value === undefined) return defaultValue;
		return value.toLowerCase() === 'true';
	}

	createPayment(body: CreatePaymentDto) {
		const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID')?.trim();
		const merchantSecret = this.configService
			.get<string>('PAYHERE_MERCHANT_SECRET')
			?.trim();
		const notifyUrl = this.configService.get<string>('PAYHERE_NOTIFY_URL')?.trim();
		const returnUrl = this.configService.get<string>('PAYHERE_RETURN_URL')?.trim();
		const cancelUrl = this.configService.get<string>('PAYHERE_CANCEL_URL')?.trim();
		const sandbox = this.toBoolean(
			this.configService.get<string>('PAYHERE_SANDBOX')?.trim(),
			true,
		);

		if (!merchantId || !merchantSecret) {
			throw new InternalServerErrorException(
				'PAYHERE_MERCHANT_ID or PAYHERE_MERCHANT_SECRET is not configured',
			);
		}

		if (!notifyUrl || !returnUrl || !cancelUrl) {
			throw new InternalServerErrorException(
				'PAYHERE_NOTIFY_URL, PAYHERE_RETURN_URL and PAYHERE_CANCEL_URL must be configured',
			);
		}

		const amountNumber = Number(body.amount);
		if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
			throw new BadRequestException('Invalid amount. Amount must be a positive number.');
		}

		const orderId = `ORDER_${Date.now()}`;
		const amount = amountNumber.toFixed(2);
		const currency = 'LKR';

		const secretHash = crypto
			.createHash('md5')
			.update(merchantSecret)
			.digest('hex')
			.toUpperCase();

		const hash = crypto
			.createHash('md5')
			.update(merchantId + orderId + amount + currency + secretHash)
			.digest('hex')
			.toUpperCase();

		const paymentObject = {
			sandbox,
			merchant_id: merchantId,
			return_url: returnUrl,
			cancel_url: cancelUrl,
			notify_url: notifyUrl,
			order_id: orderId,
			items: 'Trip Booking',
			amount,
			currency,
			first_name: body.first_name,
			last_name: body.last_name,
			email: body.email,
			phone: body.phone,
			address: 'Sri Lanka',
			city: 'Colombo',
			country: 'Sri Lanka',
			hash,
		};

		const hasInvalidField = Object.entries(paymentObject).some(
			([, value]) => value === undefined || value === null || value === '',
		);

		if (hasInvalidField) {
			throw new InternalServerErrorException(
				'Generated payment object contains invalid empty fields',
			);
		}

		this.logger.log(`PayHere payment object: ${JSON.stringify(paymentObject)}`);

		return paymentObject;
	}
}
