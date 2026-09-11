import Stripe from "stripe";
import {
	BookingStatus,
	PaymentMethod,
	PaymentStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { Prisma } from "../../../generated/prisma/client";
import httpStatus from "http-status";
import { stripe } from "../../lib/stripe";
import { PaymentQuery } from "./payment.interface";
import config from "../../config";

const createCheckoutSession = async (customerId: string, bookingId: string) => {
	const booking = await prisma.booking.findUnique({
		where: {
			id: bookingId,
		},

		include: {
			customer: true,
			service: true,
			technician: {
				include: {
					user: true,
				},
			},
			availability: true,
			payment: true,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	if (booking.customerId !== customerId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only pay for your own booking",
		);
	}

	if (booking.status !== BookingStatus.ACCEPTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Payment is only available for accepted bookings",
		);
	}

	if (booking.payment?.status === PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This booking has already been paid",
		);
	}

	const amount = Number(booking.totalAmount);

	if (!Number.isFinite(amount) || amount <= 0) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid booking amount");
	}

	/*
	 * Stripe amount is in the smallest currency unit (cents for USD).
	 */
	const stripeAmount = Math.round(amount * 100);

	const session = await stripe.checkout.sessions.create({
		mode: "payment",

		payment_method_types: ["card"],

		customer_email: booking.customer.email,

		line_items: [
			{
				price_data: {
					currency: "usd",

					product_data: {
						name: booking.service.title,

						description: `Field service booking with ${booking.technician.user.name}`,
					},

					unit_amount: stripeAmount,
				},

				quantity: 1,
			},
		],

		metadata: {
			bookingId: booking.id,
			customerId: customerId,
		},

		client_reference_id: booking.id,

		success_url: `${config.frontend_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

		cancel_url: `${config.frontend_url}/payment/cancel?bookingId=${booking.id}`,
	});

	/*
	 * Store the checkouts session id as the transactionId so the webhook
	 * can always find the payment record, even without metadata.
	 */
	if (booking.payment) {
		await prisma.payment.update({
			where: {
				id: booking.payment.id,
			},

			data: {
				transactionId: session.id,
				method: PaymentMethod.STRIPE,
				status: PaymentStatus.PENDING,
				gatewayResponse: {
					checkoutSessionId: session.id,
				},
			},
		});
	} else {
		await prisma.payment.create({
			data: {
				bookingId: booking.id,

				amount: booking.totalAmount,

				transactionId: session.id,

				method: PaymentMethod.STRIPE,

				status: PaymentStatus.PENDING,

				gatewayResponse: {
					checkoutSessionId: session.id,
				},
			},
		});
	}

	return {
		checkoutUrl: session.url,
		sessionId: session.id,
		bookingId: booking.id,
		amount,
		currency: "USD",
	};
};

const completePaymentInDB = async (
	bookingId: string,
	session: Stripe.Checkout.Session,
) => {
	const booking = await prisma.booking.findUnique({
		where: {
			id: bookingId,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	const transactionId =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: session.id;

	/*
	 * Upsert keyed on the unique bookingId makes this idempotent:
	 * duplicate/delayed webhook deliveries never throw and never double-write.
	 */
	const updated = await prisma.payment.upsert({
		where: {
			bookingId,
		},
		create: {
			bookingId,
			amount: booking.totalAmount,
			method: PaymentMethod.STRIPE,
			status: PaymentStatus.PAID,
			transactionId,
			paidAt: new Date(),
			gatewayResponse: session as unknown as Prisma.InputJsonValue,
		},
		update: {
			status: PaymentStatus.PAID,
			transactionId,
			paidAt: new Date(),
			gatewayResponse: session as unknown as Prisma.InputJsonValue,
		},
	});

	return updated;
};

const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!webhookSecret) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Stripe webhook secret is not configured",
		);
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
	} catch (error) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid Stripe webhook signature",
		);
	}

	if (event.type === "checkout.session.completed") {
		const session = event.data.object as Stripe.Checkout.Session;

		let bookingId = session.metadata?.bookingId ?? session.client_reference_id;

		if (!bookingId) {
			/*
			 * Fallback: find the payment row by the stored checkout session id.
			 */
			const payment = await prisma.payment.findFirst({
				where: {
					transactionId: session.id,
				},
				select: {
					bookingId: true,
				},
			});

			bookingId = payment?.bookingId ?? null;
		}

		if (!bookingId) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Booking ID missing from Stripe session",
			);
		}

		await completePaymentInDB(bookingId, session);
	}

	if (event.type === "payment_intent.payment_failed") {
		const paymentIntent = event.data.object as Stripe.PaymentIntent;

		const bookingId = paymentIntent.metadata?.bookingId;

		if (bookingId) {
			await prisma.payment.updateMany({
				where: {
					bookingId,
				},

				data: {
					status: PaymentStatus.FAILED,

					gatewayResponse: paymentIntent as unknown as Prisma.InputJsonValue,
				},
			});
		}
	}

	return {
		received: true,
	};
};

const getCustomerPayments = async (customerId: string, query: PaymentQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const status = query.status;

	const skip = (page - 1) * limit;

	const where: Prisma.PaymentWhereInput = {
		booking: {
			customerId,
		},
	};

	if (status) {
		where.status = status;
	}

	const [payments, total] = await prisma.$transaction([
		prisma.payment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				booking: {
					include: {
						service: true,
						technician: {
							include: {
								user: {
									select: { id: true, name: true, email: true },
								},
							},
						},
					},
				},
			},
		}),
		prisma.payment.count({ where }),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: payments,
	};
};

const getPaymentById = async (paymentId: string, customerId: string) => {
	const payment = await prisma.payment.findUnique({
		where: {
			id: paymentId,
		},

		include: {
			booking: {
				include: {
					service: true,

					customer: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},

					technician: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	if (payment.booking.customerId !== customerId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to view this payment",
		);
	}

	return payment;
};

export const PaymentService = {
	createCheckoutSession,
	handleStripeWebhook,
	getCustomerPayments,
	getPaymentById,
};