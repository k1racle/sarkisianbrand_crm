// Local-only transactional verification. Synthetic users/departments/audit are rolled back.
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { DepartmentsService } = require('../dist/src/system-settings/departments.service');
const { DepartmentDto, UpdateDepartmentDto } = require('../dist/src/system-settings/dto/department.dto');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
async function main() {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  assert.ok((await validate(plainToInstance(DepartmentDto, { name: ' ', memberIds: [] }))).length);
  assert.ok((await validate(plainToInstance(UpdateDepartmentDto, { name: 'Отдел', memberIds: [] }))).length, 'Update version required');
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_DEPARTMENTS'); let createdId;
  try {
    await db.$transaction(async tx => {
      const proxy = new Proxy(tx, { get: (target, key) => key === '$transaction' ? fn => fn(tx) : Reflect.get(target, key) });
      const service = new DepartmentsService(proxy);
      const actor = await tx.user.create({ data: { email: `dept-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'ADMIN' } });
      const customer = await tx.user.create({ data: { email: `customer-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'CUSTOMER_B2B' } });
      const first = await service.save({ name: 'Отдел контрактной проверки', memberIds: [actor.id], leaderId: actor.id }, actor.id); createdId = first.id;
      assert.equal(first.members[0].id, actor.id);
      await assert.rejects(() => service.save({ name: 'Другой отдел', memberIds: [actor.id] }, actor.id), /другом отделе/);
      await assert.rejects(() => service.save({ name: 'Клиент не сотрудник', memberIds: [customer.id] }, actor.id), /только сотрудников/);
      await assert.rejects(() => service.save({ name: 'Руководитель вне отдела', memberIds: [], leaderId: actor.id }, actor.id), /состав отдела/);
      const child = await service.save({ name: 'Дочерний отдел', parentId: first.id, memberIds: [] }, actor.id);
      await assert.rejects(() => service.save({ name: first.name, parentId: child.id, memberIds: [actor.id], version: 1 }, actor.id, first.id), /цикл/);
      await assert.rejects(() => service.archive(first.id, 1, actor.id), /дочерние отделы/);
      const changed = await service.save({ name: 'Обновлённый отдел', memberIds: [], version: 1 }, actor.id, first.id);
      assert.equal(changed.version, 2); assert.equal((await tx.user.findUnique({ where: { id: actor.id } })).departmentId, null);
      await assert.rejects(() => service.save({ name: 'Старая версия', memberIds: [], version: 1 }, actor.id, first.id), /уже изменён/);
      await service.archive(child.id, 1, actor.id); await service.archive(first.id, 2, actor.id);
      assert.ok((await tx.crmDepartment.findUnique({ where: { id: first.id } })).archivedAt);
      assert.equal(await tx.auditLog.count({ where: { resource: 'crm.department', actorId: actor.id } }), 5);
      throw rollback;
    }, { timeout: 20000 });
  } catch (e) { if (e !== rollback) throw e; }
  finally { if (createdId) assert.equal(await db.crmDepartment.count({ where: { id: createdId } }), 0); await db.$disconnect(); }
  console.log('CRM departments contract PASS: DTO, membership, tree cycles, concurrency, archive, audit; all records rolled back.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
