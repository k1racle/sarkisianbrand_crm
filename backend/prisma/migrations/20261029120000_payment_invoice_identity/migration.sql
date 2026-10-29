-- Existing invoices keep NULL. New attempts receive a unique provider-neutral
-- integer; Robokassa requires a positive 32-bit invoice identifier.
CREATE SEQUENCE "Payment_invoiceId_seq" AS INTEGER MINVALUE 1 MAXVALUE 2147483647;
ALTER TABLE "Payment" ADD COLUMN "invoiceId" INTEGER;
ALTER TABLE "Payment" ALTER COLUMN "invoiceId" SET DEFAULT nextval('"Payment_invoiceId_seq"');
ALTER SEQUENCE "Payment_invoiceId_seq" OWNED BY "Payment"."invoiceId";
CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "Payment"("invoiceId");
