// Local PostgreSQL contract. Every synthetic record is inside one transaction, ALWAYS rolled back.
require('dotenv').config();
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { WorkTimeService } = require('../dist/src/work-time/work-time.service');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || (url.port && url.port !== '5432')) throw new Error('Only existing loopback PostgreSQL is allowed');
const prisma = new PrismaClient(), employeeId = randomUUID(), rollback = new Error('ROLLBACK_SYNTHETIC_WORK_TIME');
async function main() {
  let checks = 0;
  try {
    await prisma.$transaction(async db => {
      await db.user.create({ data: { id: employeeId, email: 'work-time-' + employeeId + '@example.invalid', password: 'NOT_A_LOGIN_HASH', role: 'ADMIN', timezone: 'Europe/Moscow' } });
      let now = new Date('2026-09-30T20:00:00Z');
      const scoped = new Proxy(db, { get(target, name) {
        if (name === '$queryRaw') return (strings, ...args) => String(strings[0]).includes('clock_timestamp') ? Promise.resolve([{ now }]) : target.$queryRaw(strings, ...args);
        return target[name];
      } });
      const service = new WorkTimeService({ $transaction: callback => callback(scoped) });
      const start = { action: 'START', version: 0, requestKey: randomUUID() };
      const session = await service.command(employeeId, start); checks++;
      assert.equal((await service.command(employeeId, start)).reused, true); checks++;
      await assert.rejects(service.command(employeeId, { ...start, requestKey: randomUUID() }), /уже начат/); checks++;
      const act = (action, version) => service.command(employeeId, { action, version, sessionId: session.sessionId, requestKey: randomUUID() });
      now = new Date('2026-09-30T20:30:00Z'); await act('PAUSE', 1);
      now = new Date('2026-09-30T21:30:00Z'); await act('RESUME', 2);
      await assert.rejects(act('FINISH', 1), /изменилось/); checks++;
      // Unique partial index: bypassing the service still cannot create a second open day.
      await db.$executeRawUnsafe('SAVEPOINT open_day_test');
      await assert.rejects(db.crmWorkSession.create({ data: { employeeId, startedAt: now, timezone: 'UTC' } }));
      await db.$executeRawUnsafe('ROLLBACK TO SAVEPOINT open_day_test'); checks++;
      now = new Date('2026-10-01T02:00:00Z'); await act('FINISH', 3);
      const september = await service.history(employeeId, { month: '2026-09' }), october = await service.history(employeeId, { month: '2026-10' });
      assert.deepEqual(september.totals, { workedMs: 1800000, breakMs: 1800000 }); checks++;
      assert.deepEqual(october.totals, { workedMs: 16200000, breakMs: 1800000 }); checks++;
      assert.equal((await service.current(employeeId)).active, null); checks++;
      assert.equal(await db.crmWorkTimeEvent.count({ where: { actorId: employeeId } }), 4); checks++;
      assert.equal(await db.auditLog.count({ where: { actorId: employeeId, resource: 'crm.work_time' } }), 4); checks++;
      assert.equal((await service.command(employeeId, start)).reused, true); checks++;
      assert.equal(await db.crmWorkSession.count({ where: { employeeId } }), 1); checks++;
      throw rollback;
    }, { timeout: 20000 });
  } catch (e) { if (e !== rollback) throw e; }
  assert.equal(await prisma.user.count({ where: { id: employeeId } }), 0); checks++;
  assert.equal(await prisma.crmWorkSession.count({ where: { employeeId } }), 0); checks++;
  console.log(JSON.stringify({ result: 'PASS', checks, storage: 'existing local PostgreSQL', syntheticData: 'rolled back', integrations: 'not called', concurrency: 'unit mutex + SQL constraint; independent connections not tested' }));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
