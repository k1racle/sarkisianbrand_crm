-- Remove the redundant recommendation CTA only. Keep administrator copy and order.
UPDATE "StorefrontPage" SET "blocks" = (
  SELECT jsonb_agg(CASE WHEN block->>'id' = 'referral-rules'
    THEN block - 'buttonLabel' - 'buttonUrl' ELSE block END ORDER BY position)
  FROM jsonb_array_elements("blocks") WITH ORDINALITY AS elements(block, position)
), "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'club' AND EXISTS (
  SELECT 1 FROM jsonb_array_elements("blocks") block
  WHERE block->>'id' = 'referral-rules' AND (block ? 'buttonLabel' OR block ? 'buttonUrl')
);
