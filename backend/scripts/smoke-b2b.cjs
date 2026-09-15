const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();
const baseUrl = 'http://127.0.0.1:3000/api/v1';
const created = { clientId: null, serviceId: null, bookingId: null, ticketId: null, foreignClientId: null, foreignOrganizationId: null, orderIds: [] };
let variantBackup = null;

async function request(path, token, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (response.status !== expectedStatus) throw new Error(`${path}: ожидался HTTP ${expectedStatus}, получен ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  try {
    const auth = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: 'b2b-demo@sarkisianbrand.ru', password: 'SarkisianB2B!2026' }), headers: { authorization: '' } });
    const token = auth.accessToken;
    const profile = await request('/b2b/profile', token);
    const dashboard = await request('/b2b/dashboard', token);

    const client = await request('/b2b/clients', token, { method: 'POST', body: JSON.stringify({ firstName: 'Тест', lastName: 'Контрактный', phone: '+79995550001', tags: ['автотест'], personalDataConsent: true }) }, 201);
    created.clientId = client.id;
    const service = await request('/b2b/services', token, { method: 'POST', body: JSON.stringify({ name: 'Проверочная услуга', description: 'Создано автоматической приёмочной проверкой', duration: 60, price: 2500, color: '#f8604a' }) }, 201);
    created.serviceId = service.id;
    const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); startTime.setHours(12, 0, 0, 0);
    const booking = await request('/b2b/bookings', token, { method: 'POST', body: JSON.stringify({ clientId: client.id, serviceId: service.id, masterMemberId: profile.members[0].id, startTime: startTime.toISOString(), notes: 'Приёмочный сценарий' }) }, 201);
    created.bookingId = booking.id;
    await request('/b2b/bookings', token, { method: 'POST', body: JSON.stringify({ clientId: client.id, serviceId: service.id, masterMemberId: profile.members[0].id, startTime: startTime.toISOString() }) }, 409);
    await request(`/b2b/bookings/${booking.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) });
    const updatedClient = await prisma.b2BClient.findUniqueOrThrow({ where: { id: client.id } });
    if (updatedClient.totalVisits !== 1 || Number(updatedClient.totalSpent) !== 2500) throw new Error('Завершённая запись не обновила историю клиента');

    const catalog = await request('/b2b/catalog', token);
    const variant = catalog.flatMap(product => product.variants).find(item => item.available >= 2);
    if (!variant) throw new Error('Нет варианта товара с остатком для проверки B2B-заказа');
    variantBackup = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { id: true, stock: true, reserved: true } });
    const order = await request('/b2b/orders', token, { method: 'POST', body: JSON.stringify({ items: [{ variantId: variant.id, quantity: 1 }], comments: 'Приёмочный сценарий B2B' }) }, 201);
    created.orderIds.push(order.id);
    const repeated = await request(`/b2b/orders/${order.id}/repeat`, token, { method: 'POST' }, 201);
    created.orderIds.push(repeated.id);
    if (order.source !== 'B2B' || repeated.source !== 'B2B') throw new Error('Заказы не попали в канонический B2B-контур OMS');

    const ticket = await request('/b2b/support', token, { method: 'POST', body: JSON.stringify({ subject: 'Проверка B2B-поддержки', description: 'Автоматическая проверка поступления обращения в Helpdesk.', priority: 'MEDIUM' }) }, 201);
    created.ticketId = ticket.id;
    if (ticket.organizationId !== profile.id || ticket.source !== 'B2B') throw new Error('Helpdesk-заявка не связана с B2B-организацией');

    let foreignOrganization = await prisma.organization.findFirst({ where: { id: { not: profile.id } } });
    if (!foreignOrganization) {
      foreignOrganization = await prisma.organization.create({ data: { name: 'Изолированная тестовая организация' } });
      created.foreignOrganizationId = foreignOrganization.id;
    }
    const foreignClient = await prisma.b2BClient.create({ data: { id: randomUUID(), organizationId: foreignOrganization.id, firstName: 'Чужой клиент' } });
    created.foreignClientId = foreignClient.id;
    await request(`/b2b/clients/${foreignClient.id}`, token, { method: 'PATCH', body: JSON.stringify({ firstName: 'Недопустимое изменение' }) }, 404);

    console.log(JSON.stringify({
      success: true,
      organization: profile.name,
      dashboard: { clients: dashboard.clients, upcoming: dashboard.upcoming },
      clientLifecycle: 'создание → запись → завершение → агрегаты',
      bookingConflictProtection: true,
      orders: { created: order.orderNumber, repeated: repeated.orderNumber, source: order.source },
      helpdesk: ticket.number,
      tenantIsolation: true,
    }, null, 2));
  } finally {
    if (created.ticketId) await prisma.helpdeskTicket.deleteMany({ where: { id: created.ticketId } });
    if (created.orderIds.length) await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
    if (variantBackup) await prisma.productVariant.update({ where: { id: variantBackup.id }, data: { stock: variantBackup.stock, reserved: variantBackup.reserved } });
    if (created.bookingId) await prisma.b2BBooking.deleteMany({ where: { id: created.bookingId } });
    if (created.clientId) await prisma.b2BClient.deleteMany({ where: { id: created.clientId } });
    if (created.serviceId) await prisma.b2BService.deleteMany({ where: { id: created.serviceId } });
    if (created.foreignClientId) await prisma.b2BClient.deleteMany({ where: { id: created.foreignClientId } });
    if (created.foreignOrganizationId) await prisma.organization.deleteMany({ where: { id: created.foreignOrganizationId } });
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
