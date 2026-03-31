-- AlterTable: add cost and barcode columns to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" TEXT;

-- CreateIndex for barcode uniqueness per tenant
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_tenantId_key" ON "Product"("barcode", "tenantId");
