import type z from "zod";
import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		try {
			const payload = req.body ?? {};
			const result = zodSchema.safeParse(payload);

			if (!result.success) {
				console.log(result.error);
				console.log(result.error.issues);
				throw new Error(result.error.message);
			}

			req.body = result.data;

			next();
		} catch (error) {
			next(error);
		}
	});
};
