CREATE TABLE "SalonBookingRequest" (
  "organizationId" TEXT NOT NULL,
  "requestKeyHash" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalonBookingRequest_pkey" PRIMARY KEY ("organizationId", "requestKeyHash")
);

CREATE UNIQUE INDEX "SalonBookingRequest_bookingId_key" ON "SalonBookingRequest"("bookingId");
ALTER TABLE "SalonBookingRequest" ADD CONSTRAINT "SalonBookingRequest_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "B2BBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
