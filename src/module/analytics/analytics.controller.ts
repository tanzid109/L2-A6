import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await AnalyticsServices.getAdminAnalytics();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin analytics retrieved successfully",
		data: result,
	});
});

const getCustomerAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await AnalyticsServices.getCustomerAnalytics(req.user!);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Customer analytics retrieved successfully",
		data: result,
	});
});

const getTechnicianAnalytics = catchAsync(
	async (req: Request, res: Response) => {
		const result = await AnalyticsServices.getTechnicianAnalytics(req.user!);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Technician analytics retrieved successfully",
			data: result,
		});
	},
);

export const AnalyticsController = {
	getAdminAnalytics,
	getCustomerAnalytics,
	getTechnicianAnalytics,
};
