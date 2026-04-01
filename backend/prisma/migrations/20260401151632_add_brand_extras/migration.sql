/*
  Warnings:

  - You are about to drop the column `repairMarginPercent` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "repairMarginPercent",
ADD COLUMN     "brandExtras" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "categoryMargins" JSONB NOT NULL DEFAULT '{"_default": 40}';
