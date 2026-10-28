// Concurrent real PostgreSQL transactions. Only uniquely identified temporary
// salons are committed and then removed; no business records/providers touched.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { SalonBookingService } = require('../dist/src/b2b/salon-booking.service');

async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname;
  assert.ok(['localhost', '127.0.0.1'].includes(host) || (host === 'postgres' && process.env.SALON_REQUEST_TEST_ALLOW_DOCKER === '1'), 'Local database only');
  const db = new PrismaClient(), organizationIds = [], userIds = [];
  const salon = new SalonBookingService(db);
  try {
    const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    async function fixture() {
      return db.$transaction(async tx => {
        const org = await tx.organization.create({ data: { name: `Booking request ${randomUUID()}`, status: 'ACTIVE' } });
        const user = await tx.user.create({ data: { email: `salon-request-${randomUUID()}@example.invalid`, password: 'not-a-login', role: 'CUSTOMER_B2B' } });
        const member = await tx.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: 'OWNER' } });
        const service = await tx.b2BService.create({ data: { organizationId: org.id, name: 'Маникюр', duration: 60, price: '1500.25' } });
        await tx.salonBookingSetting.create({ data: { organizationId: org.id, enabled: true, timeZone: 'UTC', startMinute: 540, endMinute: 1200, masterIds: [member.id], workingDays: [0, 1, 2, 3, 4, 5, 6] } });
        return { org, user, dto: { requestKey: randomUUID(), serviceId: service.id, masterMemberId: member.id, date: day, startTime: `${day}T09:00:00.000Z`, firstName: 'Проверка', phone: '+7 900 000-00-00', personalDataConsent: true } };
      });
    }
    const f = await fixture(); organizationIds.push(f.org.id); userIds.push(f.user.id);
    const [first, concurrent] = await Promise.all([salon.publicCreate(f.org.id, f.dto), salon.publicCreate(f.org.id, { ...f.dto })]);
    assert.deepEqual(concurrent, first);
    assert.equal(await db.b2BBooking.count({ where: { organizationId: f.org.id } }), 1);
    assert.equal(await db.b2BClient.count({ where: { organizationId: f.org.id } }), 1);
    assert.equal(await db.salonBookingRequest.count({ where: { organizationId: f.org.id } }), 1);
    assert.equal('clientId' in first, false); assert.equal('phone' in first, false); assert.equal('firstName' in first, false);
    const request = await db.salonBookingRequest.findFirstOrThrow({ where: { organizationId: f.org.id } });
    assert.equal(request.requestKeyHash, createHash('sha256').update(f.dto.requestKey).digest('hex'));
    assert.equal(JSON.stringify(request.response).includes('79000000000'), false);
    await db.b2BService.update({ where: { id: f.dto.serviceId }, data: { price: '3000.50', name: 'Новый прайс' } });
    await salon.update(f.org.id, first.id, { version: 1, startTime: `${day}T11:00:00.000Z`, status: 'CONFIRMED' });
    assert.deepEqual(await salon.publicCreate(f.org.id, { ...f.dto, requestKey: f.dto.requestKey.toUpperCase(), phone: '79000000000' }), first);
    await assert.rejects(() => salon.publicCreate(f.org.id, { ...f.dto, phone: '79000000001' }), error => error.getStatus() === 409);
    await assert.rejects(() => salon.publicCreate(f.org.id, { ...f.dto, requestKey: randomUUID(), startTime: `${day}T11:00:00.000Z` }), error => error.getStatus() === 409);
    assert.equal(await db.salonBookingRequest.count({ where: { organizationId: f.org.id } }), 1, 'Rejected writes must not consume a request key');
    const secondOrg = await fixture(); organizationIds.push(secondOrg.org.id); userIds.push(secondOrg.user.id);
    const independent = await salon.publicCreate(secondOrg.org.id, { ...secondOrg.dto, requestKey: f.dto.requestKey });
    assert.notEqual(independent.id, first.id, 'A request key is scoped to its salon');
    await db.salonBookingSetting.update({ where: { organizationId: f.org.id }, data: { enabled: false } });
    await assert.rejects(() => salon.publicCreate(f.org.id, f.dto), error => error.getStatus() === 404);
  } finally {
    await db.$transaction(async tx => {
      await tx.b2BBooking.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await tx.b2BClient.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await tx.b2BService.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await tx.salonBookingSetting.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await tx.organizationMember.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await tx.organization.deleteMany({ where: { id: { in: organizationIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    assert.equal(await db.salonBookingRequest.count({ where: { organizationId: { in: organizationIds } } }), 0);
    await db.$disconnect();
  }
  console.log('PASS salon booking idempotency: concurrent same-key requests create one visit/client, immutable original confirmation, payload conflict, slot conflict rollback, organization scoping, closed salon, no personal contacts in response; all fixtures removed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
