import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { TechnicianController } from "./technician.controller";
import {
	applyAsTechnicianSchema,
	applicationQuerySchema,
	createTechnicianProfileSchema,
	reviewApplicationSchema,
	technicianQuerySchema,
	updateTechnicianProfileSchema,
} from "./technician.validation";

const router = Router();


router.post(
	"/application",
	auth(Role.CUSTOMER),
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	validateRequest(applyAsTechnicianSchema),
	TechnicianController.applyAsTechnician,
);

router.get(
	"/application/me",
	auth(Role.CUSTOMER),
	TechnicianController.getMyApplication,
);

router.get(
	"/applications",
	auth(Role.ADMIN),
	validateRequest(applicationQuerySchema),
	TechnicianController.getApplications,
);

router.get(
	"/applications/:id",
	auth(Role.ADMIN),
	TechnicianController.getApplicationById,
);

router.patch(
	"/applications/:id",
	auth(Role.ADMIN),
	validateRequest(reviewApplicationSchema),
	TechnicianController.reviewApplication,
);


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