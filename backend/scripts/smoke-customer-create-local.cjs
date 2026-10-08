// Local-only HTTP/PostgreSQL acceptance. Creates and removes its own QA contacts.
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { PrismaClient } = require('@prisma/client');
if (process.env.ALLOW_LOCAL_CUSTOMER_SMOKE !== 'true') throw Error('Explicit local QA flag required');
const base = 'http://sarkisian-customers-api-preview:3000/api/v1';
const local = Object.fromEntries(readFileSync('/run/local.env', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^(["'])(.*)\1$/, '$2')]; }));
const db = new PrismaClient(), marker = 'QA-customer-' + randomUUID();
let actorId;
async function request(path, method, body, token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
(async () => {
  try {
    const login = await request('/auth/login', 'POST', { email: local.LOCAL_ADMIN_EMAIL, password: local.LOCAL_ADMIN_PASSWORD });
    assert.equal(login.status, 200, 'Local administrator login');
    const token = login.data.accessToken;
    actorId = (await request('/auth/me', 'GET', null, token)).data.id;
    assert.ok(actorId);
    const usersBefore = await db.user.count();
    const email = marker + '@local.test';
    let digits;
    do { digits = '7999' + randomInt(1000000, 9999999); } while (await db.customer.count({ where: { normalizedPhone: digits } }));
    const contact = { firstName: marker, lastName: 'Проверка', email, phone: '+' + digits };
    assert.equal((await request('/customer-360/customers', 'POST', contact)).status, 401);
    for (const invalid of [{ firstName: ' ' }, { firstName: marker }, { ...contact, email: 'bad' }, { ...contact, createdById: randomUUID() }]) {
      assert.equal((await request('/customer-360/customers', 'POST', invalid, token)).status, 400, 'Create DTO and required contact');
    }
    const created = await request('/customer-360/customers', 'POST', contact, token);
    assert.equal(created.status, 201, 'Create contact');
    assert.equal(created.data.accountManagerId, actorId); assert.equal(created.data.source, 'MANUAL');
    assert.equal(created.data.user, null); assert.equal(created.data.canWrite, true);
    const card = await request('/customer-360/customers/' + created.data.id, 'GET', null, token);
    assert.equal(card.status, 200); assert.equal(card.data.email, email.toLowerCase());
    const list = await request('/customer-360/customers?search=' + encodeURIComponent(email), 'GET', null, token);
    assert.equal(list.data.length, 1); assert.equal(list.data[0].id, created.data.id);
    for (const query of [marker + ' Проверка', '8 (' + digits.slice(1, 4) + ') ' + digits.slice(4), digits]) {
      const found = await request('/customer-360/customers?search=' + encodeURIComponent(query), 'GET', null, token);
      assert.equal(found.status, 200); assert.equal(found.data.length, 1); assert.equal(found.data[0].id, created.data.id);
    }
    for (const duplicate of [{ firstName: marker, email: email.toUpperCase() }, { firstName: marker, phone: '8 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7) }]) {
      const result = await request('/customer-360/customers', 'POST', duplicate, token);
      assert.equal(result.status, 409); assert.equal(result.data.existingCustomerId, created.data.id);
    }
    const concurrent = { firstName: marker, email: marker + '-race@local.test' };
    const results = await Promise.all([request('/customer-360/customers', 'POST', concurrent, token), request('/customer-360/customers', 'POST', concurrent, token)]);
    assert.deepEqual(results.map(row => row.status).sort(), [201, 409]);
    assert.equal(await db.customer.count({ where: { normalizedEmail: concurrent.email.toLowerCase() } }), 1);
    assert.equal(await db.user.count(), usersBefore, 'Manual contact does not create an account');
    assert.ok(await db.auditLog.count({ where: { resource: 'customer360.customer', resourceId: created.data.id, actorId } }));
    console.log('PASS: real HTTP create/read/search, validation/auth, manager attribution, normalized duplicates, concurrent duplicate prevention and audit; no customer login created.');
  } finally {
    if (actorId) {
      const rows = await db.customer.findMany({ where: { firstName: marker, source: 'MANUAL', createdById: actorId }, select: { id: true } });
      const ids = rows.map(row => row.id);
      await db.$transaction(async tx => {
        await tx.auditLog.deleteMany({ where: { resource: 'customer360.customer', resourceId: { in: ids } } });
        await tx.customer.deleteMany({ where: { id: { in: ids }, firstName: marker, source: 'MANUAL', createdById: actorId } });
      });
      console.log('Removed local QA contacts: ' + ids.length);
    }
    await db.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
