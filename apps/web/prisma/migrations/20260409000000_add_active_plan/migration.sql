-- Add explicit active training plan pointer to User
ALTER TABLE "User"
ADD COLUMN "activePlanId" INTEGER;

-- Index for active-plan lookups
CREATE INDEX "User_activePlanId_idx" ON "User"("activePlanId");

-- One active plan per user is enforced by the nullable foreign key on User
ALTER TABLE "User"
ADD CONSTRAINT "User_activePlanId_fkey"
FOREIGN KEY ("activePlanId") REFERENCES "Plan"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
