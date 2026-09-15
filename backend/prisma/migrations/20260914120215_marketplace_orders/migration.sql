-- CreateEnum
CREATE TYPE "MarketplaceChannel" AS ENUM ('WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'ASSEMBLING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateTable
CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "channel" "MarketplaceChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'NEW',
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'RUB',
    "deliveryDate" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "items" JSONB NOT NULL,
    "payload" JSONB,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceOrder_channel_status_idx" ON "MarketplaceOrder"("channel", "status");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_createdAt_idx" ON "MarketplaceOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_channel_externalId_key" ON "MarketplaceOrder"("channel", "externalId");
