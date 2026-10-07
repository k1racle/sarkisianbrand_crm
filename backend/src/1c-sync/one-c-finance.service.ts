import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OneCFinanceDto } from './dto/finance.dto';
import { settlementBasis } from './finance-policy';
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export class OneCFinanceService {
 constructor(private readonly prisma: PrismaService) {}
 async receive(dto: OneCFinanceDto) {
  const normalized = { ...dto, documents: [...dto.documents].sort((a,b) => a.id.localeCompare(b.id)), requests: [...dto.requests].sort((a,b) => a.id.localeCompare(b.id)), paymentDueAt: dto.paymentDueAt || null };
  const payloadHash = createHash('sha256').update(JSON.stringify(canonical(normalized))).digest('hex');
  return this.prisma.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${dto.platformOrderId} FOR UPDATE`;
   const order = await tx.order.findUnique({ where: { id: dto.platformOrderId }, include: { items: true, oneCFinance: true, oneCRequests: true } });
   if (!order) throw new NotFoundException('Заказ CRM не найден');
   if (order.externalId && order.externalId !== dto.external1CId) throw new ConflictException('Идентификатор 1С не соответствует заказу');
   if (order.oneCFinance && order.oneCFinance.revision >= dto.revision) {
    if (order.oneCFinance.revision === dto.revision && order.oneCFinance.payloadHash !== payloadHash) throw new ConflictException('Версия расчётов уже получена с другим содержимым');
    return { id: order.id, repeated: order.oneCFinance.revision === dto.revision, ignored: order.oneCFinance.revision > dto.revision };
   }
   if (settlementBasis(order) !== dto.basisHash) throw new ConflictException('Ответ 1С относится к прежнему составу или условиям заказа');
   if (order.currency !== dto.currency) throw new ConflictException('Валюта ответа 1С не соответствует заказу');
   const asOf = new Date(dto.asOf), validUntil = new Date(dto.validUntil);
   if (asOf.getTime() > Date.now() + 60000 || validUntil <= asOf || (order.oneCFinance && asOf < order.oneCFinance.asOf)) throw new BadRequestException('Некорректное время актуальности расчётов');
   for (const result of dto.requests) {
    const request = order.oneCRequests.find(r => r.id === result.id);
    if (!request) throw new ConflictException('Ответ относится к запросу другого заказа или неизвестному запросу');
    if (['COMPLETED','REJECTED'].includes(request.status) && (result.status !== request.status || result.message !== request.responseMessage || (result.externalDocumentId || null) !== request.externalDocumentId)) throw new ConflictException('Нельзя перезаписать результат завершённого запроса');
    if (result.status === 'COMPLETED' && request.basisHash !== dto.basisHash) throw new ConflictException('Запрос создан для прежних условий заказа');
    if (result.status === 'REJECTED' && !result.message.trim()) throw new BadRequestException('Укажите причину отклонения запроса');
    await tx.oneCOrderRequest.update({ where: { id: request.id }, data: { status: result.status, responseMessage: result.message, externalDocumentId: result.externalDocumentId || null } });
   }
   const data = { revision: dto.revision, payloadHash, basisHash: dto.basisHash, asOf, validUntil, receivedAt: new Date(), currency: dto.currency, total: dto.total, paid: dto.paid, refunded: dto.refunded, debt: dto.debt, refundDue: dto.refundDue, paymentDueAt: dto.paymentDueAt ? new Date(dto.paymentDueAt) : null, releaseAllowed: dto.releaseAllowed, releaseReason: dto.releaseReason, documents: normalized.documents as any };
   await tx.oneCOrderFinance.upsert({ where: { orderId: order.id }, create: { orderId: order.id, ...data }, update: data });
   // This does not turn an incoming accounting snapshot into a payment or a warehouse movement.
   if (!order.externalId) await tx.order.update({ where: { id: order.id }, data: { externalId: dto.external1CId } });
   await tx.syncLog.create({ data: { system: '1C_KA', action: 'FINANCE_SNAPSHOT', status: 'SUCCESS', message: `Расчёты заказа ${order.orderNumber}: версия ${dto.revision}`, details: { orderId: order.id, revision: dto.revision } } });
   return { id: order.id, revision: dto.revision, repeated: false };
  }).catch(error => {
   if (error?.code === 'P2002') throw new ConflictException('Идентификатор 1С уже связан с другим заказом');
   throw error;
  });
 }
}
