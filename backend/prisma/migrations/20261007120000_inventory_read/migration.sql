INSERT INTO "Permission" (id,key,resource,action,description)
 VALUES ('70661007-1200-4000-8000-000000000001','inventory.read','inventory','read','Просмотр товаров, общих остатков и резервов; заказы в пределах доступа')
 ON CONFLICT (key) DO NOTHING;
INSERT INTO "RolePermission" (role,"permissionId")
 SELECT roles.role, p.id FROM "Permission" p
 CROSS JOIN (SELECT DISTINCT role FROM "RolePermission" rp JOIN "Permission" op ON op.id=rp."permissionId" WHERE op.key='oms.read') roles
 WHERE p.key='inventory.read' ON CONFLICT DO NOTHING;
CREATE INDEX "OrderItem_variantId_orderId_idx" ON "OrderItem"("variantId","orderId");
