-- The historical agreed price was not recorded before this migration. Backfill
-- existing visits from the current service price once; do not recalculate client
-- accumulated totals because their original settlement amounts are unknown.
ALTER TABLE "B2BBooking" ADD COLUMN "priceSnapshot" DECIMAL(15,2);

UPDATE "B2BBooking" AS booking
SET "priceSnapshot" = service."price"
FROM "B2BService" AS service
WHERE service."id" = booking."serviceId";

ALTER TABLE "B2BBooking" ALTER COLUMN "priceSnapshot" SET NOT NULL;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_priceSnapshot_nonnegative"
  CHECK ("priceSnapshot" >= 0);
