export interface ICreateTechnicianProfile  {
 experience: number;
 specialization: string;
 hourlyRate: number;
 bio?: string | undefined;
}
export interface IUpdateTechnicianProfile  {
 experience: number;
 specialization: string;
 hourlyRate: number;
 bio?: string | undefined;
}
export interface ITechnicianQuery {
 page: number;
 limit: number;
 search?: string | undefined;
 specialization?: string | undefined;
 isAvailable?: "true" | "false" | undefined;
 minRate?: number | undefined;
 maxRate?: number | undefined;
}

export interface IApplyAsTechnicianPayload {
  specialization: string;
  experience: number;
  hourlyRate: number;
  bio?: string | undefined;
}

export interface IReviewApplicationPayload {
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string | undefined;
}

export interface ITechnicianApplicationQuery {
  page: number;
  limit: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
  search?: string | undefined;
}