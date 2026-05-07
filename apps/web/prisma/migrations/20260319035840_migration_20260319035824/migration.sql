-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "completedAt" TIMESTAMP(3),
    "energyLevel" INTEGER,
    "moodRating" INTEGER,
    "stressLevel" INTEGER,
    "sleepQuality" INTEGER,
    "recoveryRating" INTEGER,
    "adherenceRating" INTEGER,
    "completedWorkouts" INTEGER,
    "plannedWorkouts" INTEGER,
    "weekReview" TEXT,
    "coachMessage" TEXT,
    "goalsNextWeek" TEXT,
    "coachNotes" TEXT,
    "coachReviewedAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_userId_idx" ON "WeeklyCheckIn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCheckIn_userId_weekStartDate_key" ON "WeeklyCheckIn"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "WeeklyCheckIn" ADD CONSTRAINT "WeeklyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

