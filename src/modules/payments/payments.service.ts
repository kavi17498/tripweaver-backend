import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TripsService } from '../trips/trips.service';
import { Participant } from '../trips/entities/participant.entity';
import { TripPaymentMethod } from '../trips/entities/trip-payment-method.enum';
import { TripCategory } from '../trips/entities/trip-category.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrganizerEarningsSummaryEntity, TripEarningsBreakdownEntity } from './entities/organizer-earnings.entity';

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly tripsService: TripsService,
	) {}

	private classifyParticipantPaymentMethod(
		participant: Participant,
		tripPaymentMethods?: TripPaymentMethod[],
	): TripPaymentMethod | 'uncategorized' {
		if (
			participant.paymentMethod === TripPaymentMethod.PAY_ONLINE ||
			participant.paymentMethod === TripPaymentMethod.PAY_TO_GUIDE_ON_TRIP_DAY
		) {
			return participant.paymentMethod;
		}

		if ((tripPaymentMethods ?? []).length === 1) {
			return tripPaymentMethods![0];
		}

		return 'uncategorized';
	}

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
		let notifyUrlHostname: string;

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

		try {
			notifyUrlHostname = new URL(notifyUrl).hostname.toLowerCase();
		} catch {
			throw new InternalServerErrorException('PAYHERE_NOTIFY_URL must be a valid absolute URL');
		}

		if (
			notifyUrlHostname === 'localhost' ||
			notifyUrlHostname === '127.0.0.1' ||
			notifyUrlHostname === '0.0.0.0'
		) {
			throw new InternalServerErrorException(
				'PAYHERE_NOTIFY_URL must be publicly reachable; localhost cannot receive PayHere callbacks',
			);
		}

		const amountNumber = Number(body.amount);
		if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
			throw new BadRequestException('Invalid amount. Amount must be a positive number.');
		}

		const firstName = body.first_name.trim();
		const lastName = body.last_name.trim();
		const email = body.email.trim();
		const phone = body.phone.trim();

		if (!firstName || !lastName || !email || !phone) {
			throw new BadRequestException(
				'Customer details must not be empty or whitespace-only.',
			);
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
			first_name: firstName,
			last_name: lastName,
			email,
			phone,
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

	async getOrganizerEarnings(organizerId: string): Promise<OrganizerEarningsSummaryEntity> {
		const trips = await this.tripsService.findByOrganizer(organizerId);

		const tripBreakdowns: TripEarningsBreakdownEntity[] = trips.map((trip) => {
			const participants = Array.isArray((trip as any).participants)
				? (((trip as any).participants as Participant[]).filter((p) => !p.status || p.status === 'accepted'))
				: [];
			const pricePerParticipant = Number((trip as any).price ?? 0);



			let onlineParticipantCount = 0;
			let payToGuideParticipantCount = 0;
			let uncategorizedParticipantCount = 0;
			let onlinePickupEarned = 0;
			let payToGuidePickupEarned = 0;
			let uncategorizedPickupEarned = 0;

			for (const participant of participants) {
				const method = this.classifyParticipantPaymentMethod(
					participant,
					(trip as any).paymentMethods as TripPaymentMethod[] | undefined,
				);
				const pPickupCost = Number(participant.pickupCost ?? 0);

				if (method === TripPaymentMethod.PAY_ONLINE) {
					onlineParticipantCount += 1;
					onlinePickupEarned += pPickupCost;
					continue;
				}

				if (method === TripPaymentMethod.PAY_TO_GUIDE_ON_TRIP_DAY) {
					payToGuideParticipantCount += 1;
					payToGuidePickupEarned += pPickupCost;
					continue;
				}

				uncategorizedParticipantCount += 1;
				uncategorizedPickupEarned += pPickupCost;
			}

			let onlineBaseEarned = 0;
			let payToGuideBaseEarned = 0;
			let uncategorizedBaseEarned = 0;

			const isPrivate = (trip as any).tripCategory === TripCategory.PRIVATE_TRIP;
			if (isPrivate) {
				if (onlineParticipantCount > 0) {
					onlineBaseEarned = pricePerParticipant;
				} else if (payToGuideParticipantCount > 0) {
					payToGuideBaseEarned = pricePerParticipant;
				} else if (uncategorizedParticipantCount > 0) {
					uncategorizedBaseEarned = pricePerParticipant;
				}
			} else {
				onlineBaseEarned = onlineParticipantCount * pricePerParticipant;
				payToGuideBaseEarned = payToGuideParticipantCount * pricePerParticipant;
				uncategorizedBaseEarned = uncategorizedParticipantCount * pricePerParticipant;
			}

			const onlineEarned = onlineBaseEarned + onlinePickupEarned;
			const payToGuideEarned = payToGuideBaseEarned + payToGuidePickupEarned;
			const uncategorizedEarned = uncategorizedBaseEarned + uncategorizedPickupEarned;
			const totalEarned = onlineEarned + payToGuideEarned + uncategorizedEarned;
			const pickupEarned = onlinePickupEarned + payToGuidePickupEarned + uncategorizedPickupEarned;
			const baseTripEarned = totalEarned - pickupEarned;

			return {
				tripId: String((trip as any).id ?? ''),
				tripName: String((trip as any).tripName ?? 'Untitled trip'),
				startDate: String((trip as any).startDate ?? ''),
				endDate: String((trip as any).endDate ?? ''),
				status: String((trip as any).status ?? 'draft'),
				participantCount: participants.length,
				onlineParticipantCount,
				payToGuideParticipantCount,
				totalEarned,
				onlineEarned,
				payToGuideEarned,
				uncategorizedEarned,
				pickupEarned,
				baseTripEarned,
			};
		});

		const totalEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.totalEarned, 0);
		const onlineEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.onlineEarned, 0);
		const payToGuideEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.payToGuideEarned, 0);
		const uncategorizedEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.uncategorizedEarned, 0);
		const totalPickupEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.pickupEarned, 0);
		const totalBaseTripEarned = tripBreakdowns.reduce((sum, trip) => sum + trip.baseTripEarned, 0);

		tripBreakdowns.sort((left, right) => {
			if (left.totalEarned !== right.totalEarned) {
				return right.totalEarned - left.totalEarned;
			}

			return right.startDate.localeCompare(left.startDate);
		});

		return {
			totalEarned,
			onlineEarned,
			payToGuideEarned,
			uncategorizedEarned,
			totalPickupEarned,
			totalBaseTripEarned,
			tripsCount: tripBreakdowns.length,
			trips: tripBreakdowns,
		};
	}
}
