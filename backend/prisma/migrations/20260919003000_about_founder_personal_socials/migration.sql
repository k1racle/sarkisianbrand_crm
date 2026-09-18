-- Personal profiles only; never reuse or modify StorefrontSocialLink brand links.
-- Preserve order, copy and any socials already edited by the administrator.
UPDATE "StorefrontPage" SET "blocks" = (
  SELECT jsonb_agg(CASE WHEN block->>'id' = 'founder' AND block->>'kind' = 'biography' AND NOT (block ? 'socials')
    THEN block || '{"socials":{"vk":"https://vk.ru/sarkisian_sv","telegram":"https://t.me/sarkisian_sv","instagram":"https://www.instagram.com/sarkisian.sv/"}}'::jsonb
    ELSE block END ORDER BY position)
  FROM jsonb_array_elements("blocks") WITH ORDINALITY AS elements(block, position)
), "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'about' AND EXISTS (
  SELECT 1 FROM jsonb_array_elements("blocks") block
  WHERE block->>'id' = 'founder' AND block->>'kind' = 'biography' AND NOT (block ? 'socials')
);
