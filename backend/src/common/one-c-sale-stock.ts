import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Safe public availability: an absent/stale/mismatched snapshot is unknown, not zero stock. */
export function oneCStockAvailability(variant: any, snapshot: any, integration: any, now = new Date()): { availabilityStatus: 'CURRENT' | 'UNAVAILABLE'; availabilityMessage: string | null; available: number | null } {
  const config = integration?.config as Record<string, unknown> | undefined;
  const warehouseId = typeof config?.warehouseId === 'string' ? config.warehouseId.trim() : '';
  const asOf = new Date(snapshot?.asOf).getTime(), validUntil = new Date(snapshot?.validUntil).getTime();
  if (!integration?.isEnabled || !warehouseId || !config?.baseUrl || !config?.username || !integration.configuredSecretKeys?.includes('password') || !integration.configuredSecretKeys?.includes('exchangeSecret') || !snapshot || !Number.isFinite(asOf) || !Number.isFinite(validUntil) || validUntil <= now.getTime() || asOf > now.getTime()) {
    return { availabilityStatus: 'UNAVAILABLE', availabilityMessage: 'Наличие товара временно не подтверждено. Попробуйте позже.', available: null };
  }
  if (!variant || variant.product?.productType !== 'PHYSICAL' || !variant.product?.externalId || snapshot.warehouseId !== warehouseId || snapshot.externalProductId !== variant.product.externalId || snapshot.sku !== variant.sku || variant.stock !== snapshot.stock || variant.reserved !== snapshot.reserved1C + snapshot.localPending) {
    return { availabilityStatus: 'UNAVAILABLE', availabilityMessage: 'Наличие товара временно не подтверждено. Попробуйте позже.', available: null };
  }
  return { availabilityStatus: 'CURRENT', availabilityMessage: null, available: Math.max(0, snapshot.stock - snapshot.reserved1C - snapshot.localPending) };
}

/** Caller holds ProductVariant FOR UPDATE. Both this hold and the order commit together. */
export async function holdVerifiedOneCStock(tx: Prisma.TransactionClient, variantId: string, quantity: number): Promise<void> {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new ConflictException('Некорректное количество товара');
  // The settings editor updates only this row. A shared lock prevents an
  // integration/warehouse change from racing the inventory check and commit.
  await tx.$queryRaw`SELECT id FROM "EcosystemIntegration" WHERE key = ${'ONE_C'} FOR SHARE`;
  const [integration, variant, snapshot] = await Promise.all([
    tx.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { isEnabled: true, configuredSecretKeys: true, config: true } }),
    tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true, sku: true, stock: true, reserved: true, product: { select: { externalId: true, productType: true } } } }),
    tx.oneCWarehouseStock.findUnique({ where: { variantId } }),
  ]);
  const now = new Date();
  const availability = oneCStockAvailability(variant, snapshot, integration, now);
  if (availability.available === null || !snapshot) throw new ConflictException(availability.availabilityMessage);
  if (availability.available < quantity) throw new BadRequestException('Недостаточно товара. Обновите корзину.');
  const held = await tx.oneCWarehouseStock.updateMany({
    where: { variantId, revision: snapshot.revision, warehouseId: snapshot.warehouseId, sku: snapshot.sku, externalProductId: snapshot.externalProductId, stock: snapshot.stock, reserved1C: snapshot.reserved1C, localPending: snapshot.localPending, validUntil: { gt: now } },
    data: { localPending: { increment: quantity } },
  });
  if (held.count !== 1) throw new ConflictException('Остатки 1С изменились. Обновите корзину и повторите заказ.');
}

/** Cancel only an unconfirmed local hold, under the same Variant lock as checkout and stock import. */
export async function releaseUnconfirmedOneCHold(tx: Prisma.TransactionClient, orderItemId: string, variantId: string, quantity: number): Promise<void> {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new ConflictException('Некорректное количество резерва');
  await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${variantId} FOR UPDATE`;
  const coverage = await tx.oneCWarehouseCoverage.findUnique({ where: { orderItemId }, select: { reserved: true, shipped: true, cancelled: true } });
  if (coverage && (coverage.reserved || coverage.shipped || coverage.cancelled)) throw new ConflictException('Заказ уже отражён на складе 1С. Для отмены требуется сверка.');
  const released = await tx.oneCWarehouseStock.updateMany({ where: { variantId, localPending: { gte: quantity } }, data: { localPending: { decrement: quantity } } });
  if (released.count !== 1) throw new ConflictException('Не удалось сверить удержание товара с остатками 1С. Требуется проверка.');
}
