import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ReviewService } from "./review.service";
import httpStatus from "http-status";

const createReview = catchAsync(async (req: Request, res: Response) => {
	const customerId = req.user!.userId;

	const result = await ReviewService.createReview(customerId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Review created successfully",
		data: result,
	});
});

const getTechnicianReviews = catchAsync(async (req: Request, res: Response) => {
	const { technicianId } = req.params;

	const result = await ReviewService.getTechnicianReviews(
		technicianId as string,
		req.query as unknown as {
			page: number;
			limit: number;
		},
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician reviews retrieved successfully",
		data: result,
	});
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await ReviewService.getReviewById(id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Review retrieved successfully",
		data: result,
	});
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
	const customerId = req.user!.userId;
	const { id } = req.params;

	const result = await ReviewService.updateReview(
		id as string,
		customerId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Review updated successfully",
		data: result,
	});
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
	const customerId = req.user!.userId;
	const { id } = req.params;

	await ReviewService.deleteReview(id as string, customerId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Review deleted successfully",
		data: null,
	});
});

export const ReviewController = {
	createReview,
	getTechnicianReviews,
	getReviewById,
	updateReview,
	deleteReview,
};