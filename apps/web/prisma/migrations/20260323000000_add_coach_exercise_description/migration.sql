-- CreateTable
CREATE TABLE "CoachExerciseDescription" (
    "id" SERIAL NOT NULL,
    "coachId" TEXT NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachExerciseDescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachExerciseDescription_coachId_idx" ON "CoachExerciseDescription"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachExerciseDescription_coachId_exerciseId_key" ON "CoachExerciseDescription"("coachId", "exerciseId");

-- AddForeignKey
ALTER TABLE "CoachExerciseDescription" ADD CONSTRAINT "CoachExerciseDescription_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachExerciseDescription" ADD CONSTRAINT "CoachExerciseDescription_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
