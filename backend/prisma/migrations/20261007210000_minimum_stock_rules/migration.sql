CREATE TABLE "InventoryStockGroup" (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, "normalizedName" TEXT NOT NULL UNIQUE,
 "isActive" BOOLEAN NOT NULL DEFAULT true, version INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "InventoryStockGroupMember" (
 "groupId" TEXT NOT NULL REFERENCES "InventoryStockGroup"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 PRIMARY KEY ("groupId","productId")
);
CREATE INDEX "InventoryStockGroupMember_productId_idx" ON "InventoryStockGroupMember"("productId");
CREATE TABLE "InventoryStockRule" (
 id TEXT PRIMARY KEY, name TEXT NOT NULL,
 "variantId" TEXT REFERENCES "ProductVariant"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "productId" TEXT REFERENCES "Product"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "categoryId" TEXT REFERENCES "Category"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "groupId" TEXT REFERENCES "InventoryStockGroup"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "includeChildren" BOOLEAN NOT NULL DEFAULT true,
 threshold INTEGER NOT NULL CHECK(threshold >= 0), basis TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(basis IN ('AVAILABLE','PHYSICAL')),
 channels TEXT[] NOT NULL CHECK(cardinality(channels)>0 AND channels <@ ARRAY['WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET']::TEXT[]),
 "autoResume" BOOLEAN NOT NULL DEFAULT true, "isEnabled" BOOLEAN NOT NULL DEFAULT true,
 version INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CHECK(num_nonnulls("variantId","productId","categoryId","groupId")=1)
);
CREATE INDEX "InventoryStockRule_variantId_idx" ON "InventoryStockRule"("variantId");
CREATE INDEX "InventoryStockRule_productId_idx" ON "InventoryStockRule"("productId");
CREATE INDEX "InventoryStockRule_categoryId_idx" ON "InventoryStockRule"("categoryId");
CREATE INDEX "InventoryStockRule_groupId_idx" ON "InventoryStockRule"("groupId");
CREATE TABLE "InventoryStockRuleState" (
 "ruleId" TEXT NOT NULL REFERENCES "InventoryStockRule"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "variantId" TEXT NOT NULL REFERENCES "ProductVariant"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 triggered BOOLEAN NOT NULL, "triggeredAt" TIMESTAMP(3), "measuredQuantity" INTEGER NOT NULL,
 PRIMARY KEY("ruleId","variantId")
);
CREATE INDEX "InventoryStockRuleState_variantId_idx" ON "InventoryStockRuleState"("variantId");
CREATE TABLE "InventoryChannelStock" (
 "variantId" TEXT NOT NULL REFERENCES "ProductVariant"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 channel TEXT NOT NULL CHECK(channel IN ('WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET')),
 quantity INTEGER NOT NULL CHECK(quantity>=0), blocked BOOLEAN NOT NULL, "ruleIds" TEXT[] NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY("variantId",channel)
);
CREATE INDEX "InventoryChannelStock_channel_quantity_idx" ON "InventoryChannelStock"(channel,quantity);

CREATE FUNCTION inventory_rule_matches(rule_id TEXT, variant_id TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM "InventoryStockRule" r JOIN "ProductVariant" v ON v.id=variant_id JOIN "Product" p ON p.id=v."productId"
  WHERE r.id=rule_id AND r."isEnabled" AND p."productType"='PHYSICAL' AND (
   r."variantId"=v.id OR r."productId"=p.id OR
   EXISTS(SELECT 1 FROM "InventoryStockGroupMember" m JOIN "InventoryStockGroup" g ON g.id=m."groupId" WHERE m."groupId"=r."groupId" AND m."productId"=p.id AND g."isActive") OR
   EXISTS(WITH RECURSIVE tree(id) AS (
    SELECT r."categoryId" WHERE r."categoryId" IS NOT NULL
    UNION SELECT c.id FROM "Category" c JOIN tree t ON c."parentId"=t.id WHERE r."includeChildren"
   ) SELECT 1 FROM "ProductCategory" pc JOIN tree t ON t.id=pc."categoryId" WHERE pc."productId"=p.id)
  )
 );
$$;

CREATE FUNCTION inventory_sale_quantity(variant_id TEXT, sales_channel TEXT, physical INTEGER, reserved INTEGER) RETURNS INTEGER LANGUAGE plpgsql VOLATILE AS $$
DECLARE r RECORD; measured INTEGER;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "ProductVariant" v JOIN "Product" p ON p.id=v."productId" WHERE v.id=variant_id AND v."isActive" AND p."isActive") THEN RETURN 0; END IF;
 FOR r IN SELECT rule.*,COALESCE(s.triggered,false) AS latched FROM "InventoryStockRule" rule
  LEFT JOIN "InventoryStockRuleState" s ON s."ruleId"=rule.id AND s."variantId"=variant_id
  WHERE sales_channel=ANY(rule.channels) AND inventory_rule_matches(rule.id,variant_id)
 LOOP
  measured := CASE WHEN r.basis='AVAILABLE' THEN GREATEST(0,physical-reserved) ELSE physical END;
  IF measured<=r.threshold OR (NOT r."autoResume" AND r.latched) THEN RETURN 0; END IF;
 END LOOP;
 RETURN GREATEST(0,physical-reserved);
END;
$$;

CREATE FUNCTION inventory_refresh_variant(variant_id TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v RECORD; r RECORD; measured INTEGER; active BOOLEAN; sales_channel TEXT; desired INTEGER; reasons TEXT[];
BEGIN
 SELECT pv.*,p."isActive" AS product_active,p."productType" INTO v FROM "ProductVariant" pv JOIN "Product" p ON p.id=pv."productId" WHERE pv.id=variant_id;
 IF NOT FOUND THEN RETURN; END IF;
 DELETE FROM "InventoryStockRuleState" s WHERE s."variantId"=variant_id AND NOT inventory_rule_matches(s."ruleId",variant_id);
 FOR r IN SELECT * FROM "InventoryStockRule" rule WHERE inventory_rule_matches(rule.id,variant_id) ORDER BY rule.id LOOP
  measured := CASE WHEN r.basis='AVAILABLE' THEN GREATEST(0,v.stock-v.reserved) ELSE v.stock END;
  INSERT INTO "InventoryStockRuleState"("ruleId","variantId",triggered,"triggeredAt","measuredQuantity")
   VALUES(r.id,variant_id,measured<=r.threshold,CASE WHEN measured<=r.threshold THEN CURRENT_TIMESTAMP END,measured)
  ON CONFLICT("ruleId","variantId") DO UPDATE SET
   triggered=EXCLUDED.triggered OR (NOT r."autoResume" AND "InventoryStockRuleState".triggered),
   "triggeredAt"=CASE WHEN "InventoryStockRuleState".triggered AND (EXCLUDED.triggered OR NOT r."autoResume") THEN "InventoryStockRuleState"."triggeredAt" ELSE EXCLUDED."triggeredAt" END,
   "measuredQuantity"=measured;
 END LOOP;
 FOREACH sales_channel IN ARRAY ARRAY['WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET'] LOOP
  SELECT COALESCE(array_agg(config.id ORDER BY config.id),ARRAY[]::TEXT[]) INTO reasons FROM "InventoryStockRule" config JOIN "InventoryStockRuleState" s ON s."ruleId"=config.id
   WHERE s."variantId"=variant_id AND s.triggered AND sales_channel=ANY(config.channels);
  active := cardinality(reasons)>0;
  desired := CASE WHEN active OR NOT v."isActive" OR NOT v.product_active OR v."productType"<>'PHYSICAL' THEN 0 ELSE GREATEST(0,v.stock-v.reserved) END;
  INSERT INTO "InventoryChannelStock"("variantId",channel,quantity,blocked,"ruleIds") VALUES(variant_id,sales_channel,desired,active,reasons)
  ON CONFLICT("variantId",channel) DO UPDATE SET quantity=EXCLUDED.quantity,blocked=EXCLUDED.blocked,"ruleIds"=EXCLUDED."ruleIds",revision="InventoryChannelStock".revision+1,"changedAt"=CURRENT_TIMESTAMP
  WHERE ("InventoryChannelStock".quantity,"InventoryChannelStock".blocked,"InventoryChannelStock"."ruleIds") IS DISTINCT FROM (EXCLUDED.quantity,EXCLUDED.blocked,EXCLUDED."ruleIds");
 END LOOP;
END;
$$;
CREATE FUNCTION inventory_refresh_all() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v RECORD;
BEGIN FOR v IN SELECT id FROM "ProductVariant" ORDER BY id LOOP PERFORM inventory_refresh_variant(v.id); END LOOP; END;
$$;
CREATE FUNCTION inventory_variant_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN PERFORM inventory_refresh_variant(NEW.id); RETURN NEW; END;
$$;
CREATE TRIGGER "Inventory_variant_changed" AFTER INSERT OR UPDATE OF stock,reserved,"isActive","productId" ON "ProductVariant" FOR EACH ROW EXECUTE FUNCTION inventory_variant_changed();
CREATE FUNCTION inventory_product_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v RECORD; old_product TEXT; new_product TEXT;
BEGIN
 IF TG_TABLE_NAME='Product' THEN new_product:=NEW.id;
 ELSE IF TG_OP<>'INSERT' THEN old_product:=OLD."productId"; END IF; IF TG_OP<>'DELETE' THEN new_product:=NEW."productId"; END IF; END IF;
 FOR v IN SELECT id FROM "ProductVariant" WHERE "productId" IN (old_product,new_product) ORDER BY id LOOP PERFORM inventory_refresh_variant(v.id); END LOOP;
 RETURN NULL;
END;
$$;
CREATE TRIGGER "Inventory_product_changed" AFTER UPDATE OF "isActive","productType" ON "Product" FOR EACH ROW EXECUTE FUNCTION inventory_product_changed();
CREATE TRIGGER "Inventory_membership_changed" AFTER INSERT OR UPDATE OR DELETE ON "ProductCategory" FOR EACH ROW EXECUTE FUNCTION inventory_product_changed();
CREATE TRIGGER "Inventory_group_membership_changed" AFTER INSERT OR UPDATE OR DELETE ON "InventoryStockGroupMember" FOR EACH ROW EXECUTE FUNCTION inventory_product_changed();
CREATE FUNCTION inventory_configuration_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN PERFORM inventory_refresh_all(); RETURN NULL; END;
$$;
CREATE TRIGGER "Inventory_rules_changed" AFTER INSERT OR UPDATE OR DELETE ON "InventoryStockRule" FOR EACH STATEMENT EXECUTE FUNCTION inventory_configuration_changed();
CREATE TRIGGER "Inventory_groups_changed" AFTER UPDATE ON "InventoryStockGroup" FOR EACH STATEMENT EXECUTE FUNCTION inventory_configuration_changed();
CREATE TRIGGER "Inventory_category_tree_changed" AFTER UPDATE OF "parentId" ON "Category" FOR EACH STATEMENT EXECUTE FUNCTION inventory_configuration_changed();
SELECT inventory_refresh_all();

INSERT INTO "Permission"(id,key,resource,action,description) VALUES('70661007-2100-4000-8000-000000000001','inventory.manage','inventory','manage','Управление минимальным запасом, группами и каналами продаж') ON CONFLICT(key) DO NOTHING;
INSERT INTO "RolePermission"(role,"permissionId") SELECT roles.role,p.id FROM "Permission" p CROSS JOIN (SELECT DISTINCT role FROM "RolePermission" WHERE role IN ('ADMIN','EXECUTIVE','SUPERVISOR')) roles WHERE p.key='inventory.manage' ON CONFLICT DO NOTHING;
