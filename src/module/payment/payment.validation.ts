import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
	bookingId: z.string().uuid(),
});

export const paymentQuerySchema = z.object({
	status: z
		.enum(["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"])
		.optional(),

	page: z.coerce.number().int().positive().default(1),

	limit: z.coerce.number().int().positive().max(100).default(10),
});
