export interface CreateAvailabilityPayload {
	date: string;
	startTime: string;
	endTime: string;
}

export interface UpdateAvailabilityPayload {
	date?: string;
	startTime?: string;
	endTime?: string;
}

export interface AvailabilityQuery {
	date?: string;
	isBooked?: string;
	page: number;
	limit: number;
}
