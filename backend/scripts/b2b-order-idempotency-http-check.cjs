// Real Nest DTO/HTTP and concurrent PostgreSQL transactions. Local fixtures are removed in finally.
// Only integration configuration is synthetic; no Redis, 1C, email or payment provider is contacted.
require('reflect-metadata');
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing'), { ValidationPipe, UnauthorizedException } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { JwtAuthGuard } = require('../dist/src/auth/jwt-auth.guard');
const { B2BController } = require('../dist/src/b2b/b2b.controller');
const { B2BService } = require('../dist/src/b2b/b2b.service');
const { SalonBookingService } = require('../dist/src/b2b/salon-booking.service');
const { OneCSyncService } = require('../dist/src/1c-sync/1c-sync.service');
const { BackgroundJobsService } = require('../dist/src/background-jobs/background-jobs.service');
const { JobPolicy } = require('../dist/src/background-jobs/job-policy');
const { BusinessContextMiddleware } = require('../dist/src/b2b/business-context');

async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname;
  assert.ok(['localhost', '127.0.0.1'].includes(host) || (host === 'postgres' && process.env.B2B_ORDER_TEST_ALLOW_DOCKER === '1'), 'Local database only');
  assert.notEqual(process.env.ECOSYSTEM_AUTOMATION_ENABLED, 'true', 'Background workers must remain disabled');
  assert.notEqual(process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED, 'true', 'External calls must remain disabled');
  const db = new PrismaClient(), prefix = `qa-b2b-retry-${randomUUID()}`;
  let initialMembershipRead;
  const findMemberships = db.organizationMember.findMany.bind(db.organizationMember);
  db.organizationMember.findMany = async args => {
    const rows = await findMemberships(args);
    if (initialMembershipRead && args?.include?.organization) { const notify = initialMembershipRead; initialMembershipRead = null; notify(); }
    return rows;
  };
  const userIds = [randomUUID(), randomUUID(), randomUUID()], orgIds = [randomUUID(), randomUUID()];
  const productId = randomUUID(), variantId = randomUUID();
  let app, failStage = false;
  try {
    await db.$transaction(async tx => {
      for (const [index, id] of userIds.entries()) await tx.user.create({ data: { id, email: `${prefix}-${index}@example.invalid`, password: 'not-a-login', role: 'CUSTOMER_B2B', firstName: 'QA' } });
      for (const id of orgIds) await tx.organization.create({ data: { id, name: prefix, status: 'ACTIVE', discountTier: 10 } });
      for (const [index, id] of userIds.entries()) await tx.organizationMember.create({ data: { organizationId: index === 2 ? orgIds[1] : orgIds[0], userId: id, role: index === 1 ? 'BUYER' : 'OWNER', canOrder: true, canSeeFinance: true } });
      await tx.product.create({ data: { id: productId, nameRu: 'QA идемпотентность', sku: prefix, slug: prefix, basePrice: '0.10', variants: { create: { id: variantId, sku: prefix + '-v', name: 'QA', price: '0.10', stock: 100, options: {} } } } });
    });
    const jobs = new BackgroundJobsService(db, {}, new JobPolicy({}));
    jobs.register('1C_ORDER_EXPORT', async () => { throw new Error('External handler must not run'); });
    const oneC = new OneCSyncService(db, jobs, {}), originalStage = oneC.stageOrderExport.bind(oneC);
    oneC.stageOrderExport = async (tx, id, actor) => {
      // Exercise the real durable staging path without changing the company's integration settings.
      const stagedTx = new Proxy(tx, { get(target, key) { return key === 'ecosystemIntegration'
        ? { findUnique: async () => ({ isEnabled: true, config: { baseUrl: 'https://example.invalid/' }, configuredSecretKeys: ['password'] }) }
        : Reflect.get(target, key); } });
      const result = await originalStage(stagedTx, id, actor);
      if (failStage) { failStage = false; throw new Error('Synthetic failure after durable job write'); }
      return result;
    };
    const actors = new Set(userIds);
    const module = await Test.createTestingModule({ controllers: [B2BController], providers: [B2BService,
      { provide: PrismaService, useValue: db }, { provide: OneCSyncService, useValue: { stageOrderExport: (...args) => oneC.stageOrderExport(...args) } }, { provide: SalonBookingService, useValue: new SalonBookingService(db) },
    ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context) {
      const req = context.switchToHttp().getRequest(), id = String(req.headers.authorization || '').replace('Bearer ', '');
      if (!actors.has(id)) throw new UnauthorizedException(); req.user = { sub: id, role: 'CUSTOMER_B2B' }; return true;
    } }).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api/v1');
    const businessContext = new BusinessContextMiddleware();
    app.use('/api/v1/b2b', (request, response, next) => businessContext.use(request, response, next));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    async function call(body, status = 201, actor = userIds[0], path = '/b2b/orders', organizationId) {
      const response = await fetch(base + '/api/v1' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json', ...(organizationId ? { 'X-B2B-Organization-Id': organizationId } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json(); assert.equal(response.status, status, JSON.stringify(result)); return result;
    }
    const dto = { requestKey: randomUUID(), items: [{ variantId, quantity: 2 }] };
    await call({ items: dto.items }, 400); await call(dto, 401, 'outsider');
    const results = await Promise.all(Array.from({ length: 12 }, () => call(dto)));
    const original = results[0]; assert.equal(new Set(results.map(order => order.id)).size, 1);
    assert.equal(await db.order.count({ where: { userId: userIds[0] } }), 1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reserved, 2);
    assert.equal(await db.jobRun.count({ where: { initiatedById: userIds[0] } }), 1);
    assert.equal(original.finalAmount, '0.18'); assert.equal(original.discountAmount, '0.02');
    await call({ ...dto, items: [{ variantId, quantity: 3 }] }, 409);
    assert.equal((await call(dto)).id, original.id, 'Retry after a lost HTTP response returns the original order');
    const sameOrg = await call(dto, 201, userIds[1]), otherOrg = await call(dto, 201, userIds[2]);
    assert.notEqual(sameOrg.id, original.id); assert.notEqual(otherOrg.id, original.id);
    assert.equal(otherOrg.organizationId, orgIds[1]);
    await call({ requestKey: randomUUID() }, 404, userIds[2], `/b2b/orders/${original.id}/repeat`);
    const repeatBody = { requestKey: randomUUID() };
    const repeats = await Promise.all(Array.from({ length: 8 }, () => call(repeatBody, 201, userIds[0], `/b2b/orders/${original.id}/repeat`)));
    assert.equal(new Set(repeats.map(order => order.id)).size, 1); assert.notEqual(repeats[0].id, original.id);
    const counts = { orders: await db.order.count({ where: { userId: { in: userIds } } }), jobs: await db.jobRun.count({ where: { initiatedById: { in: userIds } } }),
      reserved: (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reserved };
    failStage = true; const failing = { requestKey: randomUUID(), items: [{ variantId, quantity: 1 }] };
    await call(failing, 500);
    assert.equal(await db.order.count({ where: { userId: { in: userIds } } }), counts.orders, 'Order rolls back on staging failure');
    assert.equal(await db.jobRun.count({ where: { initiatedById: { in: userIds } } }), counts.jobs, 'Staged export rolls back with the order');
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reserved, counts.reserved, 'Stock reservation rolls back');
    await call(failing); // The same key remains usable after a proven rollback.
    await db.organizationMember.updateMany({ where: { userId: userIds[1] }, data: { canOrder: false } });
    await call(dto, 403, userIds[1]); // Current authorization is checked even for a replay.
    for (const status of ['PROSPECT', 'ON_HOLD', 'ARCHIVED']) {
      await db.organization.update({ where: { id: orgIds[0] }, data: { status } });
      await call(dto, 403);
      await call({ requestKey: randomUUID() }, 403, userIds[0], `/b2b/orders/${original.id}/repeat`);
      const profile = await call(undefined, 200, userIds[0], '/b2b/profile');
      assert.equal(profile.membership.canOrder, false); assert.equal(profile.capabilities.purchasing, false); assert.ok(profile.capabilities.purchaseRestriction);
    }
    await db.organization.update({ where: { id: orgIds[0] }, data: { status: 'ACTIVE' } });
    for (const role of ['CUSTOMER_B2C', 'WAREHOUSE']) {
      await db.user.update({ where: { id: userIds[0] }, data: { role } });
      await call(dto, 404); // Even an old B2B JWT cannot use a changed account role.
    }
    await db.user.update({ where: { id: userIds[0] }, data: { role: 'CUSTOMER_B2B', isActive: false } }); await call(dto, 404);
    await db.user.update({ where: { id: userIds[0] }, data: { isActive: true } });
    async function changeWhileWaiting(change, expectedStatus) {
      let unlock, acquired;
      const ready = new Promise(resolve => acquired = resolve), gate = new Promise(resolve => unlock = resolve);
      const before = { count: await db.order.count({ where: { userId: userIds[0] } }), reserved: (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reserved };
      const blocker = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${orgIds[0]} FOR UPDATE`; acquired(); await gate; await change(tx); }, { timeout: 15000 });
      await ready;
      const initial = new Promise(resolve => initialMembershipRead = resolve);
      const purchase = call({ requestKey: randomUUID(), items: [{ variantId, quantity: 1 }] }, expectedStatus);
      try { await initial; } finally { unlock(); }
      await blocker; const result = await purchase;
      if (expectedStatus !== 201) {
        assert.equal(await db.order.count({ where: { userId: userIds[0] } }), before.count, 'Revocation committed before the order lock prevents creation');
        assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).reserved, before.reserved);
      }
      return result;
    }
    await changeWhileWaiting(tx => tx.organizationMember.updateMany({ where: { organizationId: orgIds[0], userId: userIds[0] }, data: { isActive: false } }), 404);
    await db.organizationMember.updateMany({ where: { organizationId: orgIds[0], userId: userIds[0] }, data: { isActive: true } });
    await changeWhileWaiting(tx => tx.user.update({ where: { id: userIds[0] }, data: { isActive: false } }), 404);
    await db.user.update({ where: { id: userIds[0] }, data: { isActive: true } });
    await changeWhileWaiting(tx => tx.organization.update({ where: { id: orgIds[0] }, data: { status: 'ON_HOLD' } }), 403);
    await db.organization.update({ where: { id: orgIds[0] }, data: { status: 'ACTIVE' } });
    const repriced = await changeWhileWaiting(tx => tx.organization.update({ where: { id: orgIds[0] }, data: { discountTier: 20 } }), 201);
    assert.equal(repriced.finalAmount, '0.08', 'Commercial terms are read after the organization lock');
    const redacted = await changeWhileWaiting(tx => tx.organizationMember.updateMany({ where: { organizationId: orgIds[0], userId: userIds[0] }, data: { canSeeFinance: false } }), 201);
    assert.equal(redacted.finalAmount, null, 'The response uses current finance visibility');
    await db.organizationMember.updateMany({ where: { organizationId: orgIds[0], userId: userIds[0] }, data: { canSeeFinance: true } });
    await db.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
    assert.equal((await call(dto)).id, original.id, 'Replay is independent of current product visibility/stock');
    await db.organizationMember.create({ data: { organizationId: orgIds[1], userId: userIds[0], role: 'OWNER', canOrder: true, canSeeFinance: true } });
    await call(undefined, 409, userIds[0], '/b2b/profile'); await call(dto, 409);
    const memberships = await call(undefined, 200, userIds[0], '/b2b/organizations');
    assert.deepEqual(new Set(memberships.map(row => row.id)), new Set(orgIds));
    await call(dto, 404, userIds[0], '/b2b/orders', randomUUID());
    await call(dto, 404, userIds[2], '/b2b/orders', orgIds[0]);
    const scopedProfiles = await Promise.all(Array.from({ length: 12 }, (_, index) => call(undefined, 200, userIds[0], '/b2b/profile', orgIds[index % 2])));
    scopedProfiles.forEach((row, index) => assert.equal(row.id, orgIds[index % 2], 'Concurrent scopes cannot bleed across companies'));
    assert.equal((await call(dto, 201, userIds[0], '/b2b/orders', orgIds[0])).id, original.id);
    const scopedSettings = await Promise.all(orgIds.map(id => call(undefined, 200, userIds[0], '/b2b/booking-settings', id)));
    scopedSettings.forEach((row, index) => assert.equal(row.organizationId, orgIds[index], 'Salon settings share the selected scope'));
    await call(undefined, 404, userIds[2], '/b2b/booking-settings', orgIds[0]);
    await call(undefined, 403, userIds[1], '/b2b/booking-settings', orgIds[0]); // BUYER cannot read salon settings.
    assert.equal(await db.jobRun.count({ where: { initiatedById: { in: userIds }, externalJobId: { not: null } } }), 0, 'No transport was contacted');
    console.log('PASS B2B order HTTP/PostgreSQL: 12 concurrent creates + 8 repeats, single reservation/export, changed-payload 409, explicit multi-organization selection/concurrent isolation, exact money, inactive organization/account/role restrictions and atomic rollback. No external calls.');
  } finally {
    if (app) await app.close();
    await db.$transaction(async tx => {
      await tx.jobRun.deleteMany({ where: { initiatedById: { in: userIds }, jobName: '1C_ORDER_EXPORT' } });
      await tx.order.deleteMany({ where: { userId: { in: userIds }, source: 'B2B' } });
      await tx.organization.deleteMany({ where: { id: { in: orgIds }, name: prefix } });
      await tx.user.deleteMany({ where: { id: { in: userIds }, email: { startsWith: prefix } } });
      await tx.product.deleteMany({ where: { id: productId, sku: prefix } });
    });
    assert.equal(await db.order.count({ where: { userId: { in: userIds } } }), 0);
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
