import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./auth.validation";
import { upload } from "../../lib/multer";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.CustomerRegistrationSchema),
  AuthController.registerUser,
);

router.post(
  "/verify-email",
  validateRequest(UserValidation.CustomerEmailVerifySchema),
  AuthController.verifyEmail,
);

router.post(
  "/login",
  validateRequest(UserValidation.loginSchema),
  AuthController.loginUser,
);

router.post("/google-login", AuthController.googleLogin);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
  "/forgot-password",
  validateRequest(UserValidation.ForgotPasswordSchema),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(UserValidation.ResetPasswordSchema),
  AuthController.resetPassword,
);

router.get(
  "/me",
  auth(Role.CUSTOMER, Role.TECHNICIAN, Role.ADMIN),
  AuthController.getMe,
);

router.patch(
  "/profile",
  auth(Role.CUSTOMER, Role.TECHNICIAN, Role.ADMIN),
  upload.single("avatar"),
  validateRequest(UserValidation.UpdateProfileSchema),
  AuthController.updateProfile,
);

export const AuthRoutes = router;
