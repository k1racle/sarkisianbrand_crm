const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();
const apiBase = process.env.API_BASE || 'http://localhost:3000/api/v1';
const suffix = randomUUID().slice(0, 8);
const adminEmail = `smoke-admin-${suffix}@sarkisianbrand.local`;
const customerEmail = `smoke-b2c-${suffix}@sarkisianbrand.local`;
const adminPassword = `SmokeAdmin${suffix}7`;
const customerPassword = `SmokeClient${suffix}8`;
const resetPassword = `ResetClient${suffix}9`;
const temporaryPassword = `Temporary${suffix}6`;
let admin;
let customer;
let customerCard;

async function request(path, token, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function main() {
  admin = await prisma.user.create({ data: { email: adminEmail, password: await bcrypt.hash(adminPassword, 12), firstName: 'Smoke', lastName: 'Admin', role: 'ADMIN', passwordChangedAt: new Date() } });
  customer = await prisma.user.create({ data: { email: customerEmail, password: await bcrypt.hash(customerPassword, 12), firstName: 'Smoke', lastName: 'Client', role: 'CUSTOMER_B2C', passwordChangedAt: new Date() } });
  customerCard = await prisma.customer.create({ data: { userId: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email, normalizedEmail: customer.email, segment: 'B2C', source: 'SMOKE' } });

  const adminLogin = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: adminEmail, password: adminPassword }) });
  const customerLogin = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: customerEmail, password: customerPassword }) });
  const profile = await request('/auth/profile', customerLogin.accessToken);
  if (!profile.sessions.length) throw new Error('Сессия не появилась в профиле');
  await request('/auth/profile', customerLogin.accessToken, { method: 'PATCH', body: JSON.stringify({ city: 'Москва', country: 'RU', timezone: 'Europe/Moscow', notificationPreferences: { email: true, push: false, chat: true } }) });

  const accounts = await request(`/system-settings/accounts?type=B2C&search=${encodeURIComponent(customerEmail)}&page=1&limit=30`, adminLogin.accessToken);
  if (accounts.total !== 1 || accounts.items[0].id !== customer.id) throw new Error('Тестовый B2C-аккаунт не найден в реестре');

  await request('/auth/profile/change-request', customerLogin.accessToken, { method: 'POST', body: JSON.stringify({ firstName: 'Проверенный', lastName: 'Клиент' }) });
  const changes = await request('/system-settings/profile-change-requests', adminLogin.accessToken);
  const change = changes.find((item) => item.userId === customer.id);
  if (!change) throw new Error('Запрос изменения профиля не попал администратору');
  await request(`/system-settings/profile-change-requests/${change.id}/review`, adminLogin.accessToken, { method: 'POST', body: JSON.stringify({ status: 'APPROVED' }) });

  const reset = await request(`/system-settings/accounts/${customer.id}/password-reset`, adminLogin.accessToken, { method: 'POST' });
  const resetToken = new URL(reset.resetUrl).searchParams.get('token');
  await request('/auth/password-reset/complete', '', { method: 'POST', body: JSON.stringify({ token: resetToken, newPassword: resetPassword }) });
  await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: customerEmail, password: resetPassword }) });

  await request(`/system-settings/accounts/${customer.id}/temporary-password`, adminLogin.accessToken, { method: 'POST', body: JSON.stringify({ currentAdminPassword: adminPassword, temporaryPassword }) });
  const temporaryLogin = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: customerEmail, password: temporaryPassword }) });
  if (!temporaryLogin.user.forcePasswordChange) throw new Error('Для временного пароля не включена обязательная замена');

  const verified = await prisma.user.findUnique({ where: { id: customer.id }, include: { customer: true } });
  if (verified.firstName !== 'Проверенный' || verified.customer?.firstName !== 'Проверенный') throw new Error('Подтверждённые данные не синхронизированы с Customer 360');
  console.log(JSON.stringify({ ok: true, profile: true, sessions: true, registry: true, changeApproval: true, resetLink: true, temporaryPassword: true, customer360Sync: true }, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (customerCard) await prisma.customer.deleteMany({ where: { id: customerCard.id } });
    if (customer) await prisma.user.deleteMany({ where: { id: customer.id } });
    if (admin) await prisma.user.deleteMany({ where: { id: admin.id } });
    await prisma.$disconnect();
  });
