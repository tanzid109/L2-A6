import z from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
});

const CustomerRegistrationSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  phone: z.string().optional(),
});

const CustomerEmailVerifySchema = z.object({
  email: z.email("Not email!!"),
  otp: z.string().length(6),
});

const loginSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

const ForgotPasswordSchema = z.object({
  email: z.email(),
});

const ResetPasswordSchema = z.object({
  email: z.email(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  otp: z.string().length(6),
});

export const UserValidation = {
  CustomerRegistrationSchema,
  CustomerEmailVerifySchema,
  loginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
};
