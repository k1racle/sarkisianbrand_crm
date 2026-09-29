// Real PostgreSQL + real Nest read endpoints/permission guard, synthetic identity transport only.
// All fixtures are rolled back. No application workers, external calls or production credentials.
require('dotenv').config();
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { UnauthorizedException, ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { PrismaClient } = require('@prisma/client');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { CrmController } = require('../dist/src/crm/crm.controller');
const { CrmLeadWriteService } = require('../dist/src/crm/lead-write.service');
const { CrmService } = require('../dist/src/crm/crm.service');
const { CrmTaskWriteService } = require('../dist/src/crm/task-write.service');
const { CrmReadService } = require('../dist/src/crm/crm-read.service');
const { CrmReadAccess, CrmReadPolicy } = require('../dist/src/crm/read-access');
const { JwtAuthGuard } = require('../dist/src/auth/jwt-auth.guard');
const { RolesGuard } = require('../dist/src/common/guards/roles.guard');
const { resolveProfileScopes } = require('../dist/src/auth/access-scope-policy');
const checks = [];
async function main() {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_READ_CONTRACT');
  let employeeId, app;
  try {
    await db.$transaction(async tx => {
      const sales = await tx.crmDepartment.create({ data: { name: `Read contract ${randomUUID()}` } });
      const childDept = await tx.crmDepartment.create({ data: { name: 'Read child', parentId: sales.id } });
      const foreignDept = await tx.crmDepartment.create({ data: { name: 'Read foreign' } });
      const createUser = departmentId => tx.user.create({ data: { departmentId, role: 'MANAGER_SALES', email: `read-${randomUUID()}@example.invalid`, password: 'not-a-login' } });
      const employee = await createUser(sales.id), colleague = await createUser(sales.id), child = await createUser(childDept.id), foreign = await createUser(foreignDept.id); employeeId = employee.id;
      const permission = await tx.permission.findUniqueOrThrow({ where: { key: 'crm.read' } });
      await tx.userPermission.create({ data: { userId: employee.id, permissionId: permission.id, effect: 'ALLOW' } });
      const pipeline = await tx.crmPipeline.create({ data: { name: 'Read contract pipeline', isDefault: false, stages: { create: [{ name: 'New', code: 'NEW', sortOrder: 1 }, { name: 'Won', code: 'WON', sortOrder: 2, isWon: true }] } }, include: { stages: true } });
      const stage = pipeline.stages.find(stage => stage.code === 'NEW'), won = pipeline.stages.find(stage => stage.code === 'WON');
      const ownLead = await tx.lead.create({ data: { title: 'Visible deal', source: 'CONTRACT', contactName: 'Visible', contactPhone: '', managerId: employee.id, stageId: stage.id, amount: 100, probability: 50 } });
      const foreignLead = await tx.lead.create({ data: { title: 'DO_NOT_EXPOSE_DEAL', source: 'CONTRACT', contactName: 'DO_NOT_EXPOSE_CONTACT', contactPhone: '', managerId: foreign.id, stageId: stage.id, amount: 999999 } });
      await tx.lead.create({ data: { title: 'Visible win', source: 'CONTRACT', contactName: 'Visible', contactPhone: '', managerId: employee.id, stageId: won.id, status: 'WON', closedAt: new Date(), amount: 200 } });
      await tx.interaction.createMany({ data: [{ leadId: ownLead.id, userId: employee.id, type: 'CALL', content: 'Visible call' }, { leadId: foreignLead.id, userId: foreign.id, type: 'CALL', content: 'DO_NOT_EXPOSE_CALL' }] });
      const foreignParent = await tx.task.create({ data: { title: 'DO_NOT_EXPOSE_PARENT', assignedToId: foreign.id, createdById: foreign.id } });
      const ownTask = await tx.task.create({ data: { title: 'Visible task', assignedToId: employee.id, createdById: employee.id, status: 'IN_PROGRESS', dueDate: new Date(Date.now() - 86400000), parentId: foreignParent.id, leadId: foreignLead.id } });
      const foreignChild = await tx.task.create({ data: { title: 'DO_NOT_EXPOSE_CHILD', parentId: ownTask.id, assignedToId: foreign.id, createdById: foreign.id, leadId: ownLead.id } });
      const localChild = await tx.task.create({ data: { title: 'Visible child', parentId: ownTask.id, assignedToId: employee.id, createdById: employee.id, leadId: ownLead.id } });
      const colleagueTask = await tx.task.create({ data: { title: 'Same department', assignedToId: colleague.id, createdById: colleague.id } });
      const childTask = await tx.task.create({ data: { title: 'Child department', assignedToId: child.id, createdById: child.id } });
      const ownComment = await tx.crmTaskComment.create({ data: { taskId: ownTask.id, authorId: employee.id, body: 'Visible comment' } });
      const foreignComment = await tx.crmTaskComment.create({ data: { taskId: foreignParent.id, authorId: foreign.id, body: 'DO_NOT_EXPOSE_COMMENT' } });
      await tx.crmTaskReminder.createMany({ data: [{ taskId: ownTask.id, recipientId: employee.id, remindAt: new Date() }, { taskId: ownTask.id, recipientId: foreign.id, remindAt: new Date() }] });
      const audit = await tx.auditLog.create({ data: { resource: 'crm.task', resourceId: ownTask.id, actorId: employee.id, action: 'Changed', payload: { changes: [{ field: 'title', from: '', to: 'Visible task' }, { field: 'parentId', from: null, to: foreignParent.id }], secret: 'DO_NOT_EXPOSE_AUDIT' } } });
      const foreignAudit = await tx.auditLog.create({ data: { resource: 'crm.task', resourceId: foreignParent.id, actorId: foreign.id, action: 'Changed', payload: { changes: [{ field: 'title', to: 'DO_NOT_EXPOSE_AUDIT' }] } } });
      const customer = await tx.customer.create({ data: { firstName: 'DO_NOT_EXPOSE_CUSTOMER', email: 'hidden-read@example.invalid' } });
      await tx.task.update({ where: { id: ownTask.id }, data: { customerId: customer.id } });
      const originalTask = await tx.task.findUniqueOrThrow({ where: { id: ownTask.id } });

      // A strict read-only delegate: any accidental mutation in a GET fails the test before hitting SQL.
      const forbiddenWrites = [];
      const readTx = new Proxy(tx, { get(target, key) {
        const model = Reflect.get(target, key);
        if (String(key).startsWith('$')) return (...args) => { forbiddenWrites.push(String(key)); throw Error(`Unexpected raw operation: ${String(key)}`); };
        if (!model || typeof model !== 'object') return model;
        return new Proxy(model, { get(delegate, method) {
          if (!['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'].includes(String(method))) return () => { forbiddenWrites.push(`${String(key)}.${String(method)}`); throw Error('Mutation from read'); };
          return delegate[method].bind(delegate);
        } });
      } });
      const prisma = new Proxy(readTx, { get(target, key) { return key === '$transaction' ? async fn => fn(readTx) : Reflect.get(target, key); } });
      let scope = 'OWN', denied = false, legacy = false;
      const access = { resolve: async (queryDb, actorId, purpose = 'crm.read') => {
        if (legacy) return new CrmReadAccess().resolve(queryDb, actorId, purpose);
        const actor = await queryDb.user.findUniqueOrThrow({ where: { id: actorId } });
        const departments = await queryDb.crmDepartment.findMany({ select: { id: true, parentId: true, archivedAt: true } });
        return new CrmReadPolicy(actorId, resolveProfileScopes(actor, [{ profileId: 'simulated-assignment', profileName: 'Contract', permissionKey: 'crm.read', scope, departmentIds: [] }], departments, denied ? ['crm.read'] : []), purpose);
      } };
      const module = await Test.createTestingModule({ controllers: [CrmController], providers: [CrmReadService, RolesGuard, Reflector, { provide: CrmLeadWriteService, useValue: {} },
        { provide: CrmReadAccess, useValue: access }, { provide: PrismaService, useValue: prisma },
        { provide: CrmService, useValue: {} },
        { provide: CrmTaskWriteService, useValue: {} },
      ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context) {
        const req = context.switchToHttp().getRequest();
        if (req.headers.authorization !== `Bearer contract-${employee.id}`) throw new UnauthorizedException();
        req.user = { sub: employee.id, role: 'MANAGER_SALES' }; return true;
      } }).compile();
      app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const get = async (path, status = 200, auth = true) => {
        const response = await fetch(`${base}/api/v1/crm/${path}`, { headers: auth ? { Authorization: `Bearer contract-${employee.id}` } : {} });
        const body = await response.json(); assert.equal(response.status, status, `${path}: ${body.message || 'unexpected HTTP status'}`);
        if (status === 200) assert.equal(response.headers.get('cache-control'), 'private, no-store');
        return body;
      };
      const noForeign = value => assert.ok(!JSON.stringify(value).includes('DO_NOT_EXPOSE'), 'Foreign content must not appear in a permitted response');
      await get('tasks', 401, false); await get('tasks?status=INVALID', 400);
      let rows = await get('tasks'); noForeign(rows);
      assert.deepEqual(rows.map(row => row.id).sort(), [ownTask.id, localChild.id].sort());
      const card = await get(`tasks/${ownTask.id}`); noForeign(card);
      assert.equal(card.status, 'OVERDUE'); assert.equal(card.workflowStatus, 'IN_PROGRESS');
      assert.equal(card.parent, null); assert.equal(card.parentId, null); assert.equal(card.lead, null); assert.equal(card.leadId, null); assert.equal(card.customer, null);
      assert.deepEqual(card.children.map(item => item.id), [localChild.id]); assert.equal(card._count.children, 1);
      assert.deepEqual(card.reminders.map(item => item.recipientId), [employee.id]);
      assert.deepEqual((await get('tasks?status=OVERDUE')).map(row => row.id), [ownTask.id]);
      assert.deepEqual((await get('tasks?status=IN_PROGRESS')).map(row => row.id), []);
      assert.deepEqual(await get(`tasks?assignedToId=${foreign.id}&scope=COMPANY&actorId=${foreign.id}`), []);
      for (const path of [`tasks/${foreignParent.id}`, `tasks/${foreignParent.id}/comments`, `tasks/${foreignParent.id}/history`, `leads/${foreignLead.id}`, `leads/${foreignLead.id}/history`]) await get(path, 404);
      const history = await get(`tasks/${ownTask.id}/history`); noForeign(history); assert.deepEqual(history.items[0].payload.changes.map(change => change.field), ['title']);
      await get(`tasks/${ownTask.id}/history?before=${foreignAudit.id}`, 400);
      await get(`tasks/${ownTask.id}/comments?before=${foreignComment.id}`, 400);
      assert.deepEqual((await get(`tasks/${ownTask.id}/comments`)).map(item => item.id), [ownComment.id]);
      assert.deepEqual(await get(`tasks/${ownTask.id}/comments?before=${ownComment.id}`), []);
      assert.deepEqual((await get(`tasks/${ownTask.id}/history?before=${audit.id}`)).items, []);
      checks.push('real HTTP scoped lists/direct records, no nested/ID/cursor/reminder leaks, query scope cannot override server policy');

      noForeign(await get('leads')); noForeign(await get(`leads/${ownLead.id}`));
      const funnel = await get(`pipeline?pipelineId=${pipeline.id}`); noForeign(funnel);
      assert.equal(funnel.stages.reduce((sum, row) => sum + row.leads.length, 0), 2);
      const dashboard = await get('dashboard'); noForeign(dashboard);
      assert.equal(dashboard.openLeads, 1); assert.equal(dashboard.forecast, 50); assert.equal(dashboard.wonMonth.amount, 200); assert.equal(dashboard.overdueTasks, 1); assert.equal(dashboard.activeTasks, 2);
      assert.equal(dashboard.customers, null); assert.equal(dashboard.customersAvailable, false);
      checks.push('scoped pipeline, nested lead tasks, interaction feed, forecast/counts/sums and unavailable customer count');

      scope = 'DEPARTMENT'; rows = await get('tasks'); noForeign(rows);
      assert.ok(rows.some(row => row.id === colleagueTask.id)); assert.ok(!rows.some(row => row.id === childTask.id));
      scope = 'DEPARTMENT_TREE'; rows = await get('tasks'); noForeign(rows); assert.ok(rows.some(row => row.id === childTask.id));
      scope = 'COMPANY'; assert.ok((await get('tasks')).some(row => row.id === foreignChild.id));
      denied = true; await get('tasks', 403); await get(`tasks/${ownTask.id}`, 403); await get('dashboard', 403); denied = false;
      // Current runtime resolver also re-checks personal DENY independently of transport.
      await tx.userPermission.update({ where: { userId_permissionId: { userId: employee.id, permissionId: permission.id } }, data: { effect: 'DENY' } });
      legacy = true; await get('tasks', 403); legacy = false;
      await tx.userPermission.update({ where: { userId_permissionId: { userId: employee.id, permissionId: permission.id } }, data: { effect: 'ALLOW' } });
      checks.push('OWN/department/tree/company decisions and explicit denial through HTTP; real permission guard DENY preserved');

      const before = await tx.task.findUniqueOrThrow({ where: { id: ownTask.id } });
      assert.equal(before.status, 'IN_PROGRESS'); assert.equal(before.updatedAt.getTime(), originalTask.updatedAt.getTime());
      assert.equal((await tx.lead.findUniqueOrThrow({ where: { id: ownLead.id } })).stageId, stage.id);
      assert.deepEqual(forbiddenWrites, []);
      // No-pipeline handling and legacy null-stage projection are tested without touching real pipelines.
      const emptyTx = new Proxy(readTx, { get(target, key) { if (key === 'crmPipeline') return { findFirst: async () => null, findMany: async () => [] }; return Reflect.get(target, key); } });
      const emptyDb = { $transaction: fn => fn(emptyTx) };
      const emptyReader = new CrmReadService(emptyDb, access);
      assert.equal((await emptyReader.pipeline(employee.id)).requiresSetup, true);
      assert.deepEqual(await emptyReader.pipelines(employee.id), []);
      const legacyLead = await tx.lead.create({ data: { title: 'Legacy visible', source: 'CONTRACT', contactName: 'Visible', contactPhone: '', managerId: employee.id, status: 'NEW' } });
      const defaultTx = new Proxy(readTx, { get(target, key) { if (key === 'crmPipeline') return { findFirst: async () => pipeline }; return Reflect.get(target, key); } });
      const legacyReader = new CrmReadService({ $transaction: fn => fn(defaultTx) }, access); scope = 'OWN';
      const legacyBoard = await legacyReader.pipeline(employee.id);
      assert.ok(legacyBoard.stages.find(item => item.code === 'NEW').leads.some(lead => lead.id === legacyLead.id && lead.stageId === stage.id));
      assert.equal((await tx.lead.findUniqueOrThrow({ where: { id: legacyLead.id } })).stageId, null);
      checks.push('GET delegates cannot mutate; workflow status unchanged; empty pipeline and legacy stage are read-only projections');
      await app.close(); app = null; throw rollback;
    }, { timeout: 90000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { if (app) await app.close(); try { if (employeeId) assert.equal(await db.user.count({ where: { id: employeeId } }), 0); } finally { await db.$disconnect(); } }
  console.log(JSON.stringify({ passed: checks.length, rolledBack: true, identityTransport: 'synthetic', scopeAssignments: 'simulated; rollout remains disabled', checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
