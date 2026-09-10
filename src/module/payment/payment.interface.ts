import { PaymentStatus } from "../../../generated/prisma/enums";

export interface PaymentQuery {
  status?: PaymentStatus;
  page: number;
  limit: number;
}