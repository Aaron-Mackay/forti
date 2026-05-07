-- AlterTable: add createdByUserId to Exercise
ALTER TABLE "Exercise" ADD COLUMN "createdByUserId" TEXT;

-- DropIndex: remove old unique constraint
DROP INDEX IF EXISTS "Exercise_name_category_key";

-- CreateIndex: new three-column unique constraint
CREATE UNIQUE INDEX "Exercise_name_category_createdByUserId_key" ON "Exercise"("name", "category", "createdByUserId");

-- CreateIndex: index on createdByUserId
CREATE INDEX "Exercise_createdByUserId_idx" ON "Exercise"("createdByUserId");

-- AddForeignKey: link createdByUserId to User
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
