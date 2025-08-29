/*
  Warnings:

  - A unique constraint covering the columns `[persona_id]` on the table `personas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `persona_id` to the `personas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "persona_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "personas_persona_id_key" ON "personas"("persona_id");

-- CreateIndex
CREATE INDEX "personas_persona_id_idx" ON "personas"("persona_id");
