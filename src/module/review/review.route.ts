import { Router } from "express";

import { ReviewController } from "./review.controller";
import {
	createReviewSchema,
	updateReviewSchema,
	reviewQuerySchema,
} from "./review.validation";

import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/",
	auth(Role.CUSTOMER),
	validateRequest(createReviewSchema),
	ReviewController.createReview,
);

router.get(
	"/technician/:technicianId",
	validateRequest(reviewQuerySchema),
	ReviewController.getTechnicianReviews,
);

router.get("/:id", ReviewController.getReviewById);

router.patch(
	"/:id",
	auth(Role.CUSTOMER),
	validateRequest(updateReviewSchema),
	ReviewController.updateReview,
);

router.delete("/:id", auth(Role.CUSTOMER), ReviewController.deleteReview);

export const ReviewRoutes = router;
