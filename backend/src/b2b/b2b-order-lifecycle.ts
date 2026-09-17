import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

/** B2B procurement is not a web-card payment. Reserve at creation, consume at
 * dispatch, release before dispatch. Caller must lock Order in its transaction.
 * Historic LEGACY reservations are never guessed or rewritten automatically.
 */
export async function applyB2BStockTransition(tx: Prisma.TransactionClient, order: any, target: OrderStatus): Promise<Prisma.OrderUpdateInput> {
 if(order.reservationState!=='ACTIVE')return {};
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
