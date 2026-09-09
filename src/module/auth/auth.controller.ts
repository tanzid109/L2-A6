import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { AuthService } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";

const registerUser = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.registerUser(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registration successful. Please verify your email.",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.verifyEmail(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email verified successfully.",
		data: result,
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.loginUser(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Login successful.",
		data: result,
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.googleLogin(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Google login successful.",
		data: result,
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.getMe(req.user!);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User information retrieved successfully.",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

	const result = await AuthService.refreshToken(refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Access token generated successfully.",
		data: result,
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.forgotPassword(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password reset OTP sent successfully.",
		data: result,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.resetPassword(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password reset successfully.",
		data: result,
	});
});

export const AuthController = {
	registerUser,
	verifyEmail,
	loginUser,
	googleLogin,
	getMe,
	refreshToken,
	forgotPassword,
	resetPassword,
};
