-- CreateTable
CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "replacedFromId" TEXT,

    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileSession_tokenHash_key" ON "MobileSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MobileSession_replacedFromId_key" ON "MobileSession"("replacedFromId");

-- CreateIndex
CREATE INDEX "MobileSession_userId_idx" ON "MobileSession"("userId");

-- CreateIndex
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_replacedFromId_fkey" FOREIGN KEY ("replacedFromId") REFERENCES "MobileSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
