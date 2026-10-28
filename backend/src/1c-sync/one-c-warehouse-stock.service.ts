import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { executionSnapshot } from '../oms/execution-snapshot';
import { projectCoveredOrders } from '../oms/one-c-warehouse-projector';
import { OneCWarehouseStocksDto } from './dto/warehouse-stock.dto';
import { lockWarehouseIntegration, VerifyLockedIntegration } from './locked-integration';

const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const MAX_INT = 2147483647;

/** Versioned 1C good physical stock and all 1C reservations, plus uncovered local holds. */
export class OneCWarehouseStockService {
 constructor(private readonly prisma: PrismaService) {}

 async receive(input: OneCWarehouseStocksDto, verify?: VerifyLockedIntegration) {
  const dto = plainToInstance(OneCWarehouseStocksDto, input);
  if ((await validate(dto, { whitelist:true, forbidNonWhitelisted:true })).length) throw new BadRequestException('Некорректный формат складских остатков 1С');
  const now = new Date();
  for (const position of dto.positions) {
   const asOf = new Date(position.asOf), validUntil = new Date(position.validUntil);
   if (!Number.isFinite(asOf.getTime()) || !Number.isFinite(validUntil.getTime()) || asOf.getTime() > now.getTime() + 60000 || validUntil <= asOf || validUntil <= now || validUntil.getTime() - asOf.getTime() > 15 * 60_000) throw new BadRequestException('Срок актуальности остатков 1С некорректен или превышает 15 минут');
  }
  try { return await this.prisma.$transaction(async tx => {
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(73422142)`;
   const settings = await tx.ecosystemIntegration.findUnique({ where:{key:'ONE_C'},select:{config:true} });
   if (!(settings?.config as any)?.warehouseId || (settings?.config as any).warehouseId !== dto.warehouseId) throw new ConflictException('Склад снимка не соответствует складу 1С, настроенному для CRM');
   const positions = [...dto.positions].sort((a,b)=>a.variantId.localeCompare(b.variantId));
   // Warehouse facts lock Order then Variant. Use that order here as well so
   // covered orders can be projected in this transaction without deadlocks.
   const coveredIds = [...new Set(positions.flatMap(position => position.coveredEventIds))].sort();
   const coveredEvents = coveredIds.length ? await tx.oneCWarehouseEvent.findMany({where:{eventId:{in:coveredIds}},select:{eventId:true,orderId:true}}) : [];
   if (coveredEvents.length !== coveredIds.length) throw new ConflictException('Снимок ссылается на неизвестное складское событие 1С');
   const coveredOrderIds = [...new Set(coveredEvents.map(event => event.orderId))].sort();
   for (const orderId of coveredOrderIds) await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
   // Hold the exact same Variant rows as checkout before reading local holds.
   for (const position of positions) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${position.variantId} FOR UPDATE`;
   await lockWarehouseIntegration(tx, dto.warehouseId, verify);
   const result = { accepted:0, repeated:0, ignored:0 };
   for (const item of positions) {
    const variant = await tx.productVariant.findUnique({ where:{id:item.variantId},include:{ product:{select:{externalId:true,productType:true}}, oneCWarehouseStock:true } });
    if (!variant || variant.product.productType !== 'PHYSICAL') throw new NotFoundException('Физическая товарная позиция CRM не найдена');
    if (variant.sku !== item.sku || !variant.product.externalId || variant.product.externalId !== item.externalProductId) throw new ConflictException('Артикул или идентификатор товара 1С не соответствует позиции CRM');
    const asOf = new Date(item.asOf), validUntil = new Date(item.validUntil), coveredEventIds = [...item.coveredEventIds].sort();
    const normalized = {protocolVersion:2,stockBasis:dto.stockBasis,warehouseId:dto.warehouseId,variantId:item.variantId,externalProductId:item.externalProductId,sku:item.sku,revision:item.revision,stock:item.stock,damagedStock:item.damagedStock,reserved1C:item.reserved1C,asOf:asOf.toISOString(),validUntil:validUntil.toISOString(),coveredEventIds};
    const payloadHash = createHash('sha256').update(JSON.stringify(canonical(normalized))).digest('hex'), previous = variant.oneCWarehouseStock;
    if (previous && (previous.warehouseId !== dto.warehouseId || previous.externalProductId !== item.externalProductId || previous.sku !== item.sku)) throw new ConflictException('Склад или соответствие товара изменились. Требуется сверка');
    if (previous && previous.revision >= item.revision) {
     if (previous.revision === item.revision && previous.payloadHash !== payloadHash) throw new ConflictException('Эта версия остатков уже получена с другим содержимым');
     if (previous.revision === item.revision) {
      if (previous.validUntil.getTime() !== validUntil.getTime()) throw new ConflictException('Снимок был устаревшим после события склада. Требуется новая версия 1С');
      result.repeated++;
     } else result.ignored++;
     continue;
    }
    if (previous && asOf < previous.asOf) throw new BadRequestException('Время снимка остатков не может двигаться назад');
    const holds = await tx.orderItem.findMany({ where:{variantId:item.variantId,productType:'PHYSICAL',order:{reservationState:'ACTIVE'}},include:{order:{include:{items:true,execution:true,warehouseExecution:true}}},take:10001 });
    if (holds.length > 10000) throw new ConflictException('Слишком много открытых резервов; требуется отдельная сверка');
    if (holds.some(line => line.order.fulfillmentManaged)) throw new ConflictException('Есть открытое складское исполнение CRM. Сначала требуется сверка');
    const events = coveredEventIds.length ? await tx.oneCWarehouseEvent.findMany({ where:{eventId:{in:coveredEventIds}},include:{order:{include:{items:true,execution:true,warehouseExecution:true}}} }) : [];
    if (events.length !== coveredEventIds.length) throw new ConflictException('Снимок ссылается на неизвестное складское событие 1С');
    const eventByOrder = new Map<string, {event:any; payload:any}>();
    for (const event of events) {
     const payload:any = event.payload;
     if (!payload || payload.protocolVersion !== 1 || payload.eventId !== event.eventId || payload.platformOrderId !== event.orderId || payload.revision !== event.revision || payload.warehouseId !== dto.warehouseId || !Array.isArray(payload.lines) || !Number.isFinite(Date.parse(payload.asOf)) || new Date(payload.asOf) > asOf) throw new ConflictException('Событие 1С не соответствует складу или времени снимка');
     if (eventByOrder.has(event.orderId)) throw new ConflictException('В снимке указано несколько версий одного заказа');
     const relevant = event.order.items.filter(line=>line.variantId === item.variantId && line.productType === 'PHYSICAL');
     if (!relevant.length || relevant.some(line=>!payload.lines.some((fact:any)=>fact.orderItemId === line.id))) throw new ConflictException('Складское событие не относится к товарной позиции');
     eventByOrder.set(event.orderId,{event,payload});
    }
    let localPending = 0, coveredReserved = 0;
    const coverages: {orderItemId:string;eventId:string;revision:number;reserved:number;shipped:number;cancelled:number}[] = [];
    for (const line of holds) {
     if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new ConflictException('Некорректное локальное удержание заказа');
     const match = eventByOrder.get(line.orderId), order = line.order, current = order.warehouseExecution;
     const trusted = match && current && current.eventId === match.event.eventId && current.revision === match.event.revision && order.execution && match.payload.executionVersion === order.execution.version && match.payload.basisHash === order.execution.snapshotHash && match.payload.basisHash === executionSnapshot(order) && match.payload.external1CId === order.externalId;
     if (!trusted) { localPending += line.quantity; continue; }
     const fact = match.payload.lines.find((candidate:any)=>candidate.orderItemId===line.id);
     if (!fact || !['reserved','shipped','cancelled'].every(key=>Number.isSafeInteger(fact[key]) && fact[key] >= 0) || fact.reserved + fact.shipped + fact.cancelled > line.quantity) throw new ConflictException('Складское событие содержит некорректные количества резерва');
     coveredReserved += fact.reserved;
     localPending += line.quantity - fact.shipped - fact.cancelled - fact.reserved;
     coverages.push({orderItemId:line.id,eventId:match.event.eventId,revision:match.event.revision,reserved:fact.reserved,shipped:fact.shipped,cancelled:fact.cancelled});
    }
    if (coveredReserved > item.reserved1C) throw new ConflictException('Общий резерв 1С меньше подтверждённых резервов заказов');
    const effectiveReserved = item.reserved1C + localPending;
    if (!Number.isSafeInteger(effectiveReserved) || effectiveReserved > MAX_INT) throw new ConflictException('Сумма резервов превышает допустимый диапазон');
    for (const coverage of coverages) {
     const {orderItemId,...values}=coverage;
     await tx.oneCWarehouseCoverage.upsert({where:{orderItemId},create:{orderItemId,...values},update:values});
    }
    const data = {warehouseId:dto.warehouseId,externalProductId:item.externalProductId,sku:item.sku,revision:item.revision,stock:item.stock,damagedStock:item.damagedStock,reserved1C:item.reserved1C,localPending,asOf,validUntil,receivedAt:new Date(),payloadHash,coveredEventIds};
    await tx.oneCWarehouseStock.upsert({where:{variantId:item.variantId},create:{variantId:item.variantId,...data},update:data});
    await tx.productVariant.update({where:{id:item.variantId},data:{stock:item.stock,damagedStock:item.damagedStock,reserved:effectiveReserved}});
    result.accepted++;
   }
   const projection = await projectCoveredOrders(tx, coveredOrderIds, new Date());
   if (result.accepted) await tx.syncLog.create({data:{system:'1C_KA',action:'WAREHOUSE_STOCK',status:projection.review ? 'WARNING' : 'SUCCESS',message:`Подтверждены остатки 1С: ${result.accepted}`,details:{warehouseId:dto.warehouseId,...result,projection,variants:positions.map(item=>({id:item.variantId,revision:item.revision}))}}});
   return result;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000});
  } catch (error:any) {
   if (['P2002','P2034'].includes(error?.code) || (error?.code === 'P2010' && ['40001','40P01'].includes(error.meta?.code))) throw new ConflictException('Параллельный обмен изменил данные. Повторите тот же пакет');
   throw error;
  }
 }
}
