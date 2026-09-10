import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AvailabilityService } from "./availability.service";
import httpStatus from "http-status";

const createAvailability = catchAsync(async (req: Request, res: Response) => {
	const result = await AvailabilityService.createAvailability(
		req.user!.userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Availability created successfully",
		data: result,
	});
});

const getMyAvailability = catchAsync(async (req: Request, res: Response) => {
	const result = await AvailabilityService.getMyAvailability(
		req.user!.userId,
		req.query as any,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Availability retrieved successfully",
		data: result,
	});
});

const getTechnicianAvailability = catchAsync(
	async (req: Request, res: Response) => {
		const result = await AvailabilityService.getTechnicianAvailability(
			req.params.technicianId as string,
			req.query as any,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Technician availability retrieved successfully",
			data: result,
		});
	},
);

const updateAvailability = catchAsync(async (req: Request, res: Response) => {
	const result = await AvailabilityService.updateAvailability(
		req.user!.userId,
		req.params.id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Availability updated successfully",
		data: result,
	});
});

const deleteAvailability = catchAsync(async (req: Request, res: Response) => {
	await AvailabilityService.deleteAvailability(
		req.user!.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Availability deleted successfully",
		data: null,
	});
});

export const AvailabilityController = {
	createAvailability,
	getMyAvailability,
	getTechnicianAvailability,
	updateAvailability,
	deleteAvailability,
};