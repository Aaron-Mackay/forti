-- CreateEnum
CREATE TYPE "CoachRequestStatus" AS ENUM ('Pending', 'Rejected');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coachCode" TEXT;

-- CreateTable
CREATE TABLE "CoachRequest" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" "CoachRequestStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachRequest_clientId_key" ON "CoachRequest"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "User_coachCode_key" ON "User"("coachCode");

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

