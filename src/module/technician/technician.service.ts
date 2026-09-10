import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { ICreateTechnicianProfile, ITechnicianQuery, IUpdateTechnicianProfile } from "./technician.interface";

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
	createTechnicianProfile,
	getMyTechnicianProfile,
	updateMyTechnicianProfile,
	getAllTechnicians,
	getTechnicianById,
	toggleAvailability,
};
