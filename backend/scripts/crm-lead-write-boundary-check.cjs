// Real HTTP/DTO/guards/business services + loopback PostgreSQL. Synthetic identities/scopes only.
// Each request uses a savepoint inside a fixture transaction; all fixture data is rolled back.
require('dotenv').config(); require('reflect-metadata');
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing'), { UnauthorizedException, ValidationPipe } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core'), { PrismaClient } = require('@prisma/client');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { CrmController } = require('../dist/src/crm/crm.controller');
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
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_LEAD_WRITE'); let app, actorId;
  try {
    await db.$transaction(async tx => {
      const sales = await tx.crmDepartment.create({ data: { name: `Lead write ${randomUUID()}` } });
      const other = await tx.crmDepartment.create({ data: { name: `Other ${randomUUID()}` } });
      const user = (departmentId, data = {}) => tx.user.create({ data: { email: `lead-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'MANAGER_SALES', departmentId, ...data } });
      const actor = await user(sales.id), colleague = await user(sales.id), foreign = await user(other.id);
      const inactive = await user(sales.id, { isActive: false }), external = await user(sales.id, { role: 'CUSTOMER_B2C' }); actorId = actor.id;
      const overrides = {};
      for (const key of ['crm.read', 'crm.write', 'customers.read', 'customers.write']) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { key } });
        overrides[key] = await tx.userPermission.create({ data: { userId: actor.id, permissionId: permission.id, effect: 'ALLOW' } });
      }
      const pipeline = await tx.crmPipeline.create({ data: { name: 'Contract pipeline', requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Цена'], stages: { create: [
        { name: 'Новые', code: 'NEW', sortOrder: 10, probability: 10 }, { name: 'Контакт', code: 'CONTACTED', sortOrder: 20, probability: 25 },
        { name: 'Успех', code: 'WON', sortOrder: 30, isWon: true, probability: 100 }, { name: 'Отказ', code: 'LOST', sortOrder: 40, isLost: true },
      ] } }, include: { stages: { orderBy: { sortOrder: 'asc' } } } });
      const [start, contacted, won, lost] = pipeline.stages;
      const archived = await tx.crmPipeline.create({ data: { name: 'Archived fixture', isActive: false, stages: { create: { name: 'Old', code: 'OLD' } } }, include: { stages: true } });
      const phone = `9${Date.now()}`, email = `match-${randomUUID()}@example.invalid`;
      const customer = await tx.customer.create({ data: { firstName: 'DO_NOT_EXPOSE', normalizedEmail: email, normalizedPhone: phone, email, phone } });
      const organization = await tx.organization.create({ data: { name: 'DO_NOT_EXPOSE' } });
      const makeLead = (managerId, data = {}) => tx.lead.create({ data: { source: 'CONTRACT', contactName: 'Contact', contactPhone: phone, stageId: start.id, managerId, createdById: managerId, ...data } });
      const own = await makeLead(actor.id, { customerId: customer.id, organizationId: organization.id, probability: 37 });
      const foreignLead = await makeLead(foreign.id, { title: 'DO_NOT_EXPOSE' });
      await tx.task.create({ data: { title: 'DO_NOT_EXPOSE', assignedToId: foreign.id, createdById: foreign.id, leadId: own.id } });
      await tx.task.create({ data: { title: 'Visible child', assignedToId: actor.id, createdById: actor.id, leadId: own.id } });
      let readScope = 'OWN', writeScope = 'OWN', customerRead, customerWrite, denied = [], runtimePolicy = false;
      const access = { resolve: async (queryDb, id, purpose = 'crm.read') => {
        if (runtimePolicy) return new CrmReadAccess().resolve(queryDb, id, purpose);
        const employee = await queryDb.user.findUniqueOrThrow({ where: { id } });
        const departments = await queryDb.crmDepartment.findMany({ select: { id: true, parentId: true, archivedAt: true } });
        const scopes = [['crm.read', readScope], ['crm.write', writeScope], ...(customerRead ? [['customers.read', customerRead]] : []), ...(customerWrite ? [['customers.write', customerWrite]] : [])];
        return new CrmReadPolicy(id, resolveProfileScopes(employee, scopes.map(([permissionKey, scope]) => ({ profileId: 'test-only', profileName: 'Contract', permissionKey, scope, departmentIds: [] })), departments, denied), purpose);
      } };
      const prisma = new Proxy(tx, { get(target, key) {
        if (key !== '$transaction') return Reflect.get(target, key);
        return async (fn, options) => {
          assert.equal(options.isolationLevel, 'Serializable');
          await tx.$executeRawUnsafe('SAVEPOINT crm_lead_write_contract');
          try { const result = await fn(tx); await tx.$executeRawUnsafe('RELEASE SAVEPOINT crm_lead_write_contract'); return result; }
          catch (error) { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT crm_lead_write_contract'); await tx.$executeRawUnsafe('RELEASE SAVEPOINT crm_lead_write_contract'); throw error; }
        };
      } });
      const module = await Test.createTestingModule({ controllers: [CrmController], providers: [CrmLeadWriteService, RolesGuard, Reflector,
        { provide: PrismaService, useValue: prisma }, { provide: CrmReadAccess, useValue: access }, { provide: CrmService, useValue: {} },
        { provide: CrmReadService, useValue: {} }, { provide: CrmTaskWriteService, useValue: {} },
      ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest(); if (req.headers.authorization !== `Bearer fixture-${actor.id}`) throw new UnauthorizedException();
        req.user = { sub: actor.id, role: actor.role }; return true;
      } }).compile();
      app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
      await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
      const call = async (method, endpoint, body, status = 200, authenticated = true) => {
        const response = await fetch(`${base}/api/v1/crm/${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer fixture-${actor.id}` } : {}) }, body: JSON.stringify(body) });
        const result = await response.json(); assert.equal(response.status, status, `${method} ${endpoint}: ${JSON.stringify(result.message || 'unexpected status')}`);
        if (status < 300 || result.candidates) assert.equal(response.headers.get('cache-control'), 'private, no-store'); return result;
      };
      const dto = (extra = {}) => ({ source: 'CONTRACT', contactName: 'Contact', contactPhone: phone, contactEmail: email, stageId: start.id, ...extra });
      const create = (extra = {}, status = 201) => call('POST', 'leads', dto(extra), status);
      const patch = (change, status = 200, id = own.id) => call('PATCH', `leads/${id}`, change, status);
      const activity = (change = {}, status = 201, id = own.id) => call('POST', `leads/${id}/interactions`, { type: 'NOTE', content: 'Visible note', ...change }, status);
      const counts = async () => ({ leads: await tx.lead.count(), customers: await tx.customer.count(), interactions: await tx.interaction.count(), audit: await tx.auditLog.count() });
      const override = (key, effect) => tx.userPermission.update({ where: { userId_permissionId: { userId: actor.id, permissionId: overrides[key].permissionId } }, data: { effect } });
      const initial = await counts();
      await call('PATCH', `leads/${own.id}`, { title: 'Denied' }, 401, false);
      await patch({ scope: 'COMPANY' }, 400); await create({ createdById: actor.id }, 400); await patch({ managerId: null }, 400);
      readScope = 'COMPANY'; await patch({ title: 'Denied' }, 404, foreignLead.id); await activity({}, 404, foreignLead.id); readScope = 'OWN';
      for (const manager of [foreign, inactive, external]) { await create({ managerId: manager.id }, 403); await patch({ managerId: manager.id }, 403); }
      await create({ customerId: customer.id }, 403); await patch({ organizationId: organization.id }, 403); await patch({ customerId: null }, 403);
      denied = ['crm.write']; await patch({ title: 'Denied' }, 403); denied = [];
      await override('crm.write', 'DENY'); await patch({ title: 'Guard deny' }, 403);
      await override('crm.write', 'ALLOW');
      assert.deepEqual(await counts(), initial); checks.push('root/operation/manager/reference boundaries; forged scope/authorship/null rejected; real guard DENY');

      const unlinked = await create({ title: '' }); assert.equal(unlinked.customerId, null); assert.ok(unlinked.title); assert.equal(await tx.customer.count(), initial.customers);
      const updated = await patch({ title: 'Updated safely' }); assert.equal(updated.customerId, null); assert.equal(updated.organizationId, null);
      assert.equal(updated.customer, null); assert.equal(updated.b2bProfile, null); assert.deepEqual(updated.tasks.map(t => t.title), ['Visible child']);
      assert.ok(!JSON.stringify(updated).includes('DO_NOT_EXPOSE')); assert.equal(updated.probability, 37);
      const note = await activity(); assert.equal(note.content, 'Visible note'); assert.ok(!('customerId' in note)); assert.ok(!('metadata' in note));
      assert.equal((await tx.interaction.findUniqueOrThrow({ where: { id: note.id } })).customerId, customer.id);
      await activity({ customerId: customer.id }, 403); await activity({ customerId: randomUUID() }, 403); await activity({ content: '   ' }, 400);
      await activity({ type: 'STAGE_CHANGED' }, 400); await activity({ type: 'CREATED' }, 400);
      checks.push('no customer auto-access without domain rights; scoped response hides foreign children/references; contact note cannot redirect customer timeline');

      writeScope = 'DEPARTMENT'; customerRead = customerWrite = 'COMPANY';
      const beforeTransfer = await tx.lead.findUniqueOrThrow({ where: { id: own.id } }), beforeCounts = await counts();
      await patch({ managerId: colleague.id }, 404); assert.deepEqual(await tx.lead.findUniqueOrThrow({ where: { id: own.id } }), beforeTransfer);
      await create({ managerId: colleague.id, contactEmail: `rollback-${randomUUID()}@example.invalid`, contactPhone: `8${Date.now()}` }, 404);
      assert.deepEqual(await counts(), beforeCounts); // Includes customer + business audit written before the post-state refusal.
      readScope = 'DEPARTMENT'; assert.equal((await patch({ managerId: colleague.id })).managerId, colleague.id);
      await patch({ managerId: foreign.id }, 403); await patch({ managerId: actor.id }); readScope = writeScope = 'OWN';
      checks.push('post-state transfer/create rejection rolls back customer, deal, interaction and audit; department transfer stays inside allowed departments');

      customerWrite = undefined;
      const matched = await create(); assert.equal(matched.customerId, customer.id);
      const fresh = { contactEmail: `fresh-${randomUUID()}@example.invalid`, contactPhone: `7${Date.now()}` };
      assert.equal((await create(fresh)).customerId, null); assert.equal(await tx.customer.count(), initial.customers);
      await create({ customerId: randomUUID() }, 403); customerRead = 'DEPARTMENT'; await create({ customerId: customer.id }, 403);
      assert.equal((await create()).customerId, null); customerRead = customerWrite = 'COMPANY';
      const newLead = await create(fresh); assert.ok(newLead.customerId); assert.equal(await tx.customer.count(), initial.customers + 1);
      const originalCustomer = await tx.customer.findUniqueOrThrow({ where: { id: customer.id } }); await create({ contactName: 'Do not overwrite customer' });
      assert.deepEqual(await tx.customer.findUniqueOrThrow({ where: { id: customer.id } }), originalCustomer);
      await tx.customer.create({ data: { firstName: 'Second match', normalizedEmail: email } });
      const beforeAmbiguous = await counts(); const ambiguity = await create({}, 409); assert.deepEqual(await counts(), beforeAmbiguous);
      assert.equal(ambiguity.code, 'CRM_CUSTOMER_MATCH_AMBIGUOUS'); assert.equal(ambiguity.candidates.length, 2);
      assert.deepEqual(Object.keys(ambiguity.candidates[0]).sort(), ['id', 'firstName', 'lastName', 'email', 'phone'].sort());
      assert.equal((await create({ customerId: customer.id })).customerId, customer.id);
      assert.equal((await create({ customerId: null })).customerId, null);
      await activity({ customerId: customer.id }); await activity({ customerId: newLead.customerId }, 403);
      checks.push('independent customer read/write; narrow scope fails closed; normalized match, explicit selection and no overwrite; ambiguous match is atomic 409');

      runtimePolicy = true;
      await override('customers.write', 'DENY');
      const beforeDeny = await tx.customer.count();
      const deniedNew = await create({ contactEmail: `deny-${randomUUID()}@example.invalid`, contactPhone: `6${Date.now()}` });
      assert.equal(deniedNew.customerId, null); assert.equal(await tx.customer.count(), beforeDeny);
      await override('customers.read', 'DENY');
      const noRead = await create(); assert.equal(noRead.customerId, null); assert.equal(await tx.customer.count(), beforeDeny);
      runtimePolicy = false; customerRead = customerWrite = undefined;
      checks.push('real legacy runtime permission resolver honors customer DENY, not just injected scoped test policies');

      const beforeInvalid = await counts();
      await patch({ stageId: archived.stages[0].id }, 400); await create({ stageId: archived.stages[0].id }, 400);
      await patch({ contactPhone: '' }, 400); await patch({ contactPhone: '   ' }, 400); await patch({ status: 'LOST' }, 400); await create({ stageId: lost.id }, 400);
      assert.deepEqual(await counts(), beforeInvalid);
      let row = await patch({ status: 'LOST', lostReason: 'Цена' }); assert.equal(row.stageId, lost.id); assert.equal(row.status, 'LOST'); assert.ok(row.closedAt);
      const closedAt = row.closedAt; row = await patch({ title: 'Still lost' }); assert.equal(row.closedAt, closedAt);
      await patch({ lostReason: null }, 400);
      row = await patch({ stageId: contacted.id }); assert.equal(row.status, 'CONTACTED'); assert.equal(row.closedAt, null);
      row = await patch({ stageId: won.id }); assert.equal(row.status, 'WON'); assert.ok(row.closedAt);
      row = await patch({ nextContactAt: '2099-01-01T00:00:00Z' }); assert.ok(row.nextContactAt);
      row = await patch({ nextContactAt: null }); assert.equal(row.nextContactAt, null);
      const lostCreated = await create({ stageId: lost.id, lostReason: 'Цена' }); assert.equal(lostCreated.status, 'LOST'); assert.ok(lostCreated.closedAt);
      checks.push('stage and status paths share active-pipeline/required-field/lost-reason rules; close date preserved on edits and reset on reopen');

      await app.close(); app = null; throw rollback;
    }, { timeout: 120000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { if (app) await app.close(); try { if (actorId) assert.equal(await db.user.count({ where: { id: actorId } }), 0); } finally { await db.$disconnect(); } }
  console.log(JSON.stringify({ passed: checks.length, rolledBack: true, identityAndAssignments: 'synthetic; rollout disabled', checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
