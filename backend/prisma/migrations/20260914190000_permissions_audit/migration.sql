-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "role" "UserRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role", "permissionId")
);

CREATE TABLE "UserPermission" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "scope" JSONB,
    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId", "permissionId")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "route" TEXT,
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_resource_createdAt_idx" ON "AuditLog"("resource", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "resource", "action", "description")
SELECT
  (substr(md5(v.key),1,8)||'-'||substr(md5(v.key),9,4)||'-'||substr(md5(v.key),13,4)||'-'||substr(md5(v.key),17,4)||'-'||substr(md5(v.key),21,12)),
  v.key, v.resource, v.action, v.description
FROM (VALUES
  ('admin.read', 'admin', 'read', 'Просмотр админки сайта'),
  ('catalog.read', 'catalog', 'read', 'Просмотр каталога'),
  ('catalog.write', 'catalog', 'write', 'Изменение каталога'),
  ('web_orders.read', 'web_orders', 'read', 'Просмотр заказов сайта'),
  ('web_orders.write', 'web_orders', 'write', 'Обработка заказов сайта'),
  ('crm.read', 'crm', 'read', 'Просмотр CRM'),
  ('crm.write', 'crm', 'write', 'Изменение CRM'),
  ('customers.read', 'customers', 'read', 'Просмотр Customer 360'),
  ('customers.write', 'customers', 'write', 'Изменение Customer 360'),
  ('marketplace.read', 'marketplace', 'read', 'Просмотр маркетплейсов'),
  ('marketplace.write', 'marketplace', 'write', 'Обработка заказов маркетплейсов'),
  ('marketplace.configure', 'marketplace', 'configure', 'Настройка подключений маркетплейсов'),
  ('oms.read', 'oms', 'read', 'Просмотр единого контура заказов'),
  ('oms.write', 'oms', 'write', 'Изменение заказов в OMS'),
  ('helpdesk.read', 'helpdesk', 'read', 'Просмотр Helpdesk'),
  ('helpdesk.write', 'helpdesk', 'write', 'Обработка обращений Helpdesk'),
  ('leadership.read', 'leadership', 'read', 'Просмотр управленческой аналитики'),
  ('integrations.read', 'integrations', 'read', 'Просмотр состояния интеграций'),
  ('integrations.write', 'integrations', 'write', 'Запуск и настройка интеграций'),
  ('security.audit.read', 'security_audit', 'read', 'Просмотр журнала безопасности'),
  ('system.manage', 'system', 'manage', 'Управление настройками экосистемы')
) AS v(key, resource, action, description);

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT role_value::"UserRole", p."id"
FROM (VALUES
  ('ADMIN', '*'),
  ('CONTENT_MANAGER', 'admin.read'), ('CONTENT_MANAGER', 'catalog.read'), ('CONTENT_MANAGER', 'catalog.write'),
  ('MANAGER_SALES', 'admin.read'), ('MANAGER_SALES', 'web_orders.read'), ('MANAGER_SALES', 'web_orders.write'), ('MANAGER_SALES', 'crm.read'), ('MANAGER_SALES', 'crm.write'), ('MANAGER_SALES', 'customers.read'), ('MANAGER_SALES', 'customers.write'), ('MANAGER_SALES', 'oms.read'),
  ('MANAGER_B2B', 'crm.read'), ('MANAGER_B2B', 'crm.write'), ('MANAGER_B2B', 'customers.read'), ('MANAGER_B2B', 'customers.write'), ('MANAGER_B2B', 'oms.read'), ('MANAGER_B2B', 'oms.write'),
  ('MARKETPLACE_MANAGER', 'marketplace.read'), ('MARKETPLACE_MANAGER', 'marketplace.write'), ('MARKETPLACE_MANAGER', 'marketplace.configure'), ('MARKETPLACE_MANAGER', 'oms.read'), ('MARKETPLACE_MANAGER', 'oms.write'),
  ('WAREHOUSE', 'admin.read'), ('WAREHOUSE', 'catalog.read'), ('WAREHOUSE', 'web_orders.read'), ('WAREHOUSE', 'web_orders.write'), ('WAREHOUSE', 'marketplace.read'), ('WAREHOUSE', 'marketplace.write'), ('WAREHOUSE', 'oms.read'), ('WAREHOUSE', 'oms.write'), ('WAREHOUSE', 'integrations.read'),
  ('IT_SUPPORT', 'helpdesk.read'), ('IT_SUPPORT', 'helpdesk.write'), ('IT_SUPPORT', 'integrations.read'),
  ('EXECUTIVE', 'leadership.read'), ('EXECUTIVE', 'customers.read'), ('EXECUTIVE', 'oms.read'),
  ('SUPERVISOR', 'admin.read'), ('SUPERVISOR', 'catalog.read'), ('SUPERVISOR', 'web_orders.read'), ('SUPERVISOR', 'web_orders.write'), ('SUPERVISOR', 'crm.read'), ('SUPERVISOR', 'crm.write'), ('SUPERVISOR', 'customers.read'), ('SUPERVISOR', 'customers.write'), ('SUPERVISOR', 'marketplace.read'), ('SUPERVISOR', 'marketplace.write'), ('SUPERVISOR', 'marketplace.configure'), ('SUPERVISOR', 'oms.read'), ('SUPERVISOR', 'oms.write'), ('SUPERVISOR', 'helpdesk.read'), ('SUPERVISOR', 'helpdesk.write'), ('SUPERVISOR', 'leadership.read'), ('SUPERVISOR', 'integrations.read')
) AS rp(role_value, permission_key)
JOIN "Permission" p ON rp.permission_key = '*' OR p."key" = rp.permission_key;
