-- Course orders are isolated from physical inventory and gift certificates.
-- These records are only snapshots/intents; creating one never grants access.
CREATE TABLE "CoursePurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "tariffId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "requestKeyHash" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "courseTitle" TEXT NOT NULL,
  "tariffTitle" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'RUB',
  "accessDays" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PREPARED',
  "accountingStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "paidAt" TIMESTAMP(3),
  "accessStartsAt" TIMESTAMP(3),
  "accessExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoursePurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CoursePurchase_orderId_key" ON "CoursePurchase"("orderId");
CREATE UNIQUE INDEX "CoursePurchase_userId_requestKeyHash_key" ON "CoursePurchase"("userId", "requestKeyHash");
CREATE INDEX "CoursePurchase_userId_courseId_status_idx" ON "CoursePurchase"("userId", "courseId", "status");
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "CourseTariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
