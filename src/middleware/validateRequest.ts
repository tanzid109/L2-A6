import type z from "zod";
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

const formatIssues = (error: z.ZodError) =>
	error.issues
		.map((issue) => {
			const path = issue.path.join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join(", ");

const parseOrThrow = (zodSchema: z.ZodObject, payload: unknown) => {
	const result = zodSchema.safeParse(payload ?? {});

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Validation failed: ${formatIssues(result.error)}`,
		);
	}

	return result.data;
};

export const validateRequest = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		try {
			req.body = parseOrThrow(zodSchema, req.body);
		} catch (error) {
			return next(error);
		}

		next();
	});
};

export const validateQuery = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		try {
			const parsed = parseOrThrow(zodSchema, req.query);

			Object.defineProperty(req, "query", {
				value: parsed,
				writable: true,
				enumerable: true,
				configurable: true,
			});
		} catch (error) {
			return next(error);
		}

		next();
	});
};