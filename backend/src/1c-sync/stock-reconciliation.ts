import { Prisma } from '@prisma/client';

export const stockSnapshotSelect = { warehouseId: true, externalProductId: true, sku: true, revision: true, stock: true, damagedStock: true, asOf: true, validUntil: true, receivedAt: true } as const;

// The public projection contains totals only: inventory access must not reveal other orders.
export function stockSnapshotSummary(variant: any, now = new Date()) {
 const s = variant.oneCStock;
 if (!s) return { status: 'MISSING', snapshot: null };
 const { warehouseId, revision, stock, damagedStock, asOf, validUntil, receivedAt } = s;
 const status = s.sku !== variant.sku || s.externalProductId !== variant.product.externalId ? 'MAPPING_CHANGED' : new Date(validUntil) <= now ? 'STALE' : 'RECEIVED';
 return { status, snapshot: { warehouseId, revision, stock, damagedStock, asOf, validUntil, receivedAt } };
}

export function operationMovement(operation: any, variantId: string) {
 if (!['SHIP', 'RETURN'].includes(operation.kind)) return null;
 const items = new Map<string, any>((operation.order?.items || []).map((i: any) => [i.id, i]));
 let shipped = 0, returned = 0, damaged = 0;
 if (!Array.isArray(operation.lines)) throw new Error('Invalid movement lines');
 const seen = new Set<string>();
 for (const line of operation.lines) {
  const item = items.get(line.itemId);
  if (!item || seen.has(line.itemId) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new Error('Incomplete movement history');
  seen.add(line.itemId);
  const damage = line.damagedQuantity ?? 0;
  if (!Number.isSafeInteger(damage) || damage < 0 || damage > line.quantity || (operation.kind === 'SHIP' && damage !== 0)) throw new Error('Invalid damaged quantity');
  if (item.variantId !== variantId) continue;
  if (operation.kind === 'SHIP') shipped += line.quantity;
  else { returned += line.quantity; damaged += damage; }
 }
 return shipped || returned ? { shipped, returned, damaged, goodDelta: returned - damaged - shipped } : null;
}

export function compareStock(variant: any, snapshot: any, operations: any[], totals: any, warehouseId: string | null, now = new Date(), historyLimited = false) {
 const base = { ...stockSnapshotSummary({ ...variant, oneCStock: snapshot }, now), expectedStock: null as number | null, expectedDamaged: null as number | null, difference: null as number | null, damagedDifference: null as number | null, pendingOperations: 0, pendingShipped: 0, pendingReturned: 0, pendingDamaged: 0 };
 if (!snapshot) return base;
 if (!warehouseId) return { ...base, status: 'UNCONFIGURED' };
 if (warehouseId !== snapshot.warehouseId) return { ...base, status: 'WAREHOUSE_CHANGED' };
 if (base.status === 'MAPPING_CHANGED' || base.status === 'STALE') return base;
 if (historyLimited) return { ...base, status: 'HISTORY_INCOMPLETE' };
 const included = new Set<string>(snapshot.includedOperationIds), seen = new Set<string>();
 let shipped = 0, returned = 0, damaged = 0, pendingGood = 0;
 try {
  for (const operation of operations) {
   const movement = operationMovement(operation, variant.id);
   if (!movement) continue;
   seen.add(operation.id); shipped += movement.shipped; returned += movement.returned; damaged += movement.damaged;
   if (included.has(operation.id)) continue;
   base.pendingOperations++; base.pendingShipped += movement.shipped; base.pendingReturned += movement.returned - movement.damaged; base.pendingDamaged += movement.damaged;
   pendingGood += movement.goodDelta;
  }
 } catch { return { ...base, status: 'HISTORY_INCOMPLETE' }; }
 if ([...included].some(id => !seen.has(id)) || shipped !== (totals.shippedQuantity || 0) || returned !== (totals.returnedQuantity || 0) || damaged !== (totals.damagedReturnedQuantity || 0)) return { ...base, status: 'HISTORY_INCOMPLETE' };
 const expectedStock = Number(snapshot.stock) + pendingGood, expectedDamaged = Number(snapshot.damagedStock) + base.pendingDamaged;
 const difference = variant.stock - expectedStock, damagedDifference = variant.damagedStock - expectedDamaged;
 return { ...base, expectedStock, expectedDamaged, difference, damagedDifference, status: difference || damagedDifference || expectedStock < 0 ? 'DIFFERENCE' : base.pendingOperations ? 'PENDING' : 'MATCHED' };
}

export async function loadStockComparison(db: Prisma.TransactionClient, variant: any) {
 const snapshot = await db.oneCStockSnapshot.findUnique({ where: { variantId: variant.id } });
 if (!snapshot) return compareStock(variant, null, [], {}, null);
 const [settings, operations, totals] = await Promise.all([
  db.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { config: true } }),
  db.orderExecutionOperation.findMany({ where: { kind: { in: ['SHIP', 'RETURN'] }, order: { items: { some: { variantId: variant.id } } } }, include: { order: { select: { items: { select: { id: true, variantId: true } } } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5001 }),
  db.orderItem.aggregate({ where: { variantId: variant.id, order: { fulfillmentManaged: true } }, _sum: { shippedQuantity: true, returnedQuantity: true, damagedReturnedQuantity: true } }),
 ]);
 return compareStock(variant, snapshot, operations, totals._sum, String((settings?.config as any)?.warehouseId || '') || null, new Date(), operations.length > 5000);
}
