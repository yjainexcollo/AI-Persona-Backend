-- CreateEnum
CREATE TYPE "ConversationVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'CONVERSATION_VISIBILITY_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'CONVERSATION_ARCHIVED';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "visibility" "ConversationVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE INDEX "conversations_visibility_idx" ON "conversations"("visibility");

-- CreateIndex
CREATE INDEX "conversations_archivedAt_idx" ON "conversations"("archivedAt");

-- CreateIndex
CREATE INDEX "conversations_userId_visibility_idx" ON "conversations"("userId", "visibility");
