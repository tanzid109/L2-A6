import bcrypt from "bcryptjs";
import { Role, Prisma, UserStatus } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import config from "../config";

// ১. Seed Admin Account
export const seedAdmin = async () => {
	try {
		const isExist = await prisma.user.findUnique({
			where: {
				email: config.admin_email,
			},
		});

		if (isExist) {
			console.log("Admin Already Exists!");
			return;
		}

		const name = config.admin_name;
		const email = config.admin_email;
		const password = config.admin_password;

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds || 10),
		);

		const admin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.ADMIN,
				status: UserStatus.ACTIVE,
				emailVerified: true,
			},
		});

		console.log("Admin Account Seeded Successfully! :", admin);
	} catch (error) {
		console.log("Error Seeding Admin: ", error);
	}
};

// ২. Seed Technician Account (With TechnicianProfile Relation)
export const seedTechnician = async () => {
	try {
		const isExist = await prisma.user.findUnique({
			where: {
				email: config.technician_email || "tech@test.com",
			},
		});

		if (isExist) {
			console.log("Tester Technician Already Exists!");
			return;
		}

		const name = config.technician_name;
		const email = config.technician_email;
		const password = config.technician_password;

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds || 10),
		);

		const technician = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.TECHNICIAN,
				status: UserStatus.ACTIVE,
				emailVerified: true,
				technicianProfile: {
					create: {
						bio: "Expert electronics and hardware repair specialist with over 5 years of industry experience.",
						experience: 5,
						specialization: "Electronics",
						hourlyRate: new Prisma.Decimal(45.0),
						rating: new Prisma.Decimal(5.0),
						totalReviews: 0,
						isAvailable: true,
					},
				},
			},
		});

		console.log(
			"Technician Account & Profile Seeded Successfully!:",
			technician,
		);
	} catch (error) {
		console.log("Error Seeding Technician: ", error);
	}
};

// ৩. Seed Customer Account
export const seedCustomer = async () => {
	try {
		const isExist = await prisma.user.findUnique({
			where: {
				email: config.customer_email,
			},
		});

		if (isExist) {
			console.log("Tester Customer Already Exists!");
			return;
		}

		const name = config.customer_name;
		const email = config.customer_email;
		const password = config.customer_password;

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds || 10),
		);

		const customer = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.CUSTOMER,
				status: UserStatus.ACTIVE,
				emailVerified: true,
			},
		});

		console.log("Customer Account Seeded Successfully! :", customer);
	} catch (error) {
		console.log("Error Seeding Customer: ", error);
	}
};
