-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'SHARED_LINK_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'SHARED_LINK_ACCESSED';

-- CreateTable
CREATE TABLE "shared_links" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_conversationId_key" ON "shared_links"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_token_key" ON "shared_links"("token");

-- CreateIndex
CREATE INDEX "shared_links_token_idx" ON "shared_links"("token");

-- CreateIndex
CREATE INDEX "shared_links_expiresAt_idx" ON "shared_links"("expiresAt");

-- CreateIndex
CREATE INDEX "shared_links_conversationId_idx" ON "shared_links"("conversationId");

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
