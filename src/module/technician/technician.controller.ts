import { Request, Response } from "express";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

import { TechnicianService } from "./technician.service";
import httpStatus from "http-status";


const applyAsTechnician = catchAsync(async (req: Request, res: Response) => {
	const files = req.files as
		| { [fieldname: string]: Express.Multer.File[] }
		| undefined;

	const resume = files?.["resume"] ? files["resume"][0] : undefined;
	const additionalFiles = files?.["additionalFiles"] || [];

	const result = await TechnicianService.applyAsTechnician(
		req.user!.userId,
		req.body,
		resume,
		additionalFiles,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"Application submitted successfully. You will be notified by email once it is reviewed.",
		data: result,
	});
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.getMyApplication(req.user!.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application retrieved successfully",
		data: result,
	});
});

const getApplications = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.getApplications(req.query as any);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Applications retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.getApplicationById(
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application retrieved successfully",
		data: result,
	});
});

const reviewApplication = catchAsync(async (req: Request, res: Response) => {
	const result = await TechnicianService.reviewApplication(
		req.params.id as string,
		req.body,
		req.user!,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			result.profile != null
				? "Application approved. The applicant is now a technician."
				: "Application rejected.",
		data: result,
	});
});

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
	applyAsTechnician,
	getMyApplication,
	getApplications,
	getApplicationById,
	reviewApplication,
	createTechnicianProfile,
	getMyTechnicianProfile,
	updateMyTechnicianProfile,
	getAllTechnicians,
	getTechnicianById,
	toggleAvailability,
};
