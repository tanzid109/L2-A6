import httpStatus from "http-status";
import {
	BookingStatus,
	PaymentStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type RequestUser = NonNullable<Express.Request["user"]>;

const getAdminAnalytics = async () => {
	const totalTechnicians = await prisma.user.count({
		where: {
			role: "TECHNICIAN",
		},
	});

	const totalCustomers = await prisma.user.count({
		where: {
			role: "CUSTOMER",
		},
	});

	const totalServices = await prisma.service.count();

	const totalActiveServices = await prisma.service.count({
		where: {
			isActive: true,
		},
	});

	const totalBookings = await prisma.booking.count();

	const totalPendingBookings = await prisma.booking.count({
		where: { status: BookingStatus.PENDING },
	});

	const totalCompletedBookings = await prisma.booking.count({
		where: { status: BookingStatus.COMPLETED },
	});

	const totalCancelledBookings = await prisma.booking.count({
		where: { status: BookingStatus.CANCELLED },
	});

	const totalRevenueResult = await prisma.payment.aggregate({
		where: { status: PaymentStatus.PAID },
		_sum: { amount: true },
	});
	const totalRevenue = totalRevenueResult._sum.amount?.toNumber() || 0;

	const totalRefundedResult = await prisma.payment.aggregate({
		where: { status: PaymentStatus.REFUNDED },
		_sum: { amount: true },
	});
	const totalRefunded = totalRefundedResult._sum.amount?.toNumber() || 0;

	return {
		totalTechnicians,
		totalCustomers,
		totalServices,
		totalActiveServices,
		totalBookings,
		totalPendingBookings,
		totalCompletedBookings,
		totalCancelledBookings,
		totalRevenue,
		totalRefunded,
	};
};

const getCustomerAnalytics = async (user: RequestUser) => {
	const totalBookings = await prisma.booking.count({
		where: { customerId: user.userId },
	});

	const upcomingBookings = await prisma.booking.count({
		where: {
			customerId: user.userId,
			status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
		},
	});

	const completedBookings = await prisma.booking.count({
		where: {
			customerId: user.userId,
			status: BookingStatus.COMPLETED,
		},
	});

	const cancelledBookings = await prisma.booking.count({
		where: {
			customerId: user.userId,
			status: BookingStatus.CANCELLED,
		},
	});

	const totalAmountSpentResult = await prisma.payment.aggregate({
		where: {
			booking: { customerId: user.userId },
			status: PaymentStatus.PAID,
		},
		_sum: { amount: true },
	});
	const totalAmountSpent = totalAmountSpentResult._sum.amount?.toNumber() || 0;

	const totalRefundedResult = await prisma.payment.aggregate({
		where: {
			booking: { customerId: user.userId },
			status: PaymentStatus.REFUNDED,
		},
		_sum: { amount: true },
	});
	const totalRefunded = totalRefundedResult._sum.amount?.toNumber() || 0;

	return {
		totalBookings,
		upcomingBookings,
		completedBookings,
		cancelledBookings,
		totalAmountSpent,
		totalRefunded,
	};
};

const getTechnicianAnalytics = async (user: RequestUser) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: { userId: user.userId },
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const totalAvailabilities = await prisma.availability.count({
		where: { technicianId: technician.id },
	});

	const availableSlots = await prisma.availability.count({
		where: {
			technicianId: technician.id,
			isBooked: false,
		},
	});

	const totalBookings = await prisma.booking.count({
		where: { technicianId: technician.id },
	});

	const upcomingBookings = await prisma.booking.count({
		where: {
			technicianId: technician.id,
			status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
		},
	});

	const ongoingBookings = await prisma.booking.count({
		where: {
			technicianId: technician.id,
			status: BookingStatus.IN_PROGRESS,
		},
	});

	const completedBookings = await prisma.booking.count({
		where: {
			technicianId: technician.id,
			status: BookingStatus.COMPLETED,
		},
	});

	const cancelledBookings = await prisma.booking.count({
		where: {
			technicianId: technician.id,
			status: BookingStatus.CANCELLED,
		},
	});

	const totalEarningsResult = await prisma.payment.aggregate({
		where: {
			booking: { technicianId: technician.id },
			status: PaymentStatus.PAID,
		},
		_sum: { amount: true },
	});
	const totalEarnings = totalEarningsResult._sum.amount?.toNumber() || 0;

	const totalRefundedResult = await prisma.payment.aggregate({
		where: {
			booking: { technicianId: technician.id },
			status: PaymentStatus.REFUNDED,
		},
		_sum: { amount: true },
	});
	const totalRefunded = totalRefundedResult._sum.amount?.toNumber() || 0;

	return {
		totalAvailabilities,
		availableSlots,
		totalBookings,
		upcomingBookings,
		ongoingBookings,
		completedBookings,
		cancelledBookings,
		totalEarnings,
		totalRefunded,
		rating: Number(technician.rating),
		totalReviews: technician.totalReviews,
	};
};

export const AnalyticsServices = {
	getAdminAnalytics,
	getCustomerAnalytics,
	getTechnicianAnalytics,
};
