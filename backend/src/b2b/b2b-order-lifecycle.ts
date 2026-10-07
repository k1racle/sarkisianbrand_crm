import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { requireOneCRelease } from '../1c-sync/finance-policy';

/** B2B procurement is not a web-card payment. Reserve at creation, consume at
 * dispatch, release before dispatch. Caller must lock Order in its transaction.
 * Historic LEGACY reservations are never guessed or rewritten automatically.
 */
export async function applyB2BStockTransition(tx: Prisma.TransactionClient, order: any, target: OrderStatus): Promise<Prisma.OrderUpdateInput> {
 if ([OrderStatus.PAID, OrderStatus.REFUNDED].includes(target as any) && target !== order.status) throw new ConflictException('Оплаты и финансовые возвраты B2B ведутся в 1С. Проверьте расчёты и документы из 1С');
 if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(target as any) && ![OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
  requireOneCRelease({ ...order, oneCFinance: await tx.oneCOrderFinance.findUnique({ where: { orderId: order.id } }) });
 }
 if (!order.reservationState || order.reservationState === 'LEGACY') return {};
 const state = order.reservationState;
 if (!['ACTIVE', 'RELEASED', 'CONSUMED'].includes(state)) throw new ConflictException('Неизвестное состояние резерва B2B-заказа');
 if (target === OrderStatus.REFUNDED) throw new ConflictException('Возврат B2B-заказа требует отдельного оформления приёмки товара и расчётов');
 if (state === 'RELEASED') {
  if (order.status === OrderStatus.CANCELLED && target === OrderStatus.CANCELLED) return {};
  throw new ConflictException('Резерв B2B-заказа снят. Создайте новый заказ');
 }
 if (state === 'CONSUMED') {
  if (order.status === OrderStatus.DELIVERED && target !== OrderStatus.DELIVERED) throw new ConflictException('Доставленный заказ нельзя вернуть на предыдущий этап');
  if (![OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(target as any)) throw new ConflictException('Товары уже отгружены. Требуется оформление возврата');
  return {};
 }
 if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) throw new ConflictException('Статус B2B-заказа не соответствует активному резерву');
 const rank: Partial<Record<OrderStatus, number>> = { NEW: 0, CONFIRMED: 1, PAYMENT_WAITING: 1, PAID: 2, ASSEMBLING: 3, SHIPPED: 4, DELIVERED: 5 };
 if (target !== OrderStatus.CANCELLED && (rank[target] ?? -1) < (rank[order.status as OrderStatus] ?? -1)) throw new ConflictException('Заказ не может вернуться на предыдущий этап');
 const release=target===OrderStatus.CANCELLED;
 const consume=([OrderStatus.SHIPPED,OrderStatus.DELIVERED] as OrderStatus[]).includes(target);
 if(!release&&!consume)return {};
 const quantities=new Map<string,number>();
 for(const item of order.items||[]){
  if(!item.variantId||!Number.isSafeInteger(item.quantity)||item.quantity<=0)throw new ConflictException('Некорректный состав B2B-заказа');
  const total=(quantities.get(item.variantId)||0)+item.quantity;
  if(!Number.isSafeInteger(total))throw new ConflictException('Некорректное количество товара');
  quantities.set(item.variantId,total);
 }
 if(!quantities.size)throw new ConflictException('B2B-заказ не содержит товаров');
 for(const [id,quantity] of [...quantities].sort(([a],[b])=>a.localeCompare(b))){
  const result=await tx.productVariant.updateMany({where:{id,reserved:{gte:quantity},...(consume?{stock:{gte:quantity}}:{})},data:{reserved:{decrement:quantity},...(consume?{stock:{decrement:quantity}}:{})}});
  if(result.count!==1)throw new ConflictException('Резерв B2B-заказа не соответствует остаткам. Требуется проверка');
 }
 return {reservationState:release?'RELEASED':'CONSUMED',reservationExpiresAt:null};
}
