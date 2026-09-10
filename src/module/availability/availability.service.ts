import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

import {
	AvailabilityQuery,
	CreateAvailabilityPayload,
	UpdateAvailabilityPayload,
} from "./availability.interface";

import { parseISO, isValid, startOfDay, isBefore } from "date-fns";

const timeToMinutes = (time: string): number => {
	const [hours, minutes] = time.split(":").map(Number);

	return hours * 60 + minutes;
};

const normalizeDate = (date: string): Date => {
	const parsedDate = parseISO(date);

	if (!isValid(parsedDate)) {
		throw new AppError(400, "Invalid date");
	}

	return startOfDay(parsedDate);
};

const checkTimeRange = (startTime: string, endTime: string): void => {
	const start = timeToMinutes(startTime);
	const end = timeToMinutes(endTime);

	if (start >= end) {
		throw new AppError(400, "Start time must be earlier than end time");
	}
};

const checkPastDate = (date: Date): void => {
	const today = startOfDay(new Date());
	const selectedDate = startOfDay(date);

	if (isBefore(selectedDate, today)) {
		throw new AppError(400, "Availability date cannot be in the past");
	}
};

const createAvailability = async (
	technicianUserId: string,
	payload: CreateAvailabilityPayload,
) => {
	const { date, startTime, endTime } = payload;

	checkTimeRange(startTime, endTime);

	const parsedDate = normalizeDate(date);

	checkPastDate(parsedDate);

	const technician = await prisma.technicianProfile.findUnique({
		where: {
			userId: technicianUserId,
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const existingSlots = await prisma.availability.findMany({
		where: {
			technicianId: technician.id,
			date: parsedDate,
		},
	});

	const newStart = timeToMinutes(startTime);
	const newEnd = timeToMinutes(endTime);

	const hasOverlap = existingSlots.some((slot) => {
		const existingStart = timeToMinutes(slot.startTime);

		const existingEnd = timeToMinutes(slot.endTime);

		return newStart < existingEnd && newEnd > existingStart;
	});

	if (hasOverlap) {
		throw new AppError(
			httpStatus.CONFLICT,
			"This time slot overlaps with an existing availability",
		);
	}

	const availability = await prisma.availability.create({
		data: {
			technicianId: technician.id,
			date: parsedDate,
			startTime,
			endTime,
		},

		include: {
			technician: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
							avatar: true,
						},
					},
				},
			},
		},
	});

	return availability;
};

const getMyAvailability = async (
	technicianUserId: string,
	query: AvailabilityQuery,
) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: { userId: technicianUserId },
		select: { id: true },
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Prisma.AvailabilityWhereInput = {
		technicianId: technician.id,
	};

	if (query.date) {
		where.date = normalizeDate(query.date);
	}

	if (query.isBooked !== undefined) {
		where.isBooked = String(query.isBooked) === "true";
	}

	const [slots, total] = await prisma.$transaction([
		prisma.availability.findMany({
			where,
			skip,
			take: limit,
			orderBy: [{ date: "asc" }, { startTime: "asc" }],
		}),
		prisma.availability.count({ where }),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: slots,
	};
};

const getTechnicianAvailability = async (
	technicianId: string,
	query: AvailabilityQuery,
) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: { id: technicianId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
				},
			},
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	}

	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Prisma.AvailabilityWhereInput = {
		technicianId,
	};

	if (query.date) {
		where.date = normalizeDate(query.date);
	}

	if (query.isBooked === undefined) {
		where.isBooked = false;
	} else {
		where.isBooked = String(query.isBooked) === "true";
	}

	const [slots, total] = await prisma.$transaction([
		prisma.availability.findMany({
			where,
			skip,
			take: limit,
			orderBy: [{ date: "asc" }, { startTime: "asc" }],
		}),
		prisma.availability.count({ where }),
	]);

	return {
		technician,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: slots,
	};
};

const updateAvailability = async (
	technicianUserId: string,
	availabilityId: string,
	payload: UpdateAvailabilityPayload,
) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: {
			userId: technicianUserId,
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const existing = await prisma.availability.findUnique({
		where: {
			id: availabilityId,
		},
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Availability slot not found");
	}

	if (existing.technicianId !== technician.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update your own availability",
		);
	}

	if (existing.isBooked) {
		throw new AppError(400, "Booked availability cannot be updated");
	}

	const newDate = payload.date ? normalizeDate(payload.date) : existing.date;

	const newStartTime = payload.startTime ?? existing.startTime;

	const newEndTime = payload.endTime ?? existing.endTime;

	checkTimeRange(newStartTime, newEndTime);

	checkPastDate(newDate);

	const otherSlots = await prisma.availability.findMany({
		where: {
			technicianId: technician.id,

			date: newDate,

			id: {
				not: availabilityId,
			},
		},
	});

	const newStart = timeToMinutes(newStartTime);

	const newEnd = timeToMinutes(newEndTime);

	const hasOverlap = otherSlots.some((slot) => {
		const existingStart = timeToMinutes(slot.startTime);

		const existingEnd = timeToMinutes(slot.endTime);

		return newStart < existingEnd && newEnd > existingStart;
	});

	if (hasOverlap) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Updated time slot overlaps with an existing availability",
		);
	}

	return prisma.availability.update({
		where: {
			id: availabilityId,
		},

		data: {
			date: newDate,
			startTime: newStartTime,
			endTime: newEndTime,
		},
	});
};

const deleteAvailability = async (
	technicianUserId: string,
	availabilityId: string,
) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: {
			userId: technicianUserId,
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const existing = await prisma.availability.findUnique({
		where: {
			id: availabilityId,
		},
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Availability slot not found");
	}

	if (existing.technicianId !== technician.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only delete your own availability",
		);
	}

	if (existing.isBooked) {
		throw new AppError(400, "Booked availability cannot be deleted");
	}

	await prisma.availability.delete({
		where: {
			id: availabilityId,
		},
	});

	return null;
};

export const AvailabilityService = {
	createAvailability,
	getMyAvailability,
	getTechnicianAvailability,
	updateAvailability,
	deleteAvailability,
};
