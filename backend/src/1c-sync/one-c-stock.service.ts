import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { OneCStockSnapshotsDto } from './dto/stock.dto';
import { operationMovement } from './stock-reconciliation';

export class OneCStockService {
 constructor(private readonly prisma: PrismaService) {}
 async receive(input: OneCStockSnapshotsDto) {
  const dto = plainToInstance(OneCStockSnapshotsDto, input);
  if ((await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length) throw new BadRequestException('Некорректный пакет остатков 1С');
  try { return await this.prisma.$transaction(async tx => {
   // Serialize the stream, including its first snapshot. Stock itself is never changed.
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(73422141)`;
   const settings = await tx.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { config: true } });
   if (!(settings?.config as any)?.warehouseId || (settings?.config as any).warehouseId !== dto.warehouseId) throw new ConflictException('Склад снимка не соответствует складу 1С, настроенному для CRM');
   const result = { accepted: 0, repeated: 0, ignored: 0 };
   for (const item of [...dto.positions].sort((a,b) => a.variantId.localeCompare(b.variantId))) {
    const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, include: { product: { select: { externalId: true, productType: true } }, oneCStock: true } });
    if (!variant || variant.product.productType !== 'PHYSICAL') throw new NotFoundException('Физическая товарная позиция CRM не найдена');
    if (variant.sku !== item.sku || !variant.product.externalId || variant.product.externalId !== item.externalProductId) throw new ConflictException('Артикул или идентификатор товара 1С не соответствует позиции CRM');
    const includedOperationIds = [...item.includedOperationIds].sort(), asOf = new Date(item.asOf), validUntil = new Date(item.validUntil), previous = variant.oneCStock;
    const data = { warehouseId: dto.warehouseId, externalProductId: item.externalProductId, sku: item.sku, revision: item.revision, stock: item.stock, damagedStock: item.damagedStock, asOf, validUntil, includedOperationIds };
    const payloadHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (previous && previous.warehouseId !== dto.warehouseId) throw new ConflictException('Для смены склада требуется отдельная сверка и перенос начальных остатков');
    if (previous && (previous.externalProductId !== item.externalProductId || previous.sku !== item.sku)) throw new ConflictException('Соответствие товара изменилось. Требуется сверка прежних снимков перед продолжением обмена');
    if (previous && previous.revision >= item.revision) {
     if (previous.revision === item.revision && previous.payloadHash !== payloadHash) throw new ConflictException('Эта версия остатков уже получена с другим содержимым');
     if (previous.revision === item.revision) result.repeated++; else result.ignored++;
     continue;
    }
    if (asOf.getTime() > Date.now() + 60000 || validUntil <= asOf || (previous && asOf < previous.asOf)) throw new BadRequestException('Некорректное время снимка остатков');
    if (previous && (previous.includedOperationIds as string[]).some(id => !includedOperationIds.includes(id))) throw new ConflictException('Новый снимок потерял ранее учтённые документы CRM');
    if (includedOperationIds.length) {
     const operations = await tx.orderExecutionOperation.findMany({ where: { id: { in: includedOperationIds }, kind: { in: ['SHIP', 'RETURN'] } }, include: { order: { select: { items: { select: { id: true, variantId: true } } } } } });
     if (operations.length !== includedOperationIds.length) throw new ConflictException('Снимок ссылается на неизвестные складские документы');
     for (const operation of operations) {
      let movement;
      try { movement = operationMovement(operation, variant.id); } catch { throw new ConflictException('Неполная история складского документа'); }
      if (!movement || operation.createdAt > asOf) throw new ConflictException('Документ не относится к позиции или создан позже снимка');
     }
    }
    await tx.oneCStockSnapshot.upsert({ where: { variantId: variant.id }, create: { variantId: variant.id, ...data, payloadHash }, update: { ...data, payloadHash, receivedAt: new Date() } });
    result.accepted++;
   }
   if (result.accepted) await tx.syncLog.create({ data: { system: '1C_KA', action: 'STOCK_SNAPSHOTS', status: 'SUCCESS', message: `Получены снимки остатков: ${result.accepted}. Остатки CRM не изменялись`, details: { warehouseId: dto.warehouseId, ...result, variants: dto.positions.map(i => ({ id: i.variantId, revision: i.revision })) } } });
   return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  } catch (error: any) {
   if (['P2034','P2002'].includes(error.code) || (error.code === 'P2010' && ['40001','40P01'].includes(error.meta?.code))) throw new ConflictException('Параллельный обмен изменил данные. Повторите тот же пакет');
   throw error;
  }
 }
}
