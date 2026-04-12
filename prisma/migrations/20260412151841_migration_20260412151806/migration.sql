-- DropIndex
DROP INDEX "User_activePlanId_idx";

-- AlterTable
ALTER TABLE "WeeklyCheckIn" ADD COLUMN     "coachResponseUrl" TEXT;

