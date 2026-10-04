-- AlterTable
ALTER TABLE "services" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "services_createdById_idx" ON "services"("createdById");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;