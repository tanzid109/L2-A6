import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";
import httpStatus from "http-status";

const createCheckoutSession = catchAsync(
	async (req: Request, res: Response) => {
		const result = await PaymentService.createCheckoutSession(
			req.user!.userId,
			req.body.bookingId,
		);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Stripe checkout session created successfully",
			data: result,
		});
	},
);

const stripeWebhook = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const signature = req.headers["stripe-signature"];

	if (!signature) {
		return res.status(httpStatus.BAD_REQUEST).json({
			success: false,
			message: "Stripe signature is missing",
			errors: [],
		});
	}

	try {
		const result = await PaymentService.handleStripeWebhook(
			req.body,
			signature as string,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Webhook processed successfully",
			data: result,
		});
	} catch (error: any) {
		console.error(error.message);

		return res.status(error.statusCode || 500).json({
			success: false,
			message: error.message || "Webhook processing failed",
		});
	}
};

const getCustomerPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getCustomerPayments(
		req.user!.userId,
		req.query as any,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Customer payments retrieved successfully",
		data: result,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getPaymentById(
		req.params.id as string,
		req.user!.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment retrieved successfully",
		data: result,
	});
});

export const PaymentController = {
	createCheckoutSession,
	stripeWebhook,
	getCustomerPayments,
	getPaymentById,
};