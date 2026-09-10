import { z } from "zod";

export const createBookingSchema = z.object({
	technicianId: z.string().uuid(),
	serviceId: z.string().uuid(),
	availabilityId: z.string().uuid(),
	address: z.string().min(10).max(500),
	problemDescription: z.string().min(10).max(1000),
});

export const updateBookingStatusSchema = z.object({
	status: z.enum([
		"ACCEPTED",
		"REJECTED",
		"IN_PROGRESS",
		"COMPLETED",
		"CANCELLED",
	]),
});

export const bookingQuerySchema = z.object({
	status: z
		.enum([
			"PENDING",
			"ACCEPTED",
			"REJECTED",
			"IN_PROGRESS",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),

	page: z.coerce.number().int().positive().default(1),

	limit: z.coerce.number().int().positive().max(100).default(10),
});
