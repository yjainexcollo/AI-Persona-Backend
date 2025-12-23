/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `personas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `personas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "personas_slug_key" ON "personas"("slug");

-- CreateIndex
CREATE INDEX "personas_slug_idx" ON "personas"("slug");
