import { BookingStatus } from "../../../generated/prisma/enums";

export interface CreateBookingPayload {
	technicianId: string;
	serviceId: string;
	availabilityId: string;
	address: string;
	problemDescription: string;
}

export interface BookingQuery {
	status?: BookingStatus;
	page: number;
	limit: number;
}

export interface UpdateBookingStatusPayload {
	status: BookingStatus;
}
