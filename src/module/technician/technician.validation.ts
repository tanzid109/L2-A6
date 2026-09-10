import { z } from "zod";

export const createTechnicianProfileSchema = z.object({
	bio: z
		.string()
		.min(10, "Bio must be at least 10 characters")
		.max(500, "Bio must not exceed 500 characters")
		.optional(),

	experience: z.coerce
		.number()
		.int("Experience must be an integer")
		.min(0, "Experience cannot be negative")
		.max(50, "Experience cannot exceed 50 years"),

	specialization: z
		.string()
		.min(2, "Specialization must be at least 2 characters")
		.max(100, "Specialization must not exceed 100 characters"),

	hourlyRate: z.coerce.number().positive("Hourly rate must be greater than 0"),
});

export const updateTechnicianProfileSchema =
	createTechnicianProfileSchema.partial();

export const technicianQuerySchema = z.object({
	search: z.string().optional(),

	specialization: z.string().optional(),

	isAvailable: z.enum(["true", "false"]).optional(),

	minRate: z.coerce.number().positive().optional(),

	maxRate: z.coerce.number().positive().optional(),

	page: z.coerce.number().int().positive().default(1),

	limit: z.coerce.number().int().positive().max(100).default(10),
});