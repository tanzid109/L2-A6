import bcrypt from "bcryptjs";
import type { TokenPayload } from "google-auth-library";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterUserPayload,
  IRequestUser,
  IResetPasswordPayload,
  IUpdateProfilePayload,
  IVerifyEmailPayload,
} from "./auth.interface";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import { cloudinary } from "../../lib/cloudinary";
import ejs from "ejs";
import path from "path";

const registerCustomer = async (payload: IRegisterUserPayload) => {
  const { name, password, phone } = payload;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const expirationSeconds = 5 * 60;

  const otpKey = `user-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const registrationKey = `user-registration-data:${email}`;

  const redisUserDataPayload = {
    name,
    email,
    phone,
    password: hashedPassword,
  };

  await redisClient.set(registrationKey, JSON.stringify(redisUserDataPayload), {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const tempatePath = path.join(
    process.cwd(),
    "src/templates/registration-user-otp.ejs",
  );

  const templateData = {
    name,
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Email Verification",
    html,
  });
};

const verifyCustomerEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.status === UserStatus.BANNED) {
    throw new Error("User is Banned");
  }

  if (isUserExist?.emailVerified) {
    throw new Error("Email Already Verified");
  }


  const otpKey = `user-registration-otp:${email}`;

  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new Error("Invalid OTP");
  }

  if (redisOtp !== otp) {
    throw new Error("OTP Does Not Match");
  }

  await redisClient.del(otpKey);

  const registrationKey = `user-registration-data:${email}`;

  const redisUserData = await redisClient.get(registrationKey);

  if (!redisUserData) {
    throw new Error("Registration Data Does Not Exist");
  }

  const registrationPayload = JSON.parse(redisUserData) as {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };

  const createdUser = await prisma.user.create({
    data: {
      name: registrationPayload.name,
      email: registrationPayload.email,
      phone: registrationPayload.phone,
      password: registrationPayload.password,
      role: Role.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    omit: { password: true },
  });

  await redisClient.del(registrationKey);

  const tempatePath = path.join(
    process.cwd(),
    "src/templates/welcome-email.ejs",
  );

  const templateData = {
    name: createdUser.name,
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome",
    html,
  });

  const user = createdUser;
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("User is banned");
  }


  if (user.password === null && user.googleId !== null) {
    throw new Error(
      "User Already Has Account Registered With Google. Try To Login With Google.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    omit: {
      password: true,
    },
  });

  if (!isUserExists) {
    throw new Error("User not found");
  }

  return isUserExists;
};

const updateProfile = async (
  userId: string,
  payload: IUpdateProfilePayload,
  file?: Express.Multer.File,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  let avatar = user.avatar;
  let avatarPublicId = user.avatarPublicId;

  if (file) {
    const b64 = file.buffer.toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    const uploaded = await cloudinary.uploader.upload(dataURI, {
      folder: "fieldops/profiles",
      resource_type: "image",
    });

    if (avatarPublicId) {
      await cloudinary.uploader.destroy(avatarPublicId).catch(() => null);
    }

    avatar = uploaded.secure_url;
    avatarPublicId = uploaded.public_id;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(avatar !== undefined && { avatar }),
      ...(avatarPublicId !== undefined && { avatarPublicId }),
    },
    omit: { password: true },
  });

  return updatedUser;
};

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new Error(
      config.node_env === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new Error("User is inactive or not found");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log("Google ID Token Verification Failed", error);
    throw new Error("Invalid Or Expired Google Id Token");
  }

  if (!googleIdTokenPayload) {
    throw new Error("Invalid Or Expired Google Id Token");
  }

  if (!googleIdTokenPayload.email) {
    throw new Error("Google Email Not Found");
  }
  if (!googleIdTokenPayload.name) {
    throw new Error("Google Email User Name Not Found");
  }

  const existingWithGoogleAuth = await prisma.user.findFirst({
    where: {
      email: googleIdTokenPayload.email,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = existingWithGoogleAuth;

  if (!existingWithGoogleAuth) {
    const existingWithCredentials = await prisma.user.findFirst({
      where: {
        email: googleIdTokenPayload.email,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (existingWithCredentials) {
      if (!existingWithCredentials.emailVerified) {
        throw new Error("Email Not Verified");
      }

      if (existingWithCredentials.status === UserStatus.BANNED) {
        throw new Error("User Is Banned");
      }

      user = await prisma.user.update({
        where: {
          id: existingWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    } else {
      // New Google sign-up
      user = await prisma.user.create({
        data: {
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.CUSTOMER,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
        },
      });
    }
  }

  if (!user) {
    throw new Error("User Not Found");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("User Is Banned");
  }


  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;

  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExists) {
    throw new Error("User Does Not Exists");
  }
  if (isUserExists.status === UserStatus.BANNED) {
    throw new Error("User is banned");
  }

  if (isUserExists.authProvider === AuthProvider.GOOGLE) {
    throw new Error("User has account with google");
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgot-password-otp:${isUserExists.email}`;
  await redisClient.set(key, otp, {
    expiration: {
      type: "EX",
      value: 5 * 60,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/templates/forgot-password.ejs",
  );

  const exprirationSeconds = 5 * 60;

  const html = await ejs.renderFile(templatePath, {
    name: isUserExists.name,
    otp,
    expirationMinutes: exprirationSeconds / 60,
  });

  await transporter.sendMail({
    from: config.email_sender,
    to: isUserExists.email,
    subject: "Forgot Password",
    html,
  });
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, otp, newPassword } = payload;

  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExists) {
    throw new Error("User Does Not Exists");
  }
  if (isUserExists.status === UserStatus.BANNED) {
    throw new Error("User is banned");
  }
  if (isUserExists.authProvider === AuthProvider.GOOGLE) {
    throw new Error("User has account with google");
  }

  const key = `forgot-password-otp:${isUserExists.email}`;

  const redisOtp = await redisClient.get(key);

  if (!redisOtp) {
    throw new Error("Invalid Otp");
  }

  if (redisOtp !== otp) {
    throw new Error("Otp does not match");
  }

  const hasedNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: isUserExists.email,
    },
    data: {
      password: hasedNewPassword,
    },
  });

  await redisClient.del(key);

  const templatePath = path.join(
    process.cwd(),
    "src/templates/reset-password-success.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: isUserExists.name,
  });

  await transporter.sendMail({
    from: config.email_sender,
    to: isUserExists.email,
    subject: "Password Changed",
    html,
  });
};

export const AuthService = {
  registerCustomer,
  verifyCustomerEmail,
  loginUser,
  getMe,
  updateProfile,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
};
