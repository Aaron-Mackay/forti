-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LearningPlanStepDelivered';

-- CreateTable
CREATE TABLE "LearningPlan" (
    "id" SERIAL NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPlanStep" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "assetId" TEXT,

    CONSTRAINT "LearningPlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPlanAssignment" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "stepProgress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningPlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningPlan_coachId_idx" ON "LearningPlan"("coachId");

-- CreateIndex
CREATE INDEX "LearningPlanStep_planId_idx" ON "LearningPlanStep"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPlanStep_planId_order_key" ON "LearningPlanStep"("planId", "order");

-- CreateIndex
CREATE INDEX "LearningPlanAssignment_clientId_idx" ON "LearningPlanAssignment"("clientId");

-- CreateIndex
CREATE INDEX "LearningPlanAssignment_planId_idx" ON "LearningPlanAssignment"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPlanAssignment_planId_clientId_key" ON "LearningPlanAssignment"("planId", "clientId");

-- AddForeignKey
ALTER TABLE "LearningPlan" ADD CONSTRAINT "LearningPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPlanStep" ADD CONSTRAINT "LearningPlanStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LearningPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPlanStep" ADD CONSTRAINT "LearningPlanStep_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "LibraryAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPlanAssignment" ADD CONSTRAINT "LearningPlanAssignment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LearningPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPlanAssignment" ADD CONSTRAINT "LearningPlanAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

