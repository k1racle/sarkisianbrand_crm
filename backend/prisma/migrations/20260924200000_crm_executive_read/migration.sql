-- Company visibility is not permission to change data. Preserve personal DENY
-- and all existing grants; do not enable draft access-profile assignments.
INSERT INTO "RolePermission" ("role", "permissionId")
SELECT 'EXECUTIVE'::"UserRole", id FROM "Permission" WHERE "key" = 'crm.read'
ON CONFLICT DO NOTHING;
