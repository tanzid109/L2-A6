import { z } from "zod";

export const createReviewSchema = z.object({
	bookingId: z.string().uuid(),
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(1000).optional(),
});

export const updateReviewSchema = z.object({
	rating: z.number().int().min(1).max(5).optional(),
	comment: z.string().max(1000).optional(),
});

export const reviewQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});
