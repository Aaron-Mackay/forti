-- AlterTable
ALTER TABLE "DayMetric" ADD COLUMN     "caloriesTarget" INTEGER,
ADD COLUMN     "carbsTarget" INTEGER,
ADD COLUMN     "fatTarget" INTEGER,
ADD COLUMN     "proteinTarget" INTEGER,
ADD COLUMN     "sleepMinsTarget" INTEGER,
ADD COLUMN     "stepsTarget" INTEGER;

-- CreateTable
CREATE TABLE "Supplement" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "notes" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplement_userId_idx" ON "Supplement"("userId");

-- AddForeignKey
ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
