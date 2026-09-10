import { Router } from "express";

import { BookingController } from "./booking.controller";

import {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingQuerySchema,
} from "./booking.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();
router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(createBookingSchema),
  BookingController.createBooking,
);
router.get(
  "/my",
  auth(Role.CUSTOMER),
  validateRequest(bookingQuerySchema),
  BookingController.getCustomerBookings,
);
router.patch(
  "/:id/cancel",
  auth(Role.CUSTOMER),
  BookingController.cancelBooking,
);
router.get(
  "/technician/my",
  auth(Role.TECHNICIAN),
  validateRequest(bookingQuerySchema),
  BookingController.getTechnicianBookings,
);
router.patch(
  "/:id/status",
  auth(Role.TECHNICIAN),
  validateRequest(updateBookingStatusSchema),
  BookingController.updateBookingStatus,
);
router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.TECHNICIAN),
  BookingController.getBookingById,
);

export const BookingRoutes = router;
