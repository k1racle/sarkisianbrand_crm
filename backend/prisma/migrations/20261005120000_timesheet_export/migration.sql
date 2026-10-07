INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70661005-1200-4000-8000-000000000001','work_time.export','work_time','export','Выгрузка доступного табеля команды в Excel') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id
 FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('EXECUTIVE'),('SUPERVISOR')) roles(role)
 WHERE p.key='work_time.export' ON CONFLICT DO NOTHING;
