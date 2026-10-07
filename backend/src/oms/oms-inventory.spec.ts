import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { OmsController } from './oms.controller';
import { OmsInventoryService, pendingQuantities, stockQuantities } from './oms-inventory.service';
import { InventoryQueryDto } from './dto/inventory.dto';
import { matchesOperation as matches, operationAccess, projectOperation as project } from '../common/operational-access.fixture';

describe('inventory quantities', () => {
 it.each([
  [{ quantity: 10 }, { remaining: 10, picked: 0, toPick: 10 }],
  [{ quantity: 10, pickedQuantity: 6, shippedQuantity: 4 }, { remaining: 6, picked: 2, toPick: 4 }],
  [{ quantity: 10, pickedQuantity: 6, shippedQuantity: 4, cancelledQuantity: 3 }, { remaining: 3, picked: 2, toPick: 1 }],
  [{ quantity: 10, pickedQuantity: 7, shippedQuantity: 7, cancelledQuantity: 3 }, { remaining: 0, picked: 0, toPick: 0 }],
  [{ quantity: 10, pickedQuantity: 6, shippedQuantity: 4, returnedQuantity: 2 }, { remaining: 6, picked: 2, toPick: 4 }],
  [null, { remaining: 0, picked: 0, toPick: 0 }],
 ])('remaining excludes cancelled/shipped; returns do not create reshipments: %j', (input, result) => expect(pendingQuantities(input)).toEqual(result));
 it.each([
  [20, 8, 8, { available: 12, shortage: 0, reservationDifference: 0 }],
  [5, 8, 8, { available: 0, shortage: 3, reservationDifference: 0 }],
  [20, 8, 6, { available: 12, shortage: 0, reservationDifference: 2 }],
  [20, 8, 10, { available: 12, shortage: 0, reservationDifference: -2 }],
 ])('shortage and mismatched allocations remain explicit', (stock, reserved, allocated, expected) => expect(stockQuantities(stock as number, reserved as number, allocated as number)).toEqual(expected));
});

function fixture(scope = 'OWN') {
 const variant: any = { id: 'variant', sku: 'SKU', name: '15 мл', options: {}, price: 100, stock: 20, reserved: 7, damagedStock: 2, isActive: true, product: { id: 'product', productType: 'PHYSICAL', nameRu: 'Товар', sku: 'BASE', images: [], categories: [], isActive: true, currency: 'RUB' } };
 const orders: any[] = [
  { id: 'own', orderNumber: 'OWN', managerId: 'actor', source: 'B2B', status: 'ASSEMBLING', reservationState: 'ACTIVE', organizationId: 'hidden-org', buyerName: 'Свой получатель', shippingAddress: { city: 'Москва' }, manager: { firstName: 'Менеджер' }, reservationExpiresAt: new Date(0) },
  { id: 'foreign', orderNumber: 'SECRET', managerId: 'other', source: 'WEB', status: 'NEW', reservationState: 'ACTIVE', buyerName: 'Чужой получатель', shippingAddress: { secret: 'HIDDEN_ADDRESS' }, buyerEmail: 'HIDDEN_EMAIL' },
  ...['CANCELLED','DELIVERED','REFUNDED','SHIPPED'].map(status => ({ id: status, status, managerId: 'actor', reservationState: 'ACTIVE' })),
  { id: 'legacy', managerId: 'actor', status: 'NEW', reservationState: 'LEGACY' },
  { id: 'digital', managerId: 'actor', status: 'NEW', reservationState: 'DIGITAL' },
 ];
 const items = orders.map((order, n) => ({ orderId: order.id, variantId: variant.id, variant, order, quantity: n < 2 ? 6 : 1000, pickedQuantity: n < 2 ? 3 : 0, shippedQuantity: n < 2 ? 2 : 0, cancelledQuantity: n === 0 ? 1 : 0 }));
 const sum = (rows: any[]) => Object.fromEntries(['quantity','pickedQuantity','shippedQuantity','cancelledQuantity'].map(key => [key, rows.reduce((n, row) => n + row[key], 0)]));
 const db: any = {
  dataTrashEntry: { findMany: jest.fn(async () => []) },
  productVariant: { fields: {}, findMany: jest.fn(async () => [variant]), findFirst: jest.fn(async ({ where }) => where.id === variant.id ? variant : null), count: jest.fn(async () => 1), aggregate: jest.fn(async () => ({ _sum: { stock: 20, reserved: 7 } })) },
  category: { findMany: jest.fn(async () => []) },
  orderItem: {
   aggregate: jest.fn(async ({ where }) => ({ _sum: sum(items.filter(row => matches(row, where))) })),
   groupBy: jest.fn(async ({ where, by }) => { const rows = items.filter(row => matches(row, where)), field = by[0]; return [...new Set(rows.map(row => row[field]))].map(key => ({ [field]: key, _sum: sum(rows.filter(row => row[field] === key)) })); }),
  },
  order: { findMany: jest.fn(async ({ where, select, skip, take }) => orders.filter(row => matches(row, where)).slice(skip, skip + take).map(row => project(row, select))) },
  organization: { findMany: jest.fn(async () => []) },
 };
 db.$transaction = jest.fn(async fn => fn(db));
 const scoped = operationAccess(scope), access: any = { resolve: jest.fn((tx, actor, permission) => permission === 'inventory.read' ? { company: () => true } : scoped.resolve(tx, actor, permission)) };
 return { db, variant, orders, items, access, service: new OmsInventoryService(db, access) };
}
describe('inventory read model and access', () => {
 it('keeps global stock totals but scopes quantities and destinations to permitted orders', async () => {
  const f = fixture(), list = await f.service.list('actor', new InventoryQueryDto());
  expect(list).toMatchObject({ allOrdersVisible: false, summary: { stock: 20, reserved: 7, toShip: 3 } });
  expect(list.items[0]).toMatchObject({ available: 13, allocated: 7, toShip: 3, picked: 1, damaged: 2, reservationDifference: 0 });
  const detail = await f.service.detail('actor', 'variant', { page: 1, limit: 20 });
  expect(detail.total).toBe(1); expect(detail.orders[0]).toMatchObject({ id: 'own', remaining: 3, picked: 1, toPick: 2, reservationExpired: true, destination: 'Свой получатель' });
  expect(JSON.stringify(detail)).not.toMatch(/SECRET|Чужой|HIDDEN|hidden-org/);
  expect(f.db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'RepeatableRead' }));
 });
 it('company view includes both destinations, excludes terminal and unreserved orders, and paginates', async () => {
  const f = fixture('COMPANY'), list = await f.service.list('actor', new InventoryQueryDto());
  expect(list.summary.toShip).toBe(7);
  const detail = await f.service.detail('actor', 'variant', { page: 2, limit: 1 });
  expect(detail).toMatchObject({ total: 2, pages: 2, page: 2, item: { toShip: 7, picked: 2 } });
  expect(detail.orders.map(row => row.id)).toEqual(['foreign']); expect(detail.orders[0]).not.toHaveProperty('buyerEmail');
 });
 it('combines duplicate SKU lines per order and drops fully shipped/cancelled positions from pending orders', async () => {
  const f = fixture(); f.items.push({ ...f.items[0], quantity: 2, shippedQuantity: 0, pickedQuantity: 1, cancelledQuantity: 0 });
  expect((await f.service.detail('actor', 'variant', { page: 1, limit: 20 })).orders[0]).toMatchObject({ remaining: 5, picked: 2 });
  f.items.filter(row => row.orderId === 'own').forEach(row => { row.shippedQuantity = row.quantity - row.cancelledQuantity; row.pickedQuantity = row.shippedQuantity; });
  const detail = await f.service.detail('actor', 'variant', { page: 1, limit: 20 }); expect(detail.total).toBe(0); expect(detail.orders).toEqual([]);
 });
 it('refuses stock access without inventory permission and requires company scope', async () => {
  const f = fixture(); f.access.resolve.mockImplementation(async () => { throw new ForbiddenException(); });
  await expect(f.service.list('actor', new InventoryQueryDto())).rejects.toMatchObject({ status: 403 }); expect(f.db.productVariant.findMany).not.toHaveBeenCalled();
  const g = fixture(); const original = g.access.resolve.getMockImplementation(); g.access.resolve.mockImplementation((tx, actor, key) => key === 'inventory.read' ? { company: () => false } : original(tx, actor, key));
  await expect(g.service.detail('actor', 'variant', { page: 1, limit: 20 })).rejects.toMatchObject({ status: 403 }); expect(g.db.productVariant.findFirst).not.toHaveBeenCalled();
 });
 it('unknown/digital direct position cannot expose a catalog record', async () => {
  const f = fixture(); await expect(f.service.detail('actor', 'missing', { page: 1, limit: 20 })).rejects.toMatchObject({ status: 404 });
  expect(f.db.productVariant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'missing', product: { productType: 'PHYSICAL' } } }));
 });
 it.each(['inventory','inventoryPosition'])('requires both permissions on HTTP %s', method => {
  expect(Reflect.getMetadata('permissions', OmsController.prototype[method])).toEqual(['inventory.read','oms.read']);
 });
 it.each([{ page: '0' }, { page: '1.5' }, { limit: '101' }, { stock: 'UNKNOWN' }, { activity: 'yes' }, { search: 'x'.repeat(201) }, { categoryId: 'invalid' }, { scope: 'COMPANY' }])('validates filters and never accepts caller-provided scope: %j', async input => {
  await expect(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }).transform(input, { type: 'query', metatype: InventoryQueryDto })).rejects.toMatchObject({ status: 400 });
 });
});
