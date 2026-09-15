-- Organization membership is the authoritative signal for the B2B segment.
UPDATE "Customer" c
SET "segment" = 'B2B', "updatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM "OrganizationMember" m
  WHERE m."customerId" = c."id" AND m."isActive" = true
);
