-- CreateEnum
CREATE TYPE "TechnicianApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "technician_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "resumePublicId" TEXT NOT NULL,
    "additionalFiles" JSONB,
    "specialization" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "bio" TEXT,
    "status" "TechnicianApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technician_applications_userId_key" ON "technician_applications"("userId");

-- CreateIndex
CREATE INDEX "technician_applications_status_idx" ON "technician_applications"("status");

-- CreateIndex
CREATE INDEX "technician_applications_createdAt_idx" ON "technician_applications"("createdAt");

-- AddForeignKey
ALTER TABLE "technician_applications" ADD CONSTRAINT "technician_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;