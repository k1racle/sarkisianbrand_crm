CREATE TABLE "CrmKnowledgeArticle" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "category" TEXT NOT NULL, "body" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
 "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmKnowledgeArticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmKnowledgeArticle_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','ARCHIVED')),
 CONSTRAINT "CrmKnowledgeArticle_version_check" CHECK ("version">0)
);
CREATE INDEX "CrmKnowledgeArticle_status_updatedAt_idx" ON "CrmKnowledgeArticle"("status","updatedAt");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70661005-1300-4000-8000-000000000001','knowledge.write','knowledge','write','Создание, публикация и архивирование статей базы знаний поддержки') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id
 FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('EXECUTIVE'),('IT_SUPPORT')) roles(role)
 WHERE p.key='knowledge.write' ON CONFLICT DO NOTHING;
