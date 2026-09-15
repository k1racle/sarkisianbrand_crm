const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();
const apiBase = process.env.API_BASE || 'http://localhost:3000/api/v1';
const suffix = randomUUID().slice(0, 8);
const adminPassword = `LifecycleAdmin${suffix}7`;
let admin;
let target;
let product;
let customer;
let organization;
let targetId;
let productId;
let customerId;
let organizationId;

async function request(path, token, options = {}, expectedStatus) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (expectedStatus) {
    if (response.status !== expectedStatus) throw new Error(`${options.method || 'GET'} ${path}: ожидался ${expectedStatus}, получен ${response.status}`);
    return payload;
  }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function main() {
  admin = await prisma.user.create({ data: { email: `lifecycle-admin-${suffix}@sarkisianbrand.local`, password: await bcrypt.hash(adminPassword, 12), firstName: 'Lifecycle', lastName: 'Admin', role: 'ADMIN' } });
  target = await prisma.user.create({ data: { email: `lifecycle-user-${suffix}@sarkisianbrand.local`, password: await bcrypt.hash(`Target${suffix}8`, 12), firstName: 'Тестовый', lastName: `Пользователь ${suffix}`, role: 'CUSTOMER_B2C' } });
  product = await prisma.product.create({ data: { sku: `LIFE-${suffix}`, nameRu: `Тестовый товар ${suffix}`, slug: `lifecycle-${suffix}`, basePrice: 100, variants: { create: { name: 'Основной', options: {}, price: 100, stock: 1, sku: `LIFE-${suffix}-MAIN` } } } });
  customer = await prisma.customer.create({ data: { firstName: 'Тестовый', lastName: `Клиент ${suffix}`, email: `lifecycle-customer-${suffix}@example.local`, normalizedEmail: `lifecycle-customer-${suffix}@example.local`, segment: 'B2C' } });
  organization = await prisma.organization.create({ data: { name: `Тестовая организация ${suffix}`, inn: `99${Date.now().toString().slice(-10)}` } });
  targetId = target.id;
  productId = product.id;
  customerId = customer.id;
  organizationId = organization.id;
  const login = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: admin.email, password: adminPassword }) });
  const token = login.accessToken;

  const before = await request(`/system-settings/accounts?type=B2C&search=${encodeURIComponent(target.email)}`, token);
  if (before.total !== 1) throw new Error('Тестовая учётная запись отсутствует в активном реестре');
  const preview = await request(`/data-lifecycle/USER/${target.id}/preview`, token);
  if (!preview.canPurge) throw new Error('Новая учётная запись ошибочно заблокирована для удаления');
  const firstTrash = await request(`/data-lifecycle/USER/${target.id}/trash`, token, { method: 'POST', body: JSON.stringify({ reason: 'Автоматическая проверка восстановления' }) });
  const hidden = await request(`/system-settings/accounts?type=B2C&search=${encodeURIComponent(target.email)}`, token);
  if (hidden.total !== 0) throw new Error('Объект из корзины остался в рабочем реестре');
  await request(`/data-lifecycle/trash/${firstTrash.id}/restore`, token, { method: 'POST' });
  const restored = await prisma.user.findUnique({ where: { id: target.id } });
  if (!restored?.isActive) throw new Error('Исходное состояние учётной записи не восстановлено');

  const secondTrash = await request(`/data-lifecycle/USER/${target.id}/trash`, token, { method: 'POST', body: JSON.stringify({ reason: 'Автоматическая проверка удаления' }) });
  await request(`/data-lifecycle/trash/${secondTrash.id}`, token, { method: 'DELETE', body: JSON.stringify({ confirmation: 'неверное подтверждение', currentAdminPassword: adminPassword }) }, 400);
  await request(`/data-lifecycle/trash/${secondTrash.id}`, token, { method: 'DELETE', body: JSON.stringify({ confirmation: secondTrash.displayName, currentAdminPassword: adminPassword }) });
  if (await prisma.user.findUnique({ where: { id: target.id } })) throw new Error('Учётная запись не была окончательно удалена');
  target = null;

  const productTrash = await request(`/data-lifecycle/PRODUCT/${product.id}/trash`, token, { method: 'POST', body: JSON.stringify({ reason: 'Автоматическая проверка товара' }) });
  const trashList = await request(`/data-lifecycle/trash?search=${encodeURIComponent(product.nameRu)}`, token);
  if (!trashList.items.some((item) => item.id === productTrash.id)) throw new Error('Товар не появился в корзине');
  await request(`/data-lifecycle/trash/${productTrash.id}/restore`, token, { method: 'POST' });
  if (!(await prisma.product.findUnique({ where: { id: product.id } }))?.isActive) throw new Error('Товар не восстановлен');

  const customerTrash = await request(`/data-lifecycle/CUSTOMER/${customer.id}/trash`, token, { method: 'POST', body: JSON.stringify({ reason: 'Проверка Customer 360' }) });
  const visibleCustomers = await request(`/customer-360/customers?search=${encodeURIComponent(customer.email)}`, token);
  if (visibleCustomers.some((item) => item.id === customer.id)) throw new Error('Клиент из корзины остался в Customer 360');
  await request(`/data-lifecycle/trash/${customerTrash.id}/restore`, token, { method: 'POST' });
  const restoredCustomers = await request(`/customer-360/customers?search=${encodeURIComponent(customer.email)}`, token);
  if (!restoredCustomers.some((item) => item.id === customer.id)) throw new Error('Клиент не вернулся в Customer 360 после восстановления');

  const organizationTrash = await request(`/data-lifecycle/ORGANIZATION/${organization.id}/trash`, token, { method: 'POST', body: JSON.stringify({ reason: 'Проверка реестра организаций' }) });
  const visibleOrganizations = await request(`/customer-360/organizations?search=${encodeURIComponent(organization.name)}`, token);
  if (visibleOrganizations.some((item) => item.id === organization.id)) throw new Error('Организация из корзины осталась в рабочем реестре');
  await request(`/data-lifecycle/trash/${organizationTrash.id}/restore`, token, { method: 'POST' });
  const restoredOrganizations = await request(`/customer-360/organizations?search=${encodeURIComponent(organization.name)}`, token);
  if (!restoredOrganizations.some((item) => item.id === organization.id)) throw new Error('Организация не вернулась в реестр после восстановления');

  const orderedItem = await prisma.orderItem.findFirst({ include: { variant: true } });
  let immutableHistoryProtected = null;
  if (orderedItem) {
    const protectedPreview = await request(`/data-lifecycle/PRODUCT/${orderedItem.variant.productId}/preview`, token);
    immutableHistoryProtected = !protectedPreview.canPurge && protectedPreview.blockingDependencies.some((item) => item.key === 'orderItems');
    if (!immutableHistoryProtected) throw new Error('Товар из заказа не защищён от физического удаления');
  }
  console.log(JSON.stringify({ ok: true, archive: true, trash: true, hiddenFromRegistry: true, restore: true, typedConfirmation: true, passwordConfirmation: true, permanentDelete: true, productRestore: true, customerRestore: true, organizationRestore: true, immutableHistoryProtected }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  const ids = [targetId, productId, customerId, organizationId].filter(Boolean);
  if (ids.length) await prisma.dataTrashEntry.deleteMany({ where: { entityId: { in: ids } } });
  if (product) await prisma.product.deleteMany({ where: { id: product.id } });
  if (customer) await prisma.customer.deleteMany({ where: { id: customer.id } });
  if (organization) await prisma.organization.deleteMany({ where: { id: organization.id } });
  if (target) await prisma.user.deleteMany({ where: { id: target.id } });
  if (admin) { await prisma.dataTrashEntry.deleteMany({ where: { actorId: admin.id } }); await prisma.user.deleteMany({ where: { id: admin.id } }); }
  await prisma.$disconnect();
});
