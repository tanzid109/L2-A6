import { Router } from "express";

import { PaymentController } from "./payment.controller";

import {
	createCheckoutSessionSchema,
	paymentQuerySchema,
} from "./payment.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
	"/checkout",
	auth(Role.CUSTOMER),
	validateRequest(createCheckoutSessionSchema),
	PaymentController.createCheckoutSession,
);

router.get(
	"/my",
	auth(Role.CUSTOMER),
	validateRequest(paymentQuerySchema),
	PaymentController.getCustomerPayments,
);

router.get("/:id", auth(Role.CUSTOMER), PaymentController.getPaymentById);

export const PaymentRoutes = router;
