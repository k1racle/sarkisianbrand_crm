ALTER TABLE "Order" ADD COLUMN "financeVersion" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "paymentDueAt" TIMESTAMP(3);
CREATE TABLE "OrderFinanceEntry" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('RECEIPT','REFUND','CREDIT','REVERSAL','TERMS')),
 "amount" DECIMAL(15,2) NOT NULL CHECK ("amount">=0), "basisAmount" DECIMAL(15,2) NOT NULL, "currency" "Currency" NOT NULL DEFAULT 'RUB', "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "operationId" TEXT, "reversesId" TEXT UNIQUE, "document" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("orderId","requestKey")
);
CREATE INDEX "OrderFinanceEntry_orderId_createdAt_idx" ON "OrderFinanceEntry"("orderId","createdAt");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70661005-2000-4000-8000-000000000001','order_finance.read','order_finance','read','Просмотр расчётов и задолженности по заказам'),
 ('70661005-2000-4000-8000-000000000002','order_finance.write','order_finance','write','Учёт оплат, возвратов и согласование расчётов по заказам') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id
 FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('EXECUTIVE'),('SUPERVISOR'),('MANAGER_B2B')) roles(role)
 WHERE p.key='order_finance.read' ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id
 FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('EXECUTIVE')) roles(role)
 WHERE p.key='order_finance.write' ON CONFLICT DO NOTHING;
