import path from "path";
import ejs from "ejs";
import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import type { SignOptions } from "jsonwebtoken";
import { Role, TechnicianApplicationStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import config from "../../config";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { transporter } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
  IApplyAsTechnicianPayload,
  ICreateTechnicianProfile,
  IReviewApplicationPayload,
  ITechnicianApplicationQuery,
  ITechnicianQuery,
  IUpdateTechnicianProfile,
} from "./technician.interface";

const uploadProfileImage = async (
	file: Express.Multer.File,
): Promise<{ url: string; publicId: string }> => {
	const b64 = file.buffer.toString("base64");
	const dataURI = `data:${file.mimetype};base64,${b64}`;

	const result = await cloudinary.uploader.upload(dataURI, {
		folder: "fieldops/technicians",
		resource_type: "image",
	});

	return {
		url: result.secure_url,
		publicId: result.public_id,
	};
};

const deleteProfileImage = async (publicId: string): Promise<void> => {
	await cloudinary.uploader.destroy(publicId);
};

const uploadDocument = (
	file: Express.Multer.File,
): Promise<{ url: string; publicId: string }> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					folder: "fieldops/applications",
					resource_type: "auto",
				},
				(error, result) => {
					if (error) {
						return reject(error);
					}

					if (!result) {
						return reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from Cloudinary",
							),
						);
					}

					resolve({
						url: result.secure_url,
						publicId: result.public_id,
					});
				},
			)
			.end(file.buffer);
	});
};

const deleteDocuments = async (publicIds: string[]): Promise<void> => {
	await Promise.allSettled(
		publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)),
	);
};

const renderTemplate = async (file: string, data: Record<string, unknown>) => {
	const templatePath = path.join(process.cwd(), "src/templates", file);

	return ejs.renderFile(templatePath, data);
};

const applyAsTechnician = async (
	userId: string,
	payload: IApplyAsTechnicianPayload,
	resume: Express.Multer.File | undefined,
	additionalFiles: Express.Multer.File[] = [],
) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === "BANNED") {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your account has been banned. Please contact support.",
		);
	}

	if (user.role === "TECHNICIAN") {
		throw new AppError(
			httpStatus.CONFLICT,
			"You are already a technician",
		);
	}

	if (!user.emailVerified) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Please verify your email before applying",
		);
	}

	const existingProfile = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
	});

	if (existingProfile) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Technician profile already exists",
		);
	}

	const existingApplication = await prisma.technicianApplication.findUnique({
		where: {
			userId,
		},
	});

	if (existingApplication) {
		if (existingApplication.status === "PENDING") {
			throw new AppError(
				httpStatus.CONFLICT,
				"You already have a pending technician application",
			);
		}

		throw new AppError(
			httpStatus.CONFLICT,
			`Your previous application was ${existingApplication.status.toLowerCase()}`,
		);
	}

	if (!resume) {
		throw new AppError(httpStatus.BAD_REQUEST, "A resume file is required");
	}

	const resumeUpload = await uploadDocument(resume);
	const additionalUploads = await Promise.all(
		additionalFiles.map((file) => uploadDocument(file)),
	);

	let application;
	try {
		application = await prisma.technicianApplication.create({
			data: {
				userId,
				resume: resumeUpload.url,
				resumePublicId: resumeUpload.publicId,
				additionalFiles: additionalUploads.map((file) => ({
					url: file.url,
					publicId: file.publicId,
				})),
				specialization: payload.specialization,
				experience: payload.experience,
				hourlyRate: new Prisma.Decimal(payload.hourlyRate),
				bio: payload.bio,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	} catch (error) {
		await deleteDocuments([
			resumeUpload.publicId,
			...additionalUploads.map((file) => file.publicId),
		]);

		throw error;
	}

	return application;
};

const getMyApplication = async (userId: string) => {
	const application = await prisma.technicianApplication.findUnique({
		where: {
			userId,
		},
	});

	if (!application) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"You have not applied to become a technician",
		);
	}

	return application;
};

const getApplications = async (query: ITechnicianApplicationQuery) => {
	const { status, search, page = 1, limit = 10 } = query;

	const skip = (page - 1) * limit;

	const andConditions: Prisma.TechnicianApplicationWhereInput[] = [];

	if (status) {
		andConditions.push({ status });
	}

	if (search) {
		andConditions.push({
			OR: [
				{
					specialization: {
						contains: search,
						mode: "insensitive",
					},
				},
				{ user: { name: { contains: search, mode: "insensitive" } } },
				{ user: { email: { contains: search, mode: "insensitive" } } },
			],
		});
	}

	const where: Prisma.TechnicianApplicationWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [applications, total] = await prisma.$transaction([
		prisma.technicianApplication.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						role: true,
					},
				},
			},
		}),
		prisma.technicianApplication.count({ where }),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
		data: applications,
	};
};

const getApplicationById = async (id: string) => {
	const application = await prisma.technicianApplication.findUnique({
		where: {
			id,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
				},
			},
		},
	});

	if (!application) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	return application;
};

const reviewApplication = async (
	applicationId: string,
	payload: IReviewApplicationPayload,
	reviewer: { userId: string },
) => {
	const application = await prisma.technicianApplication.findUnique({
		where: {
			id: applicationId,
		},
		include: {
			user: true,
		},
	});

	if (!application) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	if (application.status !== "PENDING") {
		throw new AppError(
			httpStatus.CONFLICT,
			`Application has already been ${application.status.toLowerCase()}`,
		);
	}

	if (
		payload.status === TechnicianApplicationStatus.REJECTED &&
		!payload.rejectionReason
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A rejection reason is required when rejecting an application",
		);
	}

	const isApproved = payload.status === TechnicianApplicationStatus.APPROVED;

	const result = await prisma.$transaction(async (tx) => {
		const updatedApplication = await tx.technicianApplication.update({
			where: {
				id: applicationId,
			},
			data: {
				status: payload.status,
				rejectionReason: isApproved ? null : payload.rejectionReason,
				reviewedBy: reviewer.userId,
				reviewedAt: new Date(),
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		if (!isApproved) {
			return { application: updatedApplication, profile: null };
		}

		const existingProfile = await tx.technicianProfile.findUnique({
			where: {
				userId: application.userId,
			},
		});

		if (existingProfile) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Technician profile already exists",
			);
		}

		const profile = await tx.technicianProfile.create({
			data: {
				userId: application.userId,
				bio: application.bio,
				experience: application.experience,
				specialization: application.specialization,
				hourlyRate: application.hourlyRate,
			},
		});

		await tx.user.update({
			where: {
				id: application.userId,
			},
			data: {
				role: Role.TECHNICIAN,
			},
		});

		return { application: updatedApplication, profile };
	});

	const user = await prisma.user.findUniqueOrThrow({
		where: {
			id: application.userId,
		},
	});

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

	const templateFile = isApproved
		? "technician-application-approved.ejs"
		: "technician-application-rejected.ejs";

	const html = await renderTemplate(templateFile, {
		name: user.name,
		specialization: application.specialization,
		reason: result.application.rejectionReason,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: isApproved
			? "Your technician application has been approved"
			: "Your technician application has been rejected",
		html,
	});

	return {
		...result.application,
		profile: result.profile,
		accessToken,
		refreshToken,
	};
};


const createTechnicianProfile = async (
	userId: string,
	payload: ICreateTechnicianProfile,
	file?: Express.Multer.File,
) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.role !== "TECHNICIAN") {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only technicians can create technician profiles",
		);
	}

	const existingProfile = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
	});

	if (existingProfile) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Technician profile already exists",
		);
	}

	let avatar = "";
	let avatarPublicId = "";

	if (file) {
		const uploaded = await uploadProfileImage(file);
		avatar = uploaded.url;
		avatarPublicId = uploaded.publicId;

		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				avatar,
				avatarPublicId,
			},
		});
	}

	const profile = await prisma.technicianProfile.create({
		data: {
			userId,
			bio: payload.bio,
			experience: payload.experience,
			specialization: payload.specialization,
			hourlyRate: new Prisma.Decimal(payload.hourlyRate),
		},

		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
					avatarPublicId: true,
				},
			},
		},
	});

	return profile;
};

const getMyTechnicianProfile = async (userId: string) => {
	const profile = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},

		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
					avatarPublicId: true,
				},
			},
		},
	});

	if (!profile) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	return profile;
};

const updateMyTechnicianProfile = async (
	userId: string,
	payload: IUpdateTechnicianProfile,
	file?: Express.Multer.File,
) => {
	const existingProfile = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
					avatarPublicId: true,
				},
			},
		},
	});

	if (!existingProfile) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	if (file) {
		const uploaded = await uploadProfileImage(file);

		if (existingProfile.user.avatarPublicId) {
			await deleteProfileImage(existingProfile.user.avatarPublicId);
		}

		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				avatar: uploaded.url,
				avatarPublicId: uploaded.publicId,
			},
		});
	}

	const profile = await prisma.technicianProfile.update({
		where: {
			userId,
		},

		data: {
			...(payload.bio !== undefined && {
				bio: payload.bio,
			}),

			...(payload.experience !== undefined && {
				experience: payload.experience,
			}),

			...(payload.specialization !== undefined && {
				specialization: payload.specialization,
			}),

			...(payload.hourlyRate !== undefined && {
				hourlyRate: new Prisma.Decimal(payload.hourlyRate),
			}),
		},

		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
					avatarPublicId: true,
				},
			},
		},
	});

	return profile;
};

const getAllTechnicians = async (query: ITechnicianQuery) => {
	const {
		search,
		specialization,
		isAvailable,
		minRate,
		maxRate,
		page = 1,
		limit = 10,
	} = query;

	const skip = (page - 1) * limit;

	const andConditions: Prisma.TechnicianProfileWhereInput[] = [];

	if (search) {
		andConditions.push({
			OR: [
				{ specialization: { contains: search, mode: "insensitive" } },
				{ bio: { contains: search, mode: "insensitive" } },
				{ user: { name: { contains: search, mode: "insensitive" } } },
			],
		});
	}

	if (specialization) {
		andConditions.push({
			specialization: { contains: specialization, mode: "insensitive" },
		});
	}

	if (isAvailable !== undefined) {
		andConditions.push({
			isAvailable: isAvailable === "true", // Safeguard boolean/string types
		});
	}

	if (minRate !== undefined || maxRate !== undefined) {
		const rateCondition: Prisma.TechnicianProfileWhereInput["hourlyRate"] = {};

		if (minRate !== undefined) {
			rateCondition.gte = new Prisma.Decimal(minRate);
		}
		if (maxRate !== undefined) {
			rateCondition.lte = new Prisma.Decimal(maxRate);
		}

		andConditions.push({ hourlyRate: rateCondition });
	}

	const where: Prisma.TechnicianProfileWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [technicians, total] = await prisma.$transaction([
		prisma.technicianProfile.findMany({
			where,
			skip,
			take: limit,
			orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						avatar: true,
						avatarPublicId: true,
					},
				},
			},
		}),
		prisma.technicianProfile.count({ where }),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
		data: technicians,
	};
};

const getTechnicianById = async (id: string) => {
	const technician = await prisma.technicianProfile.findUnique({
		where: {
			id,
		},

		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					avatar: true,
					avatarPublicId: true,
				},
			},
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	}

	return technician;
};

const toggleAvailability = async (userId: string) => {
	const profile = await prisma.technicianProfile.findUnique({
		where: {
			userId,
		},
	});

	if (!profile) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	const updatedProfile = await prisma.technicianProfile.update({
		where: {
			userId,
		},

		data: {
			isAvailable: !profile.isAvailable,
		},
	});

	return updatedProfile;
};

export const TechnicianService = {
	applyAsTechnician,
	getMyApplication,
	getApplications,
	getApplicationById,
	reviewApplication,
	createTechnicianProfile,
	getMyTechnicianProfile,
	updateMyTechnicianProfile,
	getAllTechnicians,
	getTechnicianById,
	toggleAvailability,
};