import { Router } from "express";
import { ServiceController } from "./service.controller";
import {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
} from "./service.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";

const router = Router();

router.get(
  "/",
  validateRequest(serviceQuerySchema),
  ServiceController.getAllServices,
);

router.get("/:id", ServiceController.getServiceById);

router.post(
  "/",
  auth(Role.ADMIN),
  upload.single("image"),
  validateRequest(createServiceSchema),
  ServiceController.createService,
);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  upload.single("image"),
  validateRequest(updateServiceSchema),
  ServiceController.updateService,
);

router.delete("/:id", auth(Role.ADMIN), ServiceController.deleteService);

export const ServiceRoutes = router;
