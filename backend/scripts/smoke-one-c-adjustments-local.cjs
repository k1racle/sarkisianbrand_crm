/* Local HTTP/PostgreSQL acceptance. No external providers; restores configuration and removes only its own fixtures. */
const { PrismaClient, Prisma } = require('@prisma/client');
const { randomUUID } = require('node:crypto'), assert = require('node:assert/strict');
const { settlementBasis } = require('/app/dist/src/1c-sync/finance-policy');
const { IntegrationSecretsService } = require('/app/dist/src/system-settings/integration-secrets.service');
if (process.env.ALLOW_LOCAL_FINANCE_SMOKE !== 'true') throw Error('Set ALLOW_LOCAL_FINANCE_SMOKE=true');
if (process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED === 'true' || process.env.ECOSYSTEM_AUTOMATION_ENABLED === 'true' || process.env.MAIL_DELIVERY_ENABLED === 'true') throw Error('External calls, automation and mail must be disabled');
const db = new PrismaClient(), base = 'http://backend:3000/api/v1', key = 'qa-one-c-adjust-' + randomUUID();
let product, order, participant, partnerUser, integration, integrationChanged = false;
async function api(path, token, method = 'GET', body, status = 200, headers = {}) {
 const r = await fetch(base + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
 const result = await r.json(); assert.equal(r.status, status, path + ': ' + JSON.stringify(result)); return result;
}
(async () => { try {
 integration = await db.ecosystemIntegration.findUniqueOrThrow({ where: { key: 'ONE_C' } });
 if (integration.isEnabled) throw Error('Do not replace a live 1C connection');
 const admin = (await api('/auth/login', '', 'POST', { email: process.env.LOCAL_ADMIN_EMAIL, password: process.env.LOCAL_ADMIN_PASSWORD })).accessToken;
 const actor = await db.user.findUniqueOrThrow({ where: { email: process.env.LOCAL_ADMIN_EMAIL } });
 product = await db.product.create({ data: { sku: key, slug: key, nameRu: 'QA 1C return', basePrice: 100, isActive: false, variants: { create: { sku: key + '-v', name: 'QA', options: {}, price: 100, stock: 10, reserved: 6 } } }, include: { variants: true } });
 const variant = product.variants[0];
 order = await db.order.create({ data: { orderNumber: key, source: 'WEB', managerId: actor.id, totalAmount: 600, finalAmount: 600, paymentStatus: 'SUCCEEDED', reservationState: 'ACTIVE', shippingAddress: {}, items: { create: { variantId: variant.id, productName: 'QA return', variantName: 'QA', quantity: 6, price: 100, total: 600 } }, payments: { create: { amount: 600, provider: 'LOCAL_QA', status: 'SUCCEEDED' } } }, include: { items: true } });
 const id = order.id, path = '/oms/orders/' + id, line = order.items[0].id;
 const read = () => db.order.findUniqueOrThrow({ where: { id }, include: { items: true, execution: true, executionOperations: true, oneCFinance: true } });
 const body = async (kind, extra = {}) => { const o = await read(); return { kind, requestKey: randomUUID(), expectedVersion: o.execution?.version || 0, expectedUpdatedAt: o.updatedAt.toISOString(), ...extra }; };
 const run = async (kind, extra) => api(path + '/execution', admin, 'POST', await body(kind, extra), 201);
 const adjust = async (kind, quantity) => api(path + '/adjustments', admin, 'POST', await body(kind, { reason: 'QA ' + kind, lines: [{ itemId: line, quantity }] }), 201);
 const close = async (status = 200, expectedUpdatedAt) => api(path, admin, 'PATCH', { status: 'DELIVERED', expectedUpdatedAt: expectedUpdatedAt || (await read()).updatedAt.toISOString() }, status);
 const finance = () => api(path + '/finance', admin);
 await run('CONFIRM', { compositionChecked: true, pricesChecked: true, paymentTerms: 'Оплачено', deliveryTerms: 'Самовывоз' });
 await run('PICK', { lines: [{ itemId: line, quantity: 4 }] }); await run('SHIP', { lines: [{ itemId: line, quantity: 4 }] });
 // A pending historical reward must lose its eligibility as soon as quantities change.
 partnerUser = await db.user.create({ data: { email: key + '@local.test', password: '!', role: 'CUSTOMER_B2C', isActive: false } });
 participant = await db.partnerParticipant.create({ data: { userId: partnerUser.id, kind: 'BLOGGER', code: key, status: 'PENDING', displayName: 'QA', termsSnapshot: 'Local QA', acceptedTermsAt: new Date() } });
 await db.partnerReward.create({ data: { orderId: id, participantId: participant.id, amount: 30, unit: 'RUB', readyAt: new Date(0) } });
 const cancel = await adjust('CANCEL_REMAINDER', 2), returned = await adjust('RETURN', 1);
 assert.equal((await db.partnerReward.findUniqueOrThrow({ where: { orderId: id } })).readyAt, null);
 await close(409);
 const secret = randomUUID(), encryptedSecrets = new IntegrationSecretsService({ get: name => process.env[name] }).encrypt({ password: 'local-test-only', exchangeSecret: secret });
 await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { status: 'CONNECTED', config: { baseUrl: 'http://127.0.0.1:1', username: 'qa' }, encryptedSecrets, configuredSecretKeys: ['password', 'exchangeSecret'] } }); integrationChanged = true;
 let revision = 0;
 const evidence = operationId => ({ operationId, status: 'RECONCILED', message: 'Возврат проведён', refundDisposition: 'REFUNDED', documentIds: [key + '-refund'] });
 const doc = { id: key + '-refund', kind: 'REFUND', number: 'QA-300', date: new Date().toISOString(), status: 'POSTED', amount: '300.00' };
 const snapshot = async (extra = {}) => ({ platformOrderId: id, external1CId: key, revision: ++revision, basisHash: settlementBasis(await read()), asOf: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 600000).toISOString(), currency: 'RUB', total: '300.00', paid: '600.00', refunded: '300.00', debt: '0.00', refundDue: '0.00', releaseAllowed: false, releaseReason: 'Отгружено', documents: [doc], requests: [], closeAllowed: false, closeReason: 'Проверка документов', adjustments: [], ...extra });
 const receive = async (dto, status = 201) => { await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { isEnabled: true } }); try { return await api('/1c-webhook/order-finance', '', 'POST', dto, status, { 'x-integration-key': secret }); } finally { await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { isEnabled: false } }); } };
 const request = await api(path + '/1c-requests', admin, 'POST', { requestKey: randomUUID(), kind: 'RETURN_REVIEW', operationId: returned.operationId, comment: 'Проверить возврат', expectedUpdatedAt: (await read()).updatedAt.toISOString() }, 201);
 await receive(await snapshot({ requests: [{ id: request.id, status: 'COMPLETED', message: 'Готово' }] }), 409);
 assert.equal((await finance()).requests[0].status, 'PENDING');
 // The first request update must roll back when a later request in the same batch is invalid.
 await receive(await snapshot({ requests: [{ id: request.id, status: 'RECEIVED', message: '' }, { id: randomUUID(), status: 'RECEIVED', message: '' }] }), 409);
 assert.equal((await finance()).requests[0].status, 'PENDING'); assert.equal((await read()).oneCFinance, null);
 await receive(await snapshot({ adjustments: [evidence(cancel.operationId), { operationId: returned.operationId, status: 'REJECTED', message: 'Уточните документ', documentIds: [] }] }));
 assert.equal((await read()).execution.settlementReviewRequired, true); assert.equal((await finance()).operations.find(op => op.id === returned.operationId).settlementStatus, 'REJECTED'); await close(409);
 const both = [evidence(cancel.operationId), evidence(returned.operationId)];
 for (const patch of [{ adjustments: [evidence(cancel.operationId)] }, { adjustments: [evidence(randomUUID()), evidence(returned.operationId)] }, { documents: [] }, { documents: [{ ...doc, status: 'CANCELLED' }] }, { refundDue: '0.01' }]) await receive(await snapshot({ adjustments: both, closeAllowed: true, ...patch }), 409);
 assert.equal((await read()).execution.settlementReviewRequired, true);
 const staleVersion = (await read()).updatedAt.toISOString();
 const accepted = await snapshot({ adjustments: both, closeAllowed: true, closeReason: 'Расчёты завершены', requests: [{ id: request.id, status: 'COMPLETED', message: 'Готово', externalDocumentId: doc.id }] }); await receive(accepted);
 const acceptedOrder = await read(); assert.equal(acceptedOrder.execution.settlementReviewRequired, false); assert.equal(acceptedOrder.status, 'SHIPPED'); assert.equal((await finance()).closure.allowed, true);
 const projection = await api(path, admin); assert.equal(projection.closure.allowed, true); assert.equal(projection.oneCFinance, undefined); assert.equal(projection.closure.refundDue, undefined);
 const historyCount = await db.orderStatusHistory.count({ where: { orderId: id } }); assert.equal((await receive(accepted)).repeated, true); assert.equal(await db.orderStatusHistory.count({ where: { orderId: id } }), historyCount);
 await receive({ ...accepted, closeReason: 'Переписано' }, 409); await close(409, staleVersion);
 await db.oneCOrderFinance.update({ where: { orderId: id }, data: { validUntil: new Date(0) } }); await close(409);
 await receive(await snapshot({ adjustments: both, closeAllowed: true, closeReason: 'Сверено' }));
 const inventory = await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
 await close(); assert.equal((await read()).status, 'DELIVERED'); await close();
 assert.deepEqual(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }), inventory);
 assert.equal((await db.partnerReward.findUniqueOrThrow({ where: { orderId: id } })).readyAt, null);
 // A later return reopens reconciliation without altering the historical payment or pretending to refund.
 const latest = await read(), nextReturn = await adjust('RETURN', 1); assert.equal((await read()).execution.settlementReviewRequired, true);
 assert.equal((await receive(accepted)).ignored, true); assert.equal((await read()).execution.settlementReviewRequired, true);
 await receive({ ...accepted, revision: ++revision }, 409);
 assert.equal((await finance()).state, 'CHANGED');
 await receive(await snapshot({ adjustments: [...both, evidence(nextReturn.operationId)], closeAllowed: true, closeReason: 'Сверен новый возврат', requests: accepted.requests }));
 assert.equal((await read()).execution.settlementReviewRequired, false);
 await receive(await snapshot()); assert.equal((await read()).execution.settlementReviewRequired, true); assert.equal((await finance()).closure.allowed, false);
 const payments = await db.payment.findMany({ where: { orderId: id } }); assert.equal(payments.length, 1); assert.equal(Number(payments[0].amount), 600); assert.equal(payments[0].status, 'SUCCEEDED'); assert.equal(await db.orderFinanceEntry.count({ where: { orderId: id } }), 0);
 assert.equal(Number((await read()).finalAmount), 600); assert.equal((await read()).paymentStatus, 'SUCCEEDED'); assert.equal(latest.items[0].shippedQuantity, 4);
 const qty = await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } }); assert.equal(qty.stock, 8); assert.equal(qty.reserved, 0);
 console.log('PASS HTTP/PostgreSQL: per-document reconciliation, rejection, refund evidence, full/partial approval, atomic rollback, linked request completion, safe projection, CAS, expiry, replay, delivery, new return and revocation, pending reward hold, unchanged payment and inventory on accounting import');
} finally {
 if (integrationChanged) await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { isEnabled: integration.isEnabled, status: integration.status, config: integration.config ?? Prisma.DbNull, encryptedSecrets: integration.encryptedSecrets, configuredSecretKeys: integration.configuredSecretKeys } });
 await db.$transaction(async tx => {
  if (order) { const id = order.id; await tx.auditLog.deleteMany({ where: { resourceId: id } }); await tx.syncLog.deleteMany({ where: { system: '1C_KA', details: { path: ['orderId'], equals: id } } }); await tx.jobRun.deleteMany({ where: { jobName: '1C_ORDER_EXPORT', input: { path: ['orderId'], equals: id } } }); await tx.partnerReward.deleteMany({ where: { orderId: id } }); await tx.payment.deleteMany({ where: { orderId: id } }); await tx.order.delete({ where: { id } }); }
  if (participant) await tx.partnerParticipant.delete({ where: { id: participant.id } });
  if (partnerUser) await tx.user.delete({ where: { id: partnerUser.id } });
  if (product) { await tx.productVariant.deleteMany({ where: { productId: product.id } }); await tx.product.delete({ where: { id: product.id } }); }
 }); await db.$disconnect();
} })().catch(e => { console.error(e); process.exitCode = 1; });
