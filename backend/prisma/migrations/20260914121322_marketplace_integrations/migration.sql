-- CreateTable
CREATE TABLE "MarketplaceIntegration" (
    "id" TEXT NOT NULL,
    "channel" "MarketplaceChannel" NOT NULL,
    "shopName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceIntegration_channel_key" ON "MarketplaceIntegration"("channel");
