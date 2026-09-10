import { Router } from "express";
import { AvailabilityController } from "./availability.controller";

import {
	createAvailabilitySchema,
	updateAvailabilitySchema,
	availabilityQuerySchema,
} from "./availability.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
	"/",
	auth(Role.TECHNICIAN),
	validateRequest(createAvailabilitySchema),
	AvailabilityController.createAvailability,
);

router.get(
	"/my",
	auth(Role.TECHNICIAN),
	validateRequest(availabilityQuerySchema),
	AvailabilityController.getMyAvailability,
);

router.get(
	"/technician/:technicianId",
	validateRequest(availabilityQuerySchema),
	AvailabilityController.getTechnicianAvailability,
);

router.patch(
	"/:id",
	auth(Role.TECHNICIAN),
	validateRequest(updateAvailabilitySchema),
	AvailabilityController.updateAvailability,
);

router.delete(
	"/:id",
	auth(Role.TECHNICIAN),
	AvailabilityController.deleteAvailability,
);

export const AvailabilityRoutes = router;
