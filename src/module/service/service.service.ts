import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

import type {
  ICreateServicePayload,
  IServiceQueryParams,
  IUpdateServicePayload,
} from "./service.interface";

const uploadImage = async (file: Express.Multer.File): Promise<{ imageUrl: string; imagePublicId: string }> => {
  const b64 = file.buffer.toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "fieldops/services",
    resource_type: "image",
  });

  return {
    imageUrl: result.secure_url,
    imagePublicId: result.public_id,
  };
};

const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

const createService = async (
  payload: ICreateServicePayload,
  file?: Express.Multer.File,
) => {
  const existingService = await prisma.service.findUnique({
    where: {
      slug: payload.slug,
    },
  });

  if (existingService) {
    throw new AppError(409, "A service with this slug already exists");
  }

  let imageUrl = "";
  let imagePublicId = "";

  if (file) {
    const uploaded = await uploadImage(file);
    imageUrl = uploaded.imageUrl;
    imagePublicId = uploaded.imagePublicId;
  }

  const service = await prisma.service.create({
    data: {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      category: payload.category,
      price: new Prisma.Decimal(payload.price),
      duration: payload.duration,
      imageUrl,
      imagePublicId,
    },
  });

  return service;
};

const getAllServices = async (query: IServiceQueryParams) => {
  const { search, category, isActive } = query;

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const where: Prisma.ServiceWhereInput = {};

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const [services, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.service.count({
      where,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: services,
  };
};

const getServiceById = async (id: string) => {
  const service = await prisma.service.findUnique({
    where: {
      id,
    },
  });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  return service;
};

const updateService = async (
  id: string,
  payload: IUpdateServicePayload,
  file?: Express.Multer.File,
) => {
  const existingService = await prisma.service.findUnique({
    where: {
      id,
    },
  });

  if (!existingService) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (payload.slug) {
    const slugExists = await prisma.service.findFirst({
      where: {
        slug: payload.slug,
        NOT: {
          id,
        },
      },
    });

    if (slugExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A service with this slug already exists",
      );
    }
  }

  let imageUrl = existingService.imageUrl;
  let imagePublicId = existingService.imagePublicId;

  if (file) {
    if (existingService.imagePublicId) {
      await deleteImage(existingService.imagePublicId);
    }

    const uploaded = await uploadImage(file);
    imageUrl = uploaded.imageUrl;
    imagePublicId = uploaded.imagePublicId;
  }

  const service = await prisma.service.update({
    where: {
      id,
    },

    data: {
      ...(payload.title !== undefined && {
        title: payload.title,
      }),

      ...(payload.slug !== undefined && {
        slug: payload.slug,
      }),

      ...(payload.description !== undefined && {
        description: payload.description,
      }),

      ...(payload.category !== undefined && {
        category: payload.category,
      }),

      ...(payload.price !== undefined && {
        price: new Prisma.Decimal(payload.price),
      }),

      ...(payload.duration !== undefined && {
        duration: payload.duration,
      }),

      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),

      imageUrl,
      imagePublicId,
    },
  });

  return service;
};

const deleteService = async (id: string) => {
  const service = await prisma.service.findUnique({
    where: {
      id,
    },
  });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  if (service.imagePublicId) {
    await deleteImage(service.imagePublicId);
  }

  const updatedService = await prisma.service.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },
  });

  return updatedService;
};

export const ServiceService = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
