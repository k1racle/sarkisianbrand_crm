// Real Nest endpoints + PostgreSQL, synthetic identity and scoped assignments.
// Only loopback DB, all fixtures rolled back; per-request savepoints model the production atomic transaction.
require('dotenv').config(); require('reflect-metadata');
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing'), { UnauthorizedException, ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core'), { PrismaClient } = require('@prisma/client');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { CrmController } = require('../dist/src/crm/crm.controller');
const { CrmContentController } = require('../dist/src/crm/content.controller');
const { CrmContentService } = require('../dist/src/crm/content.service');
const { CrmDriveService } = require('../dist/src/crm/drive.service');
const { CrmService } = require('../dist/src/crm/crm.service');
const { CrmReadService } = require('../dist/src/crm/crm-read.service');
const { CrmTaskWriteService } = require('../dist/src/crm/task-write.service');
const { CrmLeadWriteService } = require('../dist/src/crm/lead-write.service');
const { CrmReadAccess, CrmReadPolicy } = require('../dist/src/crm/read-access');
const { resolveProfileScopes } = require('../dist/src/auth/access-scope-policy');
const { JwtAuthGuard } = require('../dist/src/auth/jwt-auth.guard');
const { RolesGuard } = require('../dist/src/common/guards/roles.guard');
const checks = [];
async function main() {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_TASK_WRITE'); let app, actorId;
  try {
    await db.$transaction(async tx => {
      const sales = await tx.crmDepartment.create({ data: { name: `Write test ${randomUUID()}` } });
      const other = await tx.crmDepartment.create({ data: { name: `Other ${randomUUID()}` } });
      const user = departmentId => tx.user.create({ data: { email: `write-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'MANAGER_SALES', departmentId } });
      const actor = await user(sales.id), colleague = await user(sales.id), foreign = await user(other.id); actorId = actor.id;
      const permissionKeys = ['crm.read', 'crm.write', 'content_plan.read', 'content_plan.write'];
      for (const key of permissionKeys) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { key } });
        await tx.userPermission.create({ data: { userId: actor.id, permissionId: permission.id, effect: 'ALLOW' } });
      }
      const makeTask = (assignedToId, data = {}) => tx.task.create({ data: { title: assignedToId === foreign.id ? 'DO_NOT_EXPOSE' : 'Visible', assignedToId, createdById: assignedToId, ...data } });
      const own = await makeTask(actor.id), anchor = await makeTask(actor.id, { position: 3 }), closed = await makeTask(actor.id, { status: 'DONE' });
      const foreignTask = await makeTask(foreign.id, { position: 99 }), foreignBefore = await tx.task.findUniqueOrThrow({ where: { id: foreignTask.id } });
      const foreignLead = await tx.lead.create({ data: { source: 'CONTRACT', contactName: 'DO_NOT_EXPOSE', contactPhone: '', managerId: foreign.id } });
      await tx.task.update({ where: { id: own.id }, data: { leadId: foreignLead.id } });
      await tx.crmTaskReminder.create({ data: { taskId: own.id, recipientId: foreign.id, remindAt: new Date() } });
      let readScope = 'OWN', writeScope = 'OWN', deny = false;
      const access = { resolve: async (queryDb, id, purpose = 'crm.read') => {
        const employee = await queryDb.user.findUniqueOrThrow({ where: { id } });
        const departments = await queryDb.crmDepartment.findMany({ select: { id: true, parentId: true, archivedAt: true } });
        return new CrmReadPolicy(id, resolveProfileScopes(employee, permissionKeys.map(permissionKey => ({ profileId: 'test-only', profileName: 'Contract', permissionKey, scope: permissionKey.endsWith('.write') ? writeScope : readScope, departmentIds: [] })), departments, deny ? ['crm.write'] : []), purpose);
      } };
      const prisma = new Proxy(tx, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key);
        return async (fn, options) => {
          assert.ok(['Serializable', 'RepeatableRead'].includes(options.isolationLevel));
          await tx.$executeRawUnsafe('SAVEPOINT crm_write_contract');
          try { const result = await fn(tx); await tx.$executeRawUnsafe('RELEASE SAVEPOINT crm_write_contract'); return result; }
          catch (error) { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT crm_write_contract'); await tx.$executeRawUnsafe('RELEASE SAVEPOINT crm_write_contract'); throw error; }
        };
      } });
      const module = await Test.createTestingModule({ controllers: [CrmController, CrmContentController], providers: [CrmReadService, CrmTaskWriteService, RolesGuard, Reflector,
        { provide: PrismaService, useValue: prisma }, { provide: CrmReadAccess, useValue: access }, { provide: CrmService, useValue: {} },
        { provide: CrmContentService, useValue: new CrmContentService(prisma, new CrmReadAccess()) }, { provide: CrmDriveService, useValue: {} }, { provide: CrmLeadWriteService, useValue: {} },
      ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx) { const req = ctx.switchToHttp().getRequest(); if (req.headers.authorization !== `Bearer fixture-${actor.id}`) throw new UnauthorizedException(); req.user = { sub: actor.id, role: actor.role }; return true; } }).compile();
      app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
      await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
      const call = async (method, endpoint, body, status = 200, authenticated = true) => {
        const response = await fetch(`${base}/api/v1/crm/${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer fixture-${actor.id}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const result = await response.json(); assert.equal(response.status, status, `${method} ${endpoint}: ${JSON.stringify(result.message || 'unexpected status')}`);
        if (status < 300) assert.equal(response.headers.get('cache-control'), 'private, no-store'); return result;
      };
      const auditCount = () => tx.auditLog.count({ where: { actorId: actor.id } });
      const noForeign = result => assert.ok(!JSON.stringify(result).includes('DO_NOT_EXPOSE'));
      await call('PATCH', `tasks/${own.id}`, { title: 'Denied' }, 401, false);
      await call('PATCH', `tasks/${own.id}`, { scope: 'COMPANY' }, 400);
      readScope = 'COMPANY';
      for (const [method, url, body] of [['PATCH', `tasks/${foreignTask.id}`, { title: 'Denied' }], ['DELETE', `tasks/${foreignTask.id}`], ['POST', `tasks/${foreignTask.id}/comments`, { body: 'Denied' }], ['POST', `tasks/${own.id}/move`, { status: 'TODO', beforeId: foreignTask.id }]]) await call(method, url, body, 404);
      await call('POST', 'tasks', { title: 'Out of scope', assignedToId: foreign.id, createdById: actor.id }, 403);
      deny = true; await call('PATCH', `tasks/${own.id}`, { title: 'Denied' }, 403); deny = false;
      assert.equal(await auditCount(), 0); checks.push('wide read cannot expand write; foreign root/comment/archive/drop/assignee and forged scope rejected');

      readScope = 'OWN';
      const updated = await call('PATCH', `tasks/${own.id}`, { title: 'Updated' }); noForeign(updated);
      assert.equal(updated.lead, null); assert.equal(updated.leadId, null); assert.deepEqual(updated.reminders, []);
      await call('POST', `tasks/${own.id}/comments`, { body: 'Visible comment' }, 201);
      await call('POST', `tasks/${own.id}/comments`, { body: '   ' }, 400);
      await call('PATCH', `tasks/${own.id}`, { leadId: foreignLead.id }, 403);
      await call('POST', `tasks/${own.id}/move`, { status: 'TODO', beforeId: anchor.id }, 201);
      const unchanged = await tx.task.findUniqueOrThrow({ where: { id: foreignTask.id } });
      assert.equal(unchanged.position, foreignBefore.position); assert.equal(unchanged.updatedAt.getTime(), foreignBefore.updatedAt.getTime());
      const preFailedMove = await tx.task.findUniqueOrThrow({ where: { id: own.id } }), auditBefore = await auditCount();
      await call('POST', `tasks/${own.id}/move`, { status: 'IN_PROGRESS', beforeId: closed.id }, 400);
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: own.id } })).status, preFailedMove.status); assert.equal(await auditCount(), auditBefore);
      checks.push('scoped responses, comments and ordering; foreign positions unchanged; late drop failure rolls back data and audit');

      writeScope = 'DEPARTMENT';
      const beforeTransfer = await tx.task.findUniqueOrThrow({ where: { id: own.id } });
      await call('PATCH', `tasks/${own.id}`, { assignedToId: colleague.id }, 404); // Write permits it, resulting read does not.
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: own.id } })).assignedToId, actor.id); assert.equal(await auditCount(), auditBefore);
      assert.equal((await tx.task.findUniqueOrThrow({ where: { id: own.id } })).updatedAt.getTime(), beforeTransfer.updatedAt.getTime());
      readScope = 'DEPARTMENT'; await call('PATCH', `tasks/${own.id}`, { assignedToId: colleague.id });
      await call('PATCH', `tasks/${own.id}`, { assignedToId: foreign.id }, 403);
      await call('PATCH', `tasks/${own.id}`, { assignedToId: actor.id }); readScope = writeScope = 'OWN';
      const child = await call('POST', 'tasks', { title: 'Child', parentId: own.id, assignedToId: actor.id, dueDate: '2099-01-01T00:00:00Z', reminderBeforeMinutes: 60 }, 201);
      assert.equal(await tx.crmTaskReminder.count({ where: { taskId: child.id } }), 1);
      await call('PATCH', `tasks/${child.id}`, { status: 'DONE' }); assert.equal((await tx.task.findUniqueOrThrow({ where: { id: own.id } })).progress, 100);
      await call('PATCH', `tasks/${child.id}`, { parentId: foreignTask.id }, 404);
      await call('POST', 'tasks', { title: 'Wrong parent', parentId: foreignTask.id }, 404);
      const mixedParent = await makeTask(actor.id); await makeTask(foreign.id, { parentId: mixedParent.id });
      await call('PATCH', `tasks/${mixedParent.id}`, { status: 'DONE' }, 403);
      await call('DELETE', `tasks/${child.id}`); assert.equal((await tx.task.findUniqueOrThrow({ where: { id: child.id } })).status, 'CANCELLED');
      checks.push('resulting ownership and transfer rollback; own hierarchy/progress/reminders/archive; foreign ancestors and children denied');

      const template = await tx.crmTaskTemplate.create({ data: { name: 'Contract template', title: 'From template', createdById: actor.id, defaultAssigneeId: foreign.id } });
      readScope = 'COMPANY';
      await call('POST', `task-templates/${template.id}/create-task`, {}, 403);
      const fromTemplate = await call('POST', `task-templates/${template.id}/create-task`, { assignedToId: actor.id }, 201);
      assert.equal(fromTemplate.assignedToId, actor.id);
      readScope = 'OWN';
      const publication = await tx.crmPublication.create({ data: { taskId: own.id, ideaId: randomUUID(), platform: 'VK', format: 'POST' } });
      const foreignPublication = await tx.crmPublication.create({ data: { taskId: foreignTask.id, ideaId: randomUUID(), platform: 'VK', format: 'POST' } });
      await call('POST', `content-plan/${publication.id}/comments`, { body: 'SMM comment' }, 201);
      await call('POST', `content-plan/${foreignPublication.id}/comments`, { body: 'Denied' }, 404);
      checks.push('template defaults cannot bypass assignment; content comment endpoint applies its own scoped write/read permissions');
      await app.close(); app = null; throw rollback;
    }, { timeout: 120000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { if (app) await app.close(); try { if (actorId) assert.equal(await db.user.count({ where: { id: actorId } }), 0); } finally { await db.$disconnect(); } }
  console.log(JSON.stringify({ passed: checks.length, rolledBack: true, identityAndAssignments: 'synthetic; rollout disabled', checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
