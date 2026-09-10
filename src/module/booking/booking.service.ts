import { Prisma } from "../../../generated/prisma/client";
import { BookingStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
	BookingQuery,
	CreateBookingPayload,
	UpdateBookingStatusPayload,
} from "./booking.interface";
import httpStatus from "http-status";

const createBooking = async (
	customerId: string,
	payload: CreateBookingPayload,
) => {
	const {
		technicianId,
		serviceId,
		availabilityId,
		address,
		problemDescription,
	} = payload;

	const result = await prisma.$transaction(async (tx) => {
		const customer = await tx.user.findUnique({
			where: {
				id: customerId,
			},
		});

		if (!customer) {
			throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
		}

		const technician = await tx.technicianProfile.findUnique({
			where: {
				id: technicianId,
			},
		});

		if (!technician) {
			throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
		}

		if (!technician.isAvailable) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Technician is currently unavailable",
			);
		}

		const service = await tx.service.findUnique({
			where: {
				id: serviceId,
			},
		});

		if (!service) {
			throw new AppError(httpStatus.NOT_FOUND, "Service not found");
		}

		if (!service.isActive) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This service is currently inactive",
			);
		}

		const availability = await tx.availability.findUnique({
			where: {
				id: availabilityId,
			},
		});

		if (!availability) {
			throw new AppError(httpStatus.NOT_FOUND, "Availability slot not found");
		}

		if (availability.technicianId !== technicianId) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Selected availability does not belong to this technician",
			);
		}

		if (availability.isBooked) {
			throw new AppError(
				httpStatus.CONFLICT,
				"This availability slot is already booked",
			);
		}

		const existingBooking = await tx.booking.findFirst({
			where: {
				availabilityId,
				status: {
					notIn: [BookingStatus.REJECTED, BookingStatus.CANCELLED],
				},
			},
		});

		if (existingBooking) {
			throw new AppError(
				httpStatus.CONFLICT,
				"This availability slot has already been requested",
			);
		}

		const booking = await tx.booking.create({
			data: {
				customerId,
				technicianId,
				serviceId,
				availabilityId,
				address,
				problemDescription,
				scheduledAt: availability.date,
				totalAmount: service.price,
				status: BookingStatus.PENDING,
			},

			include: {
				service: true,

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

				customer: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
					},
				},

				availability: true,
			},
		});

		await tx.availability.update({
			where: {
				id: availabilityId,
			},
			data: {
				isBooked: true,
			},
		});

		return booking;
	});

	return result;
};

const getCustomerBookings = async (customerId: string, query: BookingQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Prisma.BookingWhereInput = {
		customerId,
	};

	if (query.status) {
		where.status = query.status;
	}

	const [bookings, total] = await prisma.$transaction([
		prisma.booking.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				createdAt: "desc",
			},
			include: {
				service: true,
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
				availability: true,
				payment: true,
				review: true,
			},
		}),
		prisma.booking.count({
			where,
		}),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: bookings,
	};
};

const getTechnicianBookings = async (userId: string, query: BookingQuery) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: { userId },
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Number(query.limit) || 10);
	const skip = (page - 1) * limit;

	const where: Prisma.BookingWhereInput = {
		technicianId: technician.id,
		...(query.status && { status: query.status }),
	};

	const [bookings, total] = await prisma.$transaction([
		prisma.booking.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				customer: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						avatar: true,
					},
				},
				service: true,
				availability: true,
				payment: true,
				review: true,
			},
		}),
		prisma.booking.count({ where }),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: bookings,
	};
};

const getBookingById = async (bookingId: string, userId: string) => {
	const booking = await prisma.booking.findUnique({
		where: {
			id: bookingId,
		},

		include: {
			customer: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
				},
			},

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

			service: true,

			availability: true,

			payment: true,

			review: true,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	const isCustomer = booking.customerId === userId;

	const technician = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
	});

	const isTechnician = technician?.id === booking.technicianId;

	if (!isCustomer && !isTechnician) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to view this booking",
		);
	}

	return booking;
};

const updateBookingStatus = async (
	userId: string,
	bookingId: string,
	payload: UpdateBookingStatusPayload,
) => {
	const { status } = payload;

	const booking = await prisma.booking.findUnique({
		where: {
			id: bookingId,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	const technician = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
	});

	if (!technician) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only technician can update booking status",
		);
	}

	if (booking.technicianId !== technician.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update your own bookings",
		);
	}

	const currentStatus = booking.status;

	const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
		PENDING: [
			BookingStatus.ACCEPTED,
			BookingStatus.REJECTED,
			BookingStatus.CANCELLED,
		],

		ACCEPTED: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],

		IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],

		COMPLETED: [],

		REJECTED: [],

		CANCELLED: [],
	};

	if (!allowedTransitions[currentStatus].includes(status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot change booking status from ${currentStatus} to ${status}`,
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedBooking = await tx.booking.update({
			where: {
				id: bookingId,
			},

			data: {
				status,
			},

			include: {
				customer: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
					},
				},

				service: true,

				technician: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},

				availability: true,
			},
		});

		if (
			status === BookingStatus.REJECTED ||
			status === BookingStatus.CANCELLED
		) {
			await tx.availability.update({
				where: {
					id: booking.availabilityId,
				},

				data: {
					isBooked: false,
				},
			});
		}

		return updatedBooking;
	});

	return result;
};

const cancelBooking = async (customerId: string, bookingId: string) => {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		select: {
			id: true,
			customerId: true,
			status: true,
			availabilityId: true,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	if (booking.customerId !== customerId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only cancel your own bookings",
		);
	}

	const allowableStatuses: BookingStatus[] = [
		BookingStatus.PENDING,
		BookingStatus.ACCEPTED,
	];
	if (!allowableStatuses.includes(booking.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Booking cannot be cancelled from ${booking.status} status`,
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedBooking = await tx.booking.update({
			where: { id: bookingId },
			data: { status: BookingStatus.CANCELLED },
		});

		await tx.availability.update({
			where: { id: booking.availabilityId },
			data: { isBooked: false },
		});

		return updatedBooking;
	});

	return result;
};

export const BookingService = {
	createBooking,
	getCustomerBookings,
	getTechnicianBookings,
	getBookingById,
	updateBookingStatus,
	cancelBooking,
};
