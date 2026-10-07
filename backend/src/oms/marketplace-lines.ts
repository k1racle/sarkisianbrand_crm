import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

export function marketplaceLines(source: unknown) {
  const value = source as any;
  const records = Array.isArray(value) ? value : value?.items ?? value?.products;
  if (!Array.isArray(records) || !records.length || records.length > 500) throw new BadRequestException('Укажите от 1 до 500 товарных позиций');
  return records.map((item: any) => {
    if (!item || typeof item !== 'object') throw new BadRequestException('Некорректная позиция площадки');
    const quantity = Number(item.quantity ?? item.count ?? 1), price = Number(item.price ?? item.salePrice ?? item.amount ?? 0);
    const total = Number(item.total ?? Math.round(price * quantity * 100) / 100);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000 || !Number.isFinite(price) || price < 0 || !Number.isFinite(total) || total < 0 || !Number.isSafeInteger(Math.round(total * 100))) throw new BadRequestException('Некорректное количество или цена площадки');
    return { externalSku: String(item.sku ?? item.offerId ?? item.nmId ?? item.productId ?? ''), offerId: item.offerId == null ? null : String(item.offerId), quantity, price, total,
      productName: String(item.name ?? item.title ?? ''), variantName: String(item.variantName ?? item.size ?? '') };
  });
}
export function marketplaceContentHash(input: { items: unknown; totalAmount: number; buyerName?: string; buyerEmail?: string; buyerPhone?: string; deliveryDate?: string; status?: string }) {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0 || !Number.isSafeInteger(Math.round(input.totalAmount * 100))) throw new BadRequestException('Некорректная сумма заказа площадки');
  return createHash('sha256').update(JSON.stringify({ terminalStatus: ['CANCELLED', 'RETURNED'].includes(input.status || '') ? input.status : null, total: input.totalAmount, buyerName: input.buyerName ?? null, buyerEmail: input.buyerEmail ?? null, buyerPhone: input.buyerPhone ?? null, deliveryDate: input.deliveryDate ? new Date(input.deliveryDate).toISOString() : null,
    lines: marketplaceLines(input.items).map(line => JSON.stringify(line)).sort() })).digest('hex');
}
