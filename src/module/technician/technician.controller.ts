import { Request, Response } from "express";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

import { TechnicianService } from "./technician.service";
import httpStatus from "http-status";

const createTechnicianProfile = catchAsync(
	async (req: Request, res: Response) => {
		const result = await TechnicianService.createTechnicianProfile(
			req.user!.userId,
			req.body,
			req.file,
		);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Technician profile created successfully",
			data: result,
		});
	},
);

const getMyTechnicianProfile = catchAsync(
	async (req: Request, res: Response) => {
		const result = await TechnicianService.getMyTechnicianProfile(
			req.user!.userId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Technician profile retrieved successfully",
			data: result,
		});
	},
);

const updateMyTechnicianProfile = catchAsync(
	async (req: Request, res: Response) => {
		const result = await TechnicianService.updateMyTechnicianProfile(
			req.user!?.userId,
			req.body,
			req.file,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Technician profile updated successfully",
			data: result,
		});
	},
);

const getAllTechnicians = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.getAllTechnicians(req.query as any);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technicians retrieved successfully",
		data: result,
	});
});

const getTechnicianById = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.getTechnicianById(
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician retrieved successfully",
		data: result,
	});
});

const toggleAvailability = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.toggleAvailability(req.user!?.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician availability updated successfully",
		data: result,
	});
});

export const TechnicianController = {
	createTechnicianProfile,
	getMyTechnicianProfile,
	updateMyTechnicianProfile,
	getAllTechnicians,
	getTechnicianById,
	toggleAvailability,
};
