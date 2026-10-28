import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { lockWarehouseIntegration, VerifyLockedIntegration } from './locked-integration';
import { executionSnapshot } from '../oms/execution-snapshot';
import { OneCWarehouseLineDto, OneCWarehouseSnapshotDto } from './dto/warehouse.dto';

const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fields = ['picked', 'checked', 'shipped', 'cancelled', 'returned', 'damaged'] as const;

/** Stores confirmed 1C facts only. It never performs a warehouse movement in CRM. */
export class OneCWarehouseService {
 constructor(private readonly prisma: PrismaService) {}

 async receive(input: OneCWarehouseSnapshotDto, verify?: VerifyLockedIntegration) {
  const dto = plainToInstance(OneCWarehouseSnapshotDto, input);
  if ((await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length) throw new BadRequestException('Некорректный формат складских данных 1С');
  if (!Number.isFinite(Date.parse(dto.asOf)) || !Number.isFinite(Date.parse(dto.validUntil))) throw new BadRequestException('Некорректное время складских данных');
  const normalized = {
   ...dto,
   executionVersion: dto.executionVersion ?? null,
   asOf: new Date(dto.asOf).toISOString(), validUntil: new Date(dto.validUntil).toISOString(),
   documentId: dto.documentId || null, documentNumber: dto.documentNumber || null,
   executorName: dto.executorName || null, error: dto.error || null, correctionReason: dto.correctionReason || null,
   lines: dto.lines.map(line => ({ ...line })).sort((a,b) => a.orderItemId.localeCompare(b.orderItemId)),
   documents: [...dto.documents].map(doc => ({ id: doc.id, kind: doc.kind, number: doc.number || null, status: doc.status || null })).sort((a,b) => a.id.localeCompare(b.id)),
  };
  const payloadHash = createHash('sha256').update(JSON.stringify(canonical(normalized))).digest('hex');
  try { return await this.prisma.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${dto.platformOrderId} FOR UPDATE`;
   const order = await tx.order.findUnique({ where: { id: dto.platformOrderId }, include: { items: true, execution: true, warehouseExecution: true } });
   if (!order) throw new NotFoundException('Заказ CRM не найден');
   const priorEvent = await tx.oneCWarehouseEvent.findUnique({ where: { eventId: dto.eventId } });
   if (priorEvent) {
    if (priorEvent.orderId !== order.id || priorEvent.revision !== dto.revision || priorEvent.payloadHash !== payloadHash) throw new ConflictException('Идентификатор события 1С уже использован для других данных');
    await lockWarehouseIntegration(tx, dto.warehouseId, verify);
    return { id: order.id, revision: priorEvent.revision, repeated: true, ignored: false };
   }
   const previous = order.warehouseExecution;
   if (previous && previous.revision >= dto.revision) {
    if (previous.revision === dto.revision) throw new ConflictException('Эта версия складских данных уже получена с другим событием');
    await lockWarehouseIntegration(tx, dto.warehouseId, verify);
    return { id: order.id, revision: previous.revision, repeated: false, ignored: true };
   }
   if (order.fulfillmentManaged) throw new ConflictException('Исполнение этого заказа ведётся в CRM. Сначала требуется сверка и перенос в 1С');
   if (!order.externalId) throw new ConflictException('Дождитесь подтверждения передачи заказа и его идентификатора 1С');
   if (order.externalId !== dto.external1CId || (previous && previous.external1CId !== dto.external1CId)) throw new ConflictException('Идентификатор 1С не соответствует заказу');
   const settings = await tx.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { config: true } });
   if (!(settings?.config as any)?.warehouseId || (settings?.config as any).warehouseId !== dto.warehouseId || (previous && previous.warehouseId !== dto.warehouseId)) throw new ConflictException('Склад данных не соответствует настроенному складу 1С');
   if (executionSnapshot(order) !== dto.basisHash || (order.execution && order.execution.snapshotHash !== dto.basisHash)) throw new ConflictException('Ответ 1С относится к прежнему составу или условиям заказа');
   if ((order.execution && dto.executionVersion !== order.execution.version) || (!order.execution && dto.executionVersion !== undefined && dto.executionVersion !== null)) throw new ConflictException('Ответ 1С относится к другой версии подтверждения заказа');
   const asOf = new Date(dto.asOf), validUntil = new Date(dto.validUntil);
   if (asOf.getTime() > Date.now() + 60000 || validUntil <= asOf || (previous && asOf < previous.asOf)) throw new BadRequestException('Некорректное время складских данных');
   if (dto.status === 'REJECTED' && !dto.error?.trim()) throw new BadRequestException('Укажите причину отказа 1С');
   const items = order.items.filter(item => item.productType === 'PHYSICAL');
   if (!items.length || dto.lines.length !== items.length || items.some(item => !item.variantId || !dto.lines.some(line => line.orderItemId === item.id))) throw new ConflictException('Складские данные должны содержать все связанные физические строки заказа');
   const previousLines = new Map<string, OneCWarehouseLineDto>(((previous?.lines || []) as unknown as OneCWarehouseLineDto[]).map(line => [line.orderItemId, line]));
   for (const line of dto.lines) {
    const item = items.find(item => item.id === line.orderItemId)!;
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || line.cancelled + line.picked > item.quantity || line.shipped > line.picked || line.checked > line.picked || line.returned > line.shipped || line.damaged > line.returned || line.reserved > item.quantity - line.shipped - line.cancelled) throw new ConflictException('Складские количества не соответствуют строке заказа');
    const old = previousLines.get(line.orderItemId);
    if (old && fields.some(field => line[field] < old[field]) && !dto.correctionReason?.trim()) throw new ConflictException('Укажите причину уменьшения ранее подтверждённых складских количеств');
   }
   const hasActivity = dto.lines.some(line => line.reserved || line.picked || line.checked || line.shipped || line.cancelled || line.returned || line.damaged);
   if (!order.execution && (hasActivity || !['RECEIVED', 'REJECTED'].includes(dto.status))) throw new ConflictException('Заказ ещё не подтверждён менеджером для передачи на склад');
   if (dto.status === 'RESERVED' && dto.lines.some(line => { const item = items.find(item => item.id === line.orderItemId)!; return line.reserved + line.shipped + line.cancelled < item.quantity; })) throw new ConflictException('Полный резерв не подтверждён для всех строк заказа');
   if (dto.status === 'PARTIALLY_SHIPPED' && (!dto.lines.some(line => line.shipped > 0) || dto.lines.every(line => { const item = items.find(item => item.id === line.orderItemId)!; return line.shipped + line.cancelled === item.quantity; }))) throw new ConflictException('Частичная отгрузка не соответствует количествам заказа');
   if (dto.status === 'SHIPPED' && (!dto.lines.some(line => line.shipped > 0) || dto.lines.some(line => { const item = items.find(item => item.id === line.orderItemId)!; return line.shipped + line.cancelled !== item.quantity; }))) throw new ConflictException('Полная отгрузка не подтверждена для всех строк заказа');
   if (['PARTIALLY_SHIPPED', 'SHIPPED'].includes(dto.status) && !dto.documentId && !dto.documents.length) throw new ConflictException('Отгрузка должна ссылаться на документ 1С');
   if (dto.status === 'CANCELLED' && dto.lines.some(line => { const item = items.find(item => item.id === line.orderItemId)!; return line.shipped > 0 || line.cancelled !== item.quantity; })) throw new ConflictException('Заказ не отменён полностью или уже содержит отгрузку');
   const stockFields = ['reserved', 'shipped', 'cancelled', 'returned', 'damaged'] as const;
   const changedVariants = [...new Set(dto.lines.filter(line => {
    const old = previousLines.get(line.orderItemId);
    return stockFields.some(field => line[field] !== (old?.[field] || 0));
   }).map(line => items.find(item => item.id === line.orderItemId)!.variantId!))].sort();
   // Invalidate availability while holding the same Variant locks as checkout.
   // A new stock snapshot is required before these variants can be sold again.
   for (const variantId of changedVariants) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
   await lockWarehouseIntegration(tx, dto.warehouseId, verify);
   if (changedVariants.length) await tx.oneCWarehouseStock.updateMany({where:{variantId:{in:changedVariants}},data:{validUntil:new Date(0)}});
   const data = { owner: 'ONE_C', external1CId: dto.external1CId, warehouseId: dto.warehouseId, revision: dto.revision, executionVersion: normalized.executionVersion, eventId: dto.eventId, payloadHash, basisHash: dto.basisHash, status: dto.status, asOf, validUntil, receivedAt: new Date(), documentId: normalized.documentId, documentNumber: normalized.documentNumber, executorName: normalized.executorName, error: normalized.error, lines: normalized.lines as unknown as Prisma.InputJsonValue, documents: normalized.documents as unknown as Prisma.InputJsonValue };
   await tx.oneCOrderWarehouse.upsert({ where: { orderId: order.id }, create: { orderId: order.id, ...data }, update: data });
   await tx.oneCWarehouseEvent.create({ data: { eventId: dto.eventId, orderId: order.id, revision: dto.revision, payloadHash, payload: normalized as unknown as Prisma.InputJsonValue } });
   await tx.syncLog.create({ data: { system: '1C_KA', action: 'WAREHOUSE_SNAPSHOT', status: dto.status === 'REJECTED' ? 'WARNING' : 'SUCCESS', message: `Склад 1С: заказ ${order.orderNumber}, версия ${dto.revision}`, details: { orderId: order.id, warehouseId: dto.warehouseId, revision: dto.revision, eventId: dto.eventId, status: dto.status } } });
   return { id: order.id, revision: dto.revision, repeated: false, ignored: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  } catch (error: any) {
   if (['P2002','P2034'].includes(error?.code) || (error?.code === 'P2010' && ['40001','40P01'].includes(error.meta?.code))) throw new ConflictException('Параллельный обмен изменил данные. Повторите тот же пакет');
   throw error;
  }
 }
}
