-- Leadership is an operational CRM role. Personal DENY and assigned profile
-- snapshots are intentionally left unchanged; no blanket administrator bypass.
INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'EXECUTIVE'::"UserRole", "id" FROM "Permission"
WHERE "key" IN (
  'crm.write', 'customers.write', 'oms.write',
  'helpdesk.read', 'helpdesk.write',
  'content_plan.read', 'content_plan.write', 'content_plan.approve',
  'marketplace.read', 'marketplace.write', 'web_orders.read', 'web_orders.write',
  'work_schedule.write', 'work_schedule.publish'
)
ON CONFLICT DO NOTHING;

-- Previously role-only operations must participate in the same permission
-- matrix as the rest of the workspace, including read-only profiles and DENY.
INSERT INTO "Permission" ("id", "key", "resource", "action", "description")
SELECT md5(v.key)::uuid::text, v.key, v.resource, v.action, v.description
FROM (VALUES
  ('promotions.read', 'promotions', 'read', 'Просмотр промокодов'),
  ('promotions.write', 'promotions', 'write', 'Создание и изменение промокодов'),
  ('gift_card_product.read', 'gift_card_product', 'read', 'Просмотр оформления и номиналов подарочных карт'),
  ('gift_card_product.write', 'gift_card_product', 'write', 'Настройка оформления и номиналов подарочных карт'),
  ('gift_cards.read', 'gift_cards', 'read', 'Просмотр выданных подарочных карт и их истории'),
  ('gift_cards.write', 'gift_cards', 'write', 'Выдача и изменение подарочных карт, раскрытие кода')
) AS v(key, resource, action, description)
ON CONFLICT ("key") DO NOTHING;

-- Preserve existing legacy-role capabilities. The site editor manages the
-- product only, never issued card balances or usable gift-card codes.
INSERT INTO "RolePermission" ("role", "permissionId")
SELECT r.role::"UserRole", p."id"
FROM (VALUES ('ADMIN'), ('SUPERVISOR'), ('MANAGER_SALES'), ('CONTENT_MANAGER')) AS r(role)
CROSS JOIN "Permission" p
WHERE p."key" IN ('promotions.read', 'promotions.write', 'gift_card_product.read', 'gift_card_product.write')
   OR (r.role <> 'CONTENT_MANAGER' AND p."key" IN ('gift_cards.read', 'gift_cards.write'))
ON CONFLICT DO NOTHING;
