import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { TechnicianController } from "./technician.controller";
import {
	createTechnicianProfileSchema,
	technicianQuerySchema,
	updateTechnicianProfileSchema,
} from "./technician.validation";

const router = Router();

router.get(
	"/",
	validateRequest(technicianQuerySchema),
	TechnicianController.getAllTechnicians,
);
router.get("/:id", TechnicianController.getTechnicianById);

router.post(
	"/profile",
	auth(Role.TECHNICIAN),
	upload.single("profileImage"),
	validateRequest(createTechnicianProfileSchema),
	TechnicianController.createTechnicianProfile,
);
router.get(
	"/profile/me",
	auth(Role.TECHNICIAN),
	TechnicianController.getMyTechnicianProfile,
);
router.patch(
	"/profile/me",
	auth(Role.TECHNICIAN),
	upload.single("profileImage"),
	validateRequest(updateTechnicianProfileSchema),
	TechnicianController.updateMyTechnicianProfile,
);
router.patch(
	"/availability/toggle",
	auth(Role.TECHNICIAN),
	TechnicianController.toggleAvailability,
);

export const TechnicianRoutes = router;
