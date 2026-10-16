CREATE TABLE "PartnerGiftShipment" (
  "id" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerGiftShipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerGiftShipment_orderId_key" ON "PartnerGiftShipment"("orderId");
CREATE UNIQUE INDEX "PartnerGiftShipment_requestKey_key" ON "PartnerGiftShipment"("requestKey");
CREATE INDEX "PartnerGiftShipment_participantId_createdAt_idx" ON "PartnerGiftShipment"("participantId", "createdAt");
CREATE INDEX "PartnerGiftShipment_createdAt_idx" ON "PartnerGiftShipment"("createdAt");
ALTER TABLE "PartnerGiftShipment" ADD CONSTRAINT "PartnerGiftShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerGiftShipment" ADD CONSTRAINT "PartnerGiftShipment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
