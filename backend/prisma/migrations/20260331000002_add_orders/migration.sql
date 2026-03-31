-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'PICKUP', 'LOCAL');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateTable Order
CREATE TABLE "Order" (
    "id"            TEXT NOT NULL,
    "number"        INTEGER NOT NULL,
    "customerName"  TEXT NOT NULL,
    "customerPhone" TEXT,
    "address"       TEXT,
    "type"          "OrderType" NOT NULL DEFAULT 'DELIVERY',
    "status"        "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes"         TEXT,
    "total"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tenantId"      TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrderItem
CREATE TABLE "OrderItem" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "price"     DOUBLE PRECISION NOT NULL,
    "quantity"  INTEGER NOT NULL DEFAULT 1,
    "total"     DOUBLE PRECISION NOT NULL,
    "notes"     TEXT,
    "orderId"   TEXT NOT NULL,
    "productId" TEXT,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
