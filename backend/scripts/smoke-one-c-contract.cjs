const http = require('http');
const { createCipheriv, createHash, createHmac, randomBytes } = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();
const port = Number(process.env.ONE_C_MOCK_PORT || 39101);
const username = 'smoke-user';
const password = 'smoke-password';
const exchangeSecret = 'smoke-exchange-secret';
const productExternalId = 'ONE-C-SMOKE-PRODUCT';
const organizationExternalId = 'ONE-C-SMOKE-COUNTERPARTY';
const startedAt = new Date();

function encryptSecrets(value) {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.JWT_SECRET || 'sarkisian-local-dev-secret';
  const key = createHash('sha256').update(source).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function response(reply, status, body) {
  reply.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  reply.end(JSON.stringify(body));
}

async function startMock() {
  const calls = [];
  const state = { exportedOrders: [], statusTargetId: null };
  const server = http.createServer(async (request, reply) => {
    const body = await readBody(request);
    const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const timestamp = request.headers['x-sarkisian-timestamp'];
    const signature = request.headers['x-sarkisian-signature'];
    const expectedSignature = createHmac('sha256', exchangeSecret).update(`${timestamp}.${body}`).digest('hex');
    if (request.headers.authorization !== expectedAuth || !timestamp || signature !== expectedSignature) {
      return response(reply, 401, { error: 'Проверка Basic Auth или HMAC не пройдена' });
    }
    calls.push({ method: request.method, url: request.url, correlationId: request.headers['x-correlation-id'] });
    if (request.method === 'GET' && request.url === '/hs/sarkisian/v1/health') return response(reply, 200, { status: 'ok', system: '1С:КА test double' });
    if (request.method === 'GET' && request.url === '/hs/sarkisian/v1/products') return response(reply, 200, { products: [{ externalId: productExternalId, sku: 'ONE-C-SMOKE-001', nameRu: 'Проверочный товар интеграции 1С', slug: 'one-c-smoke-product', price: 1234, stock: 7 }] });
    if (request.method === 'GET' && request.url === '/hs/sarkisian/v1/counterparties') return response(reply, 200, { counterparties: [{ externalId: organizationExternalId, name: 'Проверочный контрагент 1С', inn: '7700999999', kpp: '770001001' }] });
    if (request.method === 'GET' && request.url === '/hs/sarkisian/v1/order-statuses') return response(reply, 200, { statuses: state.statusTargetId ? [{ platformOrderId: state.statusTargetId, status: 'PICKING', warehouseDocumentId: `TSD-${state.statusTargetId.slice(0, 8)}`, comment: 'Задание принято кладовщиком на ТСД' }] : [] });
    if (request.method === 'POST' && request.url === '/hs/sarkisian/v1/orders') {
      const parsed = JSON.parse(body || '{}');
      const orders = parsed.orders || [];
      state.exportedOrders.push(...orders);
      state.statusTargetId ||= orders.find(item => item.number.startsWith('SMOKE-WEB-'))?.id || null;
      return response(reply, 200, {
        acceptedIds: orders.map(item => item.id),
        externalIds: Object.fromEntries(orders.map(item => [item.id, `1C-${item.number}`])),
        warehouseDocumentIds: Object.fromEntries(orders.map(item => [item.id, `TSD-${item.id.slice(0, 8)}`])),
      });
    }
    return response(reply, 404, { error: 'Метод тестового контура не найден' });
  });
  await new Promise((resolve, reject) => server.listen(port, '127.0.0.1', resolve).once('error', reject));
  return { server, calls, state };
}

async function waitForRun(id) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const run = await prisma.jobRun.findUnique({ where: { id } });
    if (run && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) return run;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Фоновый обмен с 1С не завершился за 30 секунд');
}

async function api(path, token, options = {}) {
  const result = await fetch(`http://127.0.0.1:3000/api/v1${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const data = await result.json().catch(() => null);
  if (!result.ok) throw new Error(`API ${path}: HTTP ${result.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const { server, calls, state } = await startMock();
  let original;
  let orderBackup = [];
  const createdOrderIds = [];
  let automaticVariantBackup = null;
  try {
    const integration = await prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' } });
    if (!integration) throw new Error('Подключение ONE_C не найдено в реестре интеграций');
    original = integration;
    orderBackup = await prisma.order.findMany({ where: { isSynced1C: false, source: { not: 'ONE_C' } }, select: { id: true, status: true, isSynced1C: true, externalId: true, oneCStatus: true, oneCSyncAt: true, oneCSyncError: true, warehouseDocumentId: true, pickingStartedAt: true, pickedAt: true, packedAt: true } });
    await prisma.ecosystemIntegration.update({
      where: { key: 'ONE_C' },
      data: {
        isEnabled: true,
        environment: 'TEST',
        status: 'CONFIGURED',
        config: {
          baseUrl: `http://127.0.0.1:${port}`,
          username,
          healthPath: '/hs/sarkisian/v1/health',
          productsPath: '/hs/sarkisian/v1/products',
          counterpartiesPath: '/hs/sarkisian/v1/counterparties',
          ordersPath: '/hs/sarkisian/v1/orders',
          orderStatusesPath: '/hs/sarkisian/v1/order-statuses',
          warehouseId: 'Склад-SMOKE',
          organizationId: 'Организация-SMOKE',
          orderType: 'Заказ клиента',
          requestTimeoutMs: 5000,
        },
        encryptedSecrets: encryptSecrets({ password, exchangeSecret }),
        configuredSecretKeys: ['password', 'exchangeSecret'],
      },
    });

    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN', isActive: true } });
    const token = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET || 'sarkisian-local-dev-secret', { expiresIn: '5m' });
    const connection = await api('/1c-sync/test-connection', token, { method: 'POST' });
    if (!connection.success) throw new Error('Проверка соединения не вернула success=true');

    const expectedSources = ['WEB', 'B2B', 'WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET', 'MANUAL'];
    const stamp = Date.now();
    for (const source of expectedSources) {
      const order = await prisma.order.create({
        data: {
          orderNumber: `SMOKE-${source}-${stamp}`,
          source,
          sourceChannel: source,
          externalOrderId: ['WEB', 'B2B', 'MANUAL'].includes(source) ? undefined : `EXT-${source}-${stamp}`,
          status: 'NEW',
          buyerName: 'Проверочный покупатель',
          totalAmount: 1000,
          finalAmount: 1000,
          shippingAddress: { city: 'Москва', address: 'Проверочный адрес' },
          items: { create: { externalSku: 'ONE-C-SMOKE-001', productName: 'Проверочный товар', variantName: 'Основной вариант', price: 1000, quantity: 1, total: 1000 } },
        },
      });
      createdOrderIds.push(order.id);
    }

    const first = await api('/1c-sync/exchange', token, { method: 'POST' });
    const firstRun = await waitForRun(first.id);
    if (firstRun.status !== 'COMPLETED') throw new Error(`Первый обмен завершился со статусом ${firstRun.status}: ${firstRun.error}`);
    const second = await api('/1c-sync/exchange', token, { method: 'POST' });
    const secondRun = await waitForRun(second.id);
    if (secondRun.status !== 'COMPLETED') throw new Error(`Повторный обмен завершился со статусом ${secondRun.status}: ${secondRun.error}`);

    const productCount = await prisma.product.count({ where: { externalId: productExternalId } });
    const variantCount = await prisma.productVariant.count({ where: { sku: 'ONE-C-SMOKE-001' } });
    if (productCount !== 1 || variantCount !== 1) throw new Error(`Идемпотентность нарушена: товаров ${productCount}, вариантов ${variantCount}`);
    const product = await prisma.product.findUnique({ where: { externalId: productExternalId }, include: { variants: true } });
    if (!product || Number(product.basePrice) !== 1234 || product.variants[0]?.stock !== 7) throw new Error('Цена или остаток из 1С не совпали');

    const exportedTestOrders = state.exportedOrders.filter(item => createdOrderIds.includes(item.id));
    const exportedSources = [...new Set(exportedTestOrders.map(item => item.source))].sort();
    if (expectedSources.some(source => !exportedSources.includes(source))) throw new Error(`Не все каналы выгружены в 1С: ${exportedSources.join(', ')}`);
    if (exportedTestOrders.some(item => item.warehouse?.fulfillmentMode !== 'TSD_PICKING' || item.warehouse?.warehouseId !== 'Склад-SMOKE')) throw new Error('В заказах отсутствует складской маршрут на ТСД');
    const pickedOrder = await prisma.order.findUniqueOrThrow({ where: { id: state.statusTargetId } });
    if (pickedOrder.status !== 'ASSEMBLING' || !pickedOrder.pickingStartedAt || !pickedOrder.warehouseDocumentId) throw new Error('Статус начала сборки с ТСД не применён в OMS');

    const webhookTargetId = createdOrderIds.find(id => id !== state.statusTargetId);
    await api('/1c-webhook/order-statuses', '', { method: 'POST', headers: { authorization: '', 'x-integration-key': exchangeSecret }, body: JSON.stringify({ statuses: [{ platformOrderId: webhookTargetId, status: 'PACKED', warehouseDocumentId: `TSD-${webhookTargetId.slice(0, 8)}` }] }) });
    const packedOrder = await prisma.order.findUniqueOrThrow({ where: { id: webhookTargetId } });
    if (packedOrder.status !== 'ASSEMBLING' || !packedOrder.pickedAt || !packedOrder.packedAt) throw new Error('Webhook упаковки с ТСД не обновил заказ');

    const demoAuth = await api('/auth/login', '', { method: 'POST', headers: { authorization: '' }, body: JSON.stringify({ email: 'b2b-demo@sarkisianbrand.ru', password: 'SarkisianB2B!2026' }) });
    const catalog = await api('/b2b/catalog', demoAuth.accessToken);
    const automaticVariant = catalog.flatMap(item => item.variants).find(item => item.available > 0 && item.sku !== 'ONE-C-SMOKE-001');
    if (!automaticVariant) throw new Error('Нет товара для проверки автоматической выгрузки B2B-заказа');
    automaticVariantBackup = await prisma.productVariant.findUniqueOrThrow({ where: { id: automaticVariant.id }, select: { id: true, stock: true, reserved: true } });
    const automaticOrder = await api('/b2b/orders', demoAuth.accessToken, { method: 'POST', body: JSON.stringify({ items: [{ variantId: automaticVariant.id, quantity: 1 }], comments: 'Проверка автоматической отправки в 1С' }) });
    createdOrderIds.push(automaticOrder.id);
    const automaticRunDeadline = Date.now() + 15000;
    let automaticStored;
    do {
      automaticStored = await prisma.order.findUnique({ where: { id: automaticOrder.id } });
      if (automaticStored?.isSynced1C) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    } while (Date.now() < automaticRunDeadline);
    if (!automaticStored?.isSynced1C || !automaticStored.warehouseDocumentId) throw new Error('Новый B2B-заказ не отправился в 1С автоматически');

    const exportCountBeforeAdminChange = state.exportedOrders.filter(item => item.id === pickedOrder.id).length;
    await api(`/admin/orders/${pickedOrder.orderNumber}/status`, token, { method: 'PATCH', body: JSON.stringify({ status: 'SHIPPED', comment: 'Проверка повторной передачи изменения в 1С' }) });
    const adminExportDeadline = Date.now() + 15000;
    while (Date.now() < adminExportDeadline && state.exportedOrders.filter(item => item.id === pickedOrder.id).length <= exportCountBeforeAdminChange) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (state.exportedOrders.filter(item => item.id === pickedOrder.id).length <= exportCountBeforeAdminChange) throw new Error('Изменение заказа из админки не отправилось повторно в 1С');

    console.log(JSON.stringify({
      success: true,
      connection: connection.message,
      firstExchange: firstRun.result,
      secondExchange: secondRun.result,
      channelsToOneC: exportedSources,
      warehouseFlow: { picked: pickedOrder.orderNumber, packed: packedOrder.orderNumber, automaticB2B: automaticOrder.orderNumber, adminChangeReexported: true },
      idempotency: { products: productCount, variants: variantCount },
      authenticatedCalls: calls.length,
      methods: calls.map(item => `${item.method} ${item.url}`),
    }, null, 2));
  } finally {
    if (orderBackup.length) {
      await prisma.$transaction(orderBackup.map(item => prisma.order.update({ where: { id: item.id }, data: { status: item.status, isSynced1C: item.isSynced1C, externalId: item.externalId, oneCStatus: item.oneCStatus, oneCSyncAt: item.oneCSyncAt, oneCSyncError: item.oneCSyncError, warehouseDocumentId: item.warehouseDocumentId, pickingStartedAt: item.pickingStartedAt, pickedAt: item.pickedAt, packedAt: item.packedAt } })));
    }
    if (createdOrderIds.length) await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    if (automaticVariantBackup) await prisma.productVariant.update({ where: { id: automaticVariantBackup.id }, data: { stock: automaticVariantBackup.stock, reserved: automaticVariantBackup.reserved } });
    await prisma.product.deleteMany({ where: { externalId: productExternalId } });
    await prisma.organization.deleteMany({ where: { external1CId: organizationExternalId } });
    if (original) {
      await prisma.ecosystemIntegration.update({
        where: { id: original.id },
        data: {
          provider: original.provider,
          name: original.name,
          category: original.category,
          audience: original.audience,
          description: original.description,
          documentationUrl: original.documentationUrl,
          isEnabled: original.isEnabled,
          environment: original.environment,
          status: original.status,
          config: original.config === null ? Prisma.DbNull : original.config,
          encryptedSecrets: original.encryptedSecrets,
          configuredSecretKeys: original.configuredSecretKeys,
          lastTestAt: original.lastTestAt,
          lastTestMessage: original.lastTestMessage,
        },
      });
    }
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
