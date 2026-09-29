// Loopback PostgreSQL only. All synthetic data and audit records roll back together.
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { AccessProfilesService } = require('../dist/src/system-settings/access-profiles.service');
const { taskScopeWhere, leadScopeWhere } = require('../dist/src/auth/access-scope-policy');
const checks = [];
async function main() {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_PROFILE_CONTRACT');
  let actorId, profileId;
  try {
    await db.$transaction(async tx => {
      let savepoint = 0;
      const proxy = new Proxy(tx, { get: (target, key) => key === '$transaction' ? async fn => {
        if (Array.isArray(fn)) return Promise.all(fn);
        const name = `profile_check_${++savepoint}`;
        await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
        try { const result = await fn(tx); await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`); return result; }
        catch (error) { await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`); await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`); throw error; }
      } : Reflect.get(target, key) });
      const service = new AccessProfilesService(proxy);
      const user = async role => tx.user.create({ data: { role, email: `access-${randomUUID()}@example.invalid`, password: 'not-a-login-password' } });
      const admin = await user('ADMIN'), employee = await user('MANAGER_SALES'), colleague = await user('MANAGER_SALES'), other = await user('MANAGER_B2B'); actorId = admin.id;
      await tx.session.create({ data: { userId: employee.id, refreshToken: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
      const sales = await tx.crmDepartment.create({ data: { name: 'Contract sales' } });
      const child = await tx.crmDepartment.create({ data: { name: 'Contract child', parentId: sales.id } });
      const smm = await tx.crmDepartment.create({ data: { name: 'Contract SMM' } });
      await tx.user.update({ where: { id: employee.id }, data: { departmentId: sales.id } });
      await tx.user.update({ where: { id: colleague.id }, data: { departmentId: child.id } });
      await tx.user.update({ where: { id: other.id }, data: { departmentId: smm.id } });
      const originalGrants = await tx.rolePermission.count(), originalOverrides = await tx.userPermission.count();
      const input = { name: `  Contract   ${randomUUID()}  `, description: 'Synthetic draft', grants: [
        { permissionKey: 'crm.read', scope: 'DEPARTMENT_TREE', departmentIds: [] },
        { permissionKey: 'crm.write', scope: 'OWN', departmentIds: [] },
      ] };
      const profile = await service.save(input, admin.id); profileId = profile.id;
      assert.equal(profile.assignmentReady, false); assert.equal(profile.mode, 'DRAFT_ONLY');
      assert.equal(profile.grants.length, 2); assert.equal(profile.version, 1); assert.ok(!profile.name.includes('  '));
      assert.ok((await service.list({ search: profile.name })).items.some(item => item.id === profile.id));
      const saved = await service.save({ ...input, name: profile.name, version: 1 }, admin.id, profile.id);
      assert.equal(saved.version, 2);
      await assert.rejects(() => service.save({ ...input, version: 1 }, admin.id, profile.id), /уже изменён/);
      await assert.rejects(() => service.save({ ...input, name: profile.name.toUpperCase() }, admin.id), /таким названием/);
      assert.equal((await service.get(profile.id)).version, 2);
      checks.push('create, normalized unique names, update, optimistic conflict, list');
      await assert.rejects(() => service.save({ ...input, name: randomUUID(), grants: [{ permissionKey: 'unknown.nope', scope: 'OWN', departmentIds: [] }] }, admin.id), /Неизвестное разрешение/);
      await assert.rejects(() => service.save({ ...input, name: randomUUID(), grants: [{ permissionKey: 'crm.read', scope: 'SELECTED_DEPARTMENTS', departmentIds: [] }] }, admin.id), /Выберите отделы/);
      await assert.rejects(() => service.save({ ...input, name: randomUUID(), grants: [{ permissionKey: 'crm.read', scope: 'COMPANY', departmentIds: [sales.id] }] }, admin.id), /Выберите отделы/);
      await assert.rejects(() => service.save({ ...input, name: randomUUID(), grants: [{ permissionKey: 'crm.read', scope: 'SELECTED_DEPARTMENTS', departmentIds: [randomUUID()] }] }, admin.id), /отделов/);
      checks.push('invalid permissions and selected departments rejected before replacement');

      const tasks = [], leads = [];
      for (const assigned of [employee.id, colleague.id, other.id]) {
        tasks.push(await tx.task.create({ data: { title: 'Contract task', assignedToId: assigned, createdById: admin.id } }));
        leads.push(await tx.lead.create({ data: { source: 'CONTRACT', title: 'Contract lead', contactName: 'Synthetic', contactPhone: '', managerId: assigned, createdById: admin.id } }));
      }
      const preview = await service.preview({ employeeId: employee.id, profiles: [{ id: profile.id, version: 2 }] });
      assert.equal(preview.simulation, true); assert.equal(preview.assignmentReady, false);
      const taskIds = async permission => (await tx.task.findMany({ where: { AND: [{ id: { in: tasks.map(task => task.id) } }, taskScopeWhere(preview.decisions, permission)] }, select: { id: true } })).map(task => task.id).sort();
      assert.deepEqual(await taskIds('crm.read'), tasks.slice(0, 2).map(task => task.id).sort());
      assert.deepEqual(await taskIds('crm.write'), [tasks[0].id]);
      assert.deepEqual(await taskIds('crm.export'), []);
      const visibleLeads = await tx.lead.findMany({ where: { AND: [{ id: { in: leads.map(lead => lead.id) } }, leadScopeWhere(preview.decisions, 'crm.read')] } });
      assert.deepEqual(visibleLeads.map(lead => lead.id).sort(), leads.slice(0, 2).map(lead => lead.id).sort());
      const count = await tx.task.count({ where: { AND: [{ id: { in: tasks.map(task => task.id) } }, taskScopeWhere(preview.decisions, 'crm.read')] } });
      assert.equal(count, 2);
      assert.equal(await tx.task.findFirst({ where: { AND: [{ id: tasks[2].id }, taskScopeWhere(preview.decisions, 'crm.read')] } }), null);
      const blockedWrite = await tx.task.updateMany({ where: { AND: [{ id: tasks[2].id }, taskScopeWhere(preview.decisions, 'crm.write')] }, data: { description: 'Must never be written' } });
      assert.equal(blockedWrite.count, 0);
      const scopedWrite = await tx.task.updateMany({ where: { AND: [{ id: { in: tasks.map(task => task.id) } }, taskScopeWhere(preview.decisions, 'crm.write')] }, data: { description: 'Own synthetic task' } });
      assert.equal(scopedWrite.count, 1);
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: tasks[2].id } })).description, null);
      checks.push('SQL task/lead lists, direct lookup and counts exclude foreign department; scoped write affects only OWN');

      await tx.user.update({ where: { id: colleague.id }, data: { departmentId: smm.id } });
      assert.deepEqual(await taskIds('crm.read'), [tasks[0].id]);
      const ownProfile = await service.save({ name: randomUUID(), description: '', grants: [{ permissionKey: 'crm.write', scope: 'OWN', departmentIds: [] }] }, admin.id);
      const allProfile = await service.save({ name: randomUUID(), description: '', grants: [{ permissionKey: 'crm.read', scope: 'COMPANY', departmentIds: [] }] }, admin.id);
      const combined = await service.preview({ employeeId: employee.id, profiles: [ownProfile, allProfile].map(({ id, version }) => ({ id, version })) });
      assert.deepEqual(taskScopeWhere(combined.decisions, 'crm.read'), {});
      assert.deepEqual(taskScopeWhere(combined.decisions, 'crm.write'), { OR: [{ assignedToId: employee.id }] });
      const readPermission = await tx.permission.findUniqueOrThrow({ where: { key: 'crm.read' } });
      await tx.userPermission.create({ data: { userId: employee.id, permissionId: readPermission.id, effect: 'DENY' } });
      const denied = await service.preview({ employeeId: employee.id, profiles: [{ id: allProfile.id, version: 1 }] });
      assert.equal(denied.decisions[0].allowed, false);
      checks.push('employee movement affects SQL; multi-profile read/write stay separate; DENY wins');

      await service.archive(profile.id, 2, admin.id);
      assert.ok((await service.list({ status: 'archived' })).items.some(item => item.id === profile.id));
      await assert.rejects(() => service.preview({ employeeId: employee.id, profiles: [{ id: profile.id, version: 2 }] }), /архиве/);
      await assert.rejects(() => service.archive(profile.id, 2, admin.id, true), /уже изменён/);
      const restored = await service.archive(profile.id, 3, admin.id, true); assert.equal(restored.version, 4);
      assert.equal(await tx.auditLog.count({ where: { actorId: admin.id, resourceId: profile.id } }), 4);
      assert.equal(await tx.rolePermission.count(), originalGrants);
      assert.equal(await tx.userPermission.count(), originalOverrides + 1);
      assert.equal(await tx.session.count({ where: { userId: employee.id } }), 1);
      assert.equal((await tx.user.findUniqueOrThrow({ where: { id: employee.id } })).role, 'MANAGER_SALES');
      const catalog = await service.catalog();
      assert.deepEqual(catalog.templates.find(item => item.id === 'SMM_SPECIALIST').permissionKeys, ['content_plan.read', 'content_plan.write']);
      assert.ok(catalog.templates.find(item => item.id === 'SITE_EDITOR').permissionKeys.every(key => !key.startsWith('content_plan.')));
      checks.push('archive/restore/audit, SMM/site separation, active rights and sessions unchanged');
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally {
    try {
      if (actorId) assert.equal(await db.user.count({ where: { id: actorId } }), 0);
      if (profileId) assert.equal(await db.crmAccessProfile.count({ where: { id: profileId } }), 0);
    } finally { await db.$disconnect(); }
  }
  console.log(JSON.stringify({ passed: checks.length, rolledBack: true, checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
