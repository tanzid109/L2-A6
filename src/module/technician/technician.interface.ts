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