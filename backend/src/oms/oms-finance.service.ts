import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { OperationalContext, withOperationalAccess } from '../common/operational-access';
import { orderAccessWhere } from './oms-read.service';
import { ReceivablesQueryDto } from './dto/order-finance.dto';
import { CreateOneCRequestDto } from '../1c-sync/dto/finance.dto';
import { oneCClosureState, oneCFinanceState, settlementBasis } from '../1c-sync/finance-policy';
const include = { items: true, execution: true, oneCFinance: true, oneCRequests: { orderBy: [{ createdAt: 'desc' as const }, { id: 'asc' as const }] }, executionOperations: true, _count: { select: { financeEntries: true } } };
export class OmsFinanceService {
 constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
 private run<T>(actor: string, write: boolean, fn: (ctx: OperationalContext) => Promise<T>) {
  return withOperationalAccess(this.prisma, this.access, actor, 'oms', write, async ctx => {
   await this.access.resolve(ctx.db, actor, 'order_finance.read');
   if (write) await this.access.resolve(ctx.db, actor, 'order_finance.write');
   return fn(ctx);
  });
 }
 private view(order: any) {
  const snapshot = order.oneCFinance, state = oneCFinanceState(order);
  return { id: order.id, orderNumber: order.orderNumber, source: 'ONE_C', updatedAt: order.updatedAt, ...state,
   legacyEntries: order._count.financeEntries, currency: order.currency, closure: oneCClosureState(order),
   snapshot: snapshot ? { revision: snapshot.revision, asOf: snapshot.asOf, validUntil: snapshot.validUntil, receivedAt: snapshot.receivedAt, total: snapshot.total, paid: snapshot.paid, refunded: snapshot.refunded, debt: snapshot.debt, refundDue: snapshot.refundDue, paymentDueAt: snapshot.paymentDueAt, documents: snapshot.documents, closeReason: snapshot.closeReason, adjustments: snapshot.adjustments } : null,
   overdue: state.state === 'CURRENT' && Number(snapshot?.debt) > 0 && !!snapshot?.paymentDueAt && snapshot.paymentDueAt.getTime() < Date.now(),
   requests: order.oneCRequests.map((r: any) => ({ id: r.id, kind: r.kind, comment: r.comment, status: r.status, responseMessage: r.responseMessage, externalDocumentId: r.externalDocumentId, actorName: r.actorName, createdAt: r.createdAt, updatedAt: r.updatedAt })),
   operations: order.executionOperations.filter((op: any) => ['RETURN','CANCEL_REMAINDER'].includes(op.kind)).map((op: any) => ({ id: op.id, kind: op.kind, reason: op.reason, createdAt: op.createdAt, settlementStatus: op.settlementStatus })) };
 }
 get(actor: string, id: string) { return this.run(actor, false, async ctx => {
  const order = await ctx.db.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include });
  if (!order) throw new NotFoundException('Заказ не найден или недоступен');
  return this.view(order);
 }); }
 list(actor: string, query: ReceivablesQueryDto) { return this.run(actor, false, async ctx => {
  const page = query.page || 1, limit = 30;
  const where = { AND: [orderAccessWhere(ctx), { source: 'B2B' as const }, ...(query.search?.trim() ? [{ orderNumber: { contains: query.search.trim(), mode: 'insensitive' as const } }] : [])] };
  const total = await ctx.db.order.count({ where });
  const rows = await ctx.db.order.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page-1)*limit, take: limit });
  return { items: rows.map(order => { const { requests, operations, ...summary } = this.view(order); return summary; }), total, page, limit };
 }); }
 request(actor: string, id: string, dto: CreateOneCRequestDto) { return this.run(actor, true, async ctx => {
  const tx = ctx.db;
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
  const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include });
  if (!order) throw new NotFoundException('Заказ не найден или недоступен');
  const requestHash = createHash('sha256').update(JSON.stringify({ kind: dto.kind, comment: dto.comment.trim(), operationId: dto.operationId || null, expectedUpdatedAt: dto.expectedUpdatedAt })).digest('hex');
  const previous = order.oneCRequests.find(r => r.requestKey === dto.requestKey);
  if (previous) { if (previous.requestHash !== requestHash) throw new ConflictException('Ключ запроса уже использован'); return { id: previous.id, repeated: true }; }
  if (order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Заказ изменился. Обновите карточку');
  if (!dto.comment.trim()) throw new BadRequestException('Укажите основание запроса');
  if (dto.operationId && (dto.kind !== 'RETURN_REVIEW' || !order.executionOperations.some(op => op.id === dto.operationId && ['RETURN','CANCEL_REMAINDER'].includes(op.kind)))) throw new BadRequestException('Документ отмены или возврата недоступен');
  const basisHash = settlementBasis(order);
  if (order.oneCRequests.some(r => ['PENDING','RECEIVED'].includes(r.status) && r.kind === dto.kind && r.operationId === (dto.operationId || null) && r.basisHash === basisHash)) throw new ConflictException('Такой запрос уже ожидает ответа 1С');
  const actorRow = await tx.user.findUniqueOrThrow({ where: { id: actor }, select: { firstName: true, lastName: true } });
  const request = await tx.oneCOrderRequest.create({ data: { orderId: id, kind: dto.kind, requestKey: dto.requestKey, requestHash, comment: dto.comment.trim(), operationId: dto.operationId, basisHash, sourceRevision: order.oneCFinance?.revision || 0, actorId: actor, actorName: [actorRow.firstName, actorRow.lastName].filter(Boolean).join(' ') || 'Сотрудник' } });
  await tx.order.update({ where: { id }, data: { isSynced1C: false } });
  await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: 'ONE_C_REQUEST', payload: { requestId: request.id, kind: request.kind } } });
  return { id: request.id, repeated: false };
 }); }
}
