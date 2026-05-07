-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM (
    'LoginSucceeded',
    'PlanCreated',
    'PlanSaved',
    'CheckInSubmitted',
    'CheckInReviewed'
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" SERIAL NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_occurredAt_idx" ON "AuditEvent"("actorUserId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_occurredAt_idx" ON "AuditEvent"("eventType", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_subjectType_subjectId_occurredAt_idx" ON "AuditEvent"("subjectType", "subjectId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
