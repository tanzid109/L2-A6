import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { BookingService } from "./booking.service";
import httpStatus from "http-status";

const createBooking = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.createBooking(req.user!.userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Booking created successfully",
		data: result,
	});
});

const getCustomerBookings = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.getCustomerBookings(
		req.user!.userId,
		req.query as any,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Customer bookings retrieved successfully",
		data: result,
	});
});

const getTechnicianBookings = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.getTechnicianBookings(
		req.user!.userId,
		req.query as any,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician bookings retrieved successfully",
		data: result,
	});
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.getBookingById(
		req.params.id as string,
		req.user!.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Booking retrieved successfully",
		data: result,
	});
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.updateBookingStatus(
		req.user!.userId,
		req.params.id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Booking status updated successfully",
		data: result,
	});
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.cancelBooking(
		req.user!.userId,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Booking cancelled successfully",
		data: result,
	});
});

export const BookingController = {
	createBooking,
	getCustomerBookings,
	getTechnicianBookings,
	getBookingById,
	updateBookingStatus,
	cancelBooking,
};