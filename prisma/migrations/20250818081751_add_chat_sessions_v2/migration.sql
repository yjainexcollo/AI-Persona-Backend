/*
  Warnings:

  - The `coreExpertise` column on the `personas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `keyResponsibility` column on the `personas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `painPoints` column on the `personas` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `traits` column on the `personas` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "chatSessionId" TEXT;

-- AlterTable
ALTER TABLE "personas" DROP COLUMN "coreExpertise",
ADD COLUMN     "coreExpertise" JSONB,
DROP COLUMN "keyResponsibility",
ADD COLUMN     "keyResponsibility" JSONB,
DROP COLUMN "painPoints",
ADD COLUMN     "painPoints" JSONB,
DROP COLUMN "traits",
ADD COLUMN     "traits" JSONB;

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_sessionId_key" ON "chat_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "chat_sessions_conversationId_idx" ON "chat_sessions"("conversationId");

-- CreateIndex
CREATE INDEX "chat_sessions_personaId_idx" ON "chat_sessions"("personaId");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_idx" ON "chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "chat_sessions_sessionId_idx" ON "chat_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions"("status");

-- CreateIndex
CREATE INDEX "chat_sessions_startedAt_idx" ON "chat_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "chat_sessions_lastActivityAt_idx" ON "chat_sessions"("lastActivityAt");

-- CreateIndex
CREATE INDEX "chat_sessions_conversationId_status_idx" ON "chat_sessions"("conversationId", "status");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_status_idx" ON "chat_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "messages_chatSessionId_idx" ON "messages"("chatSessionId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
