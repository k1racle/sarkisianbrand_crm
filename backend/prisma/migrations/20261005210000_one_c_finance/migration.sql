CREATE TABLE "OneCOrderFinance" (
 "orderId" TEXT PRIMARY KEY REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "revision" INTEGER NOT NULL CHECK ("revision">0), "payloadHash" TEXT NOT NULL, "basisHash" TEXT NOT NULL,
 "asOf" TIMESTAMP(3) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "currency" "Currency" NOT NULL, "total" DECIMAL(15,2) NOT NULL, "paid" DECIMAL(15,2) NOT NULL,
 "refunded" DECIMAL(15,2) NOT NULL, "debt" DECIMAL(15,2) NOT NULL, "refundDue" DECIMAL(15,2) NOT NULL,
 "paymentDueAt" TIMESTAMP(3), "releaseAllowed" BOOLEAN NOT NULL, "releaseReason" TEXT NOT NULL, "documents" JSONB NOT NULL
);
CREATE TABLE "OneCOrderRequest" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "kind" TEXT NOT NULL CHECK ("kind" IN ('INVOICE','RECONCILE','RETURN_REVIEW','TERMS_REVIEW')),
 "comment" TEXT NOT NULL, "operationId" TEXT, "basisHash" TEXT NOT NULL, "sourceRevision" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','RECEIVED','COMPLETED','REJECTED')),
 "responseMessage" TEXT, "externalDocumentId" TEXT, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE ("orderId","requestKey")
);
CREATE INDEX "OneCOrderRequest_orderId_status_idx" ON "OneCOrderRequest"("orderId","status");
UPDATE "Permission" SET description='Просмотр расчётов и документов из 1С' WHERE key='order_finance.read';
UPDATE "Permission" SET description='Запросы по расчётам и документам в 1С' WHERE key='order_finance.write';
