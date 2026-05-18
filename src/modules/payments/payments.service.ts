import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
	constructor(private readonly configService: ConfigService) {}

	createPayment(body: CreatePaymentDto) {
		const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
		const merchantSecret = this.configService.get<string>('PAYHERE_MERCHANT_SECRET');

		if (!merchantId || !merchantSecret) {
			throw new InternalServerErrorException(
				'PAYHERE_MERCHANT_ID or PAYHERE_MERCHANT_SECRET is not configured',
			);
		}

		const orderId = `ORDER_${Date.now()}`;
		const amount = Number(body.amount).toFixed(2);
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

		return {
			sandbox: true,
			merchant_id: merchantId,
			return_url: 'http://localhost:3000/payment-success',
			cancel_url: 'http://localhost:3000/payment-cancel',
			notify_url: 'https://YOUR_BACKEND/payments/notify',
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
	}
}
