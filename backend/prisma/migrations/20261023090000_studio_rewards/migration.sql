-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "restrictedUserId" TEXT;

-- CreateTable
CREATE TABLE "StudioAccount" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 1250,
    "earned" INTEGER NOT NULL DEFAULT 0,
    "upgrades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StudioRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "technique" TEXT NOT NULL DEFAULT 'combined',
    "checkpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastCheckpointAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "reward" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudioRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioRewardOffer" (
    "id" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "coinPrice" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL DEFAULT 30,
    "minimumAmount" INTEGER NOT NULL DEFAULT 0,
    "maximumDiscount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioRewardOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioRewardPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "coinPrice" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioRewardPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyRunLimit" INTEGER NOT NULL DEFAULT 20,
    "minimumRunSeconds" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioRun_userId_finishedAt_idx" ON "StudioRun"("userId", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioRewardPurchase_code_key" ON "StudioRewardPurchase"("code");

-- CreateIndex
CREATE INDEX "StudioRewardPurchase_userId_createdAt_idx" ON "StudioRewardPurchase"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioRewardPurchase_userId_requestId_key" ON "StudioRewardPurchase"("userId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTransaction_userId_requestId_key" ON "StudioTransaction"("userId", "requestId");

-- AddForeignKey
ALTER TABLE "StudioAccount" ADD CONSTRAINT "StudioAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRun" ADD CONSTRAINT "StudioRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StudioAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRewardPurchase" ADD CONSTRAINT "StudioRewardPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StudioAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRewardPurchase" ADD CONSTRAINT "StudioRewardPurchase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "StudioRewardOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRewardPurchase" ADD CONSTRAINT "StudioRewardPurchase_code_fkey" FOREIGN KEY ("code") REFERENCES "PromoCode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTransaction" ADD CONSTRAINT "StudioTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StudioAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

