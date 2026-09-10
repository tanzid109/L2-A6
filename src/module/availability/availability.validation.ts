import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAvailabilitySchema = z.object({
	date: z.string().datetime(),
	startTime: z.string().regex(timeRegex, "Invalid start time. Use HH:MM"),
	endTime: z.string().regex(timeRegex, "Invalid end time. Use HH:MM"),
});

export const updateAvailabilitySchema = z.object({
	date: z.string().datetime().optional(),
	startTime: z
		.string()
		.regex(timeRegex, "Invalid start time. Use HH:MM")
		.optional(),
	endTime: z
		.string()
		.regex(timeRegex, "Invalid end time. Use HH:MM")
		.optional(),
});

export const availabilityQuerySchema = z.object({
	date: z.string().optional(),
	isBooked: z.enum(["true", "false"]).optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});
