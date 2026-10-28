// Actual PostgreSQL + compiled services. Every fixture is inside one rolled-back
// transaction; no business data, auth sessions or external providers are changed.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { SalonBookingService } = require('../dist/src/b2b/salon-booking.service');
const { B2BService } = require('../dist/src/b2b/b2b.service');

async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname;
  assert.ok(['localhost', '127.0.0.1'].includes(host) || (host === 'postgres' && process.env.SALON_PRICE_TEST_ALLOW_DOCKER === '1'), 'Local database only');
  const db = new PrismaClient();
  const rollback = new Error('ROLLBACK_SALON_PRICE');
  let organizationId;
  try {
    await db.$transaction(async tx => {
      const organization = await tx.organization.create({ data: { name: `Price contract ${randomUUID()}`, status: 'ACTIVE' } });
      organizationId = organization.id;
      const owner = await tx.user.create({ data: { email: `salon-price-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'CUSTOMER_B2B' } });
      const member = await tx.organizationMember.create({ data: { organizationId, userId: owner.id, role: 'OWNER', canSeeFinance: true } });
      const client = await tx.b2BClient.create({ data: { organizationId, firstName: 'Проверка', phone: '79000000000' } });
      const service = await tx.b2BService.create({ data: { organizationId, name: 'Услуга', duration: 60, price: '100.10' } });
      await tx.salonBookingSetting.create({ data: { organizationId, enabled: true, timeZone: 'UTC', startMinute: 540, endMinute: 1200, masterIds: [member.id], workingDays: [0, 1, 2, 3, 4, 5, 6] } });
      const prisma = new Proxy(tx, { get: (target, key) => key === '$transaction' ? fn => fn(tx) : Reflect.get(target, key) });
      const salon = new SalonBookingService(prisma);
      const b2b = new B2BService(prisma, {}, salon);
      const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const privateVisit = await salon.create(organizationId, { clientId: client.id, serviceId: service.id, masterMemberId: member.id, startTime: `${day}T09:00:00.000Z` });
      assert.equal(privateVisit.priceSnapshot.toFixed(2), '100.10');

      await tx.b2BService.update({ where: { id: service.id }, data: { price: '200.20' } });
      const publicVisit = await salon.publicCreate(organizationId, { serviceId: service.id, masterMemberId: member.id, date: day, startTime: `${day}T11:00:00.000Z`, firstName: 'Проверка', phone: client.phone, personalDataConsent: true });
      assert.equal(Number(publicVisit.priceSnapshot).toFixed(2), '200.20');
      assert.equal('client' in publicVisit, false);

      await tx.b2BService.update({ where: { id: service.id }, data: { price: '9000.99', duration: 90 } });
      const moved = await salon.update(organizationId, privateVisit.id, { version: privateVisit.version, startTime: `${day}T10:00:00.000Z`, notes: 'Перенос без изменения согласованной цены' });
      assert.equal(moved.priceSnapshot.toFixed(2), '100.10');
      assert.equal(+moved.endTime - +moved.startTime, 3600000);
      for (const id of [publicVisit.id, privateVisit.id]) {
        const current=await tx.b2BBooking.findUniqueOrThrow({where:{id}});
        const completed=await salon.update(organizationId, id, { version: current.version, status: 'COMPLETED' });
        await salon.update(organizationId, id, { version: completed.version, status: 'COMPLETED' });
      }
      const totals = await tx.b2BClient.findUniqueOrThrow({ where: { id: client.id } });
      assert.equal(totals.totalVisits, 2);
      assert.equal(totals.totalSpent.toFixed(2), '300.30');
      assert.equal(totals.lastVisitAt.toISOString(), `${day}T11:00:00.000Z`, 'Completing an older visit must not move the last visit backwards');
      assert.equal((await b2b.dashboard(owner.id)).serviceRevenueMonth, 300.3);
      assert.deepEqual((await b2b.bookings(owner.id)).map(booking => booking.priceSnapshot.toFixed(2)).sort(), ['100.10', '200.20']);
      await tx.organizationMember.update({ where: { id: member.id }, data: { canSeeFinance: false } });
      assert.ok((await b2b.bookings(owner.id)).every(booking => booking.priceSnapshot === null));
      assert.equal((await b2b.dashboard(owner.id)).serviceRevenueMonth, null);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    if (organizationId) assert.equal(await db.organization.count({ where: { id: organizationId } }), 0, 'All fixtures must roll back');
    await db.$disconnect();
  }
  console.log('PASS salon price snapshot: private/public creation, changed service price/duration, move, completion twice, exact client totals, dashboard, finance visibility; all fixtures rolled back.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
