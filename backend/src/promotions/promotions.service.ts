import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PromoCode } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto, DeletePromotionDto, GeneratePromoCodeDto, ListPromotionsDto, PROMO_CODE_PATTERN, UpdatePromotionDto } from './promotions.dto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const USED_STATUSES = ['RESERVED', 'APPLIED'];
const PROMO_SELECT = {
  code: true, title: true, discountType: true, amount: true, minimumAmount: true,
  maximumDiscount: true, usageLimit: true, perCustomerLimit: true, isActive: true,
  startsAt: true, endsAt: true, revision: true, createdAt: true, updatedAt: true,
} satisfies Prisma.PromoCodeSelect;
type Usage = { reserved: number; applied: number; total: number; history: number };

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private code(value: string) {
    if (typeof value !== 'string') throw new BadRequestException('Укажите корректный промокод.');
    const code = value.trim().toUpperCase();
    if (!PROMO_CODE_PATTERN.test(code)) throw new BadRequestException('Промокод должен содержать 3–40 латинских букв, цифр, дефисов или подчёркиваний.');
    return code;
  }

  private makeCode(dto: GeneratePromoCodeDto = {}) {
    const prefix = dto.prefix === undefined ? 'SB' : String(dto.prefix).trim().toUpperCase();
    const length = dto.length === undefined ? 8 : dto.length;
    if (!/^[A-Z0-9]{1,12}$/.test(prefix) || !Number.isInteger(length) || length < 6 || length > 20) {
      throw new BadRequestException('Префикс: 1–12 латинских букв или цифр; длина случайной части: 6–20.');
    }
    let suffix = '';
    for (let i = 0; i < length; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
    return `${prefix}-${suffix}`;
  }

  async generate(dto: GeneratePromoCodeDto = {}): Promise<{ code: string }> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.makeCode(dto);
      if (!await this.prisma.promoCode.findUnique({ where: { code }, select: { code: true } })) return { code };
    }
    throw new ConflictException('Не удалось подобрать свободный промокод. Повторите генерацию.');
  }

  private date(value: string | null | undefined, fallback: Date | null = null): Date | null {
    if (value === undefined) return fallback;
    if (value === null) return null;
    if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      throw new BadRequestException('Укажите дату в формате ISO 8601 с часовым поясом.');
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException('Некорректная дата действия промокода.');
    return date;
  }

  private decimal(value: unknown, minimum: number): Prisma.Decimal {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 100_000_000 ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
      throw new BadRequestException('Денежные значения должны быть числами с максимум двумя знаками после запятой.');
    }
    return new Prisma.Decimal(value.toFixed(2));
  }

  private conditions(dto: CreatePromotionDto | UpdatePromotionDto, current?: PromoCode) {
    const title = dto.title === undefined ? current?.title : dto.title;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) throw new BadRequestException('Укажите название промокода до 160 символов.');
    const discountType = dto.type ?? current?.discountType;
    if (!['PERCENT', 'FIXED'].includes(discountType || '')) throw new BadRequestException('Выберите процентную скидку или фиксированную сумму.');
    const amount = dto.amount === undefined && current ? current.amount : this.decimal(dto.amount, 0.01);
    if (discountType === 'PERCENT' && amount.gt(100)) throw new BadRequestException('Процентная скидка не может превышать 100%.');
    const minimumAmount = dto.minimumAmount === undefined ? current?.minimumAmount ?? new Prisma.Decimal(0) : this.decimal(dto.minimumAmount, 0);
    const maximumDiscount = dto.maximumDiscount === undefined ? current?.maximumDiscount ?? null :
      dto.maximumDiscount === null ? null : this.decimal(dto.maximumDiscount, 0.01);
    const usageLimit = dto.usageLimit === undefined ? current?.usageLimit ?? null : dto.usageLimit;
    const perCustomerLimit = dto.perCustomerLimit === undefined ? current?.perCustomerLimit ?? 1 : dto.perCustomerLimit;
    for (const limit of [usageLimit, perCustomerLimit]) {
      if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 2_147_483_647)) throw new BadRequestException('Лимиты использования должны быть положительными целыми числами.');
    }
    if (perCustomerLimit === null) throw new BadRequestException('Лимит на клиента обязателен.');
    const startsAt = this.date(dto.startsAt, current?.startsAt);
    const endsAt = this.date(dto.endsAt, current?.endsAt);
    if (startsAt && endsAt && endsAt <= startsAt) throw new BadRequestException('Дата окончания должна быть позже даты начала.');
    const isActive = dto.isActive === undefined ? current?.isActive ?? true : dto.isActive;
    if (typeof isActive !== 'boolean') throw new BadRequestException('Укажите, включён ли промокод.');
    // Allow editing/deactivating an expired historical record, but not explicitly enabling it.
    if (isActive && endsAt && endsAt <= new Date() && (!current || dto.isActive === true)) {
      throw new BadRequestException('Нельзя включить промокод с истёкшим сроком. Измените дату окончания.');
    }
    return { title: title.trim(), discountType: discountType!, amount, minimumAmount, maximumDiscount,
      usageLimit, perCustomerLimit: perCustomerLimit!, isActive, startsAt, endsAt };
  }

  private view(row: PromoCode, usage: Usage = { reserved: 0, applied: 0, total: 0, history: 0 }) {
    const now = new Date();
    const status = !row.isActive ? 'INACTIVE' : row.endsAt && row.endsAt <= now ? 'EXPIRED' :
      row.startsAt && row.startsAt > now ? 'SCHEDULED' : 'ACTIVE';
    return {
      code: row.code, title: row.title, type: row.discountType,
      amount: row.amount.toFixed(2), minimumAmount: row.minimumAmount.toFixed(2),
      maximumDiscount: row.maximumDiscount?.toFixed(2) ?? null,
      usageLimit: row.usageLimit, perCustomerLimit: row.perCustomerLimit, isActive: row.isActive,
      startsAt: row.startsAt, endsAt: row.endsAt, revision: row.revision,
      createdAt: row.createdAt, updatedAt: row.updatedAt, status, usage,
      canDelete: usage.history === 0,
    };
  }

  async list(query: ListPromotionsDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const now = new Date();
    const where: Prisma.PromoCodeWhereInput = {};
    if (query.search?.trim()) where.OR = [
      { code: { contains: query.search.trim(), mode: 'insensitive' } },
      { title: { contains: query.search.trim(), mode: 'insensitive' } },
    ];
    if (query.status === 'inactive') where.isActive = false;
    if (query.status === 'expired') { where.isActive = true; where.endsAt = { lte: now }; }
    if (query.status === 'scheduled') {
      where.isActive = true; where.startsAt = { gt: now };
      where.AND = [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }];
    }
    if (query.status === 'active') {
      where.isActive = true;
      where.AND = [ { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] } ];
    }
    return this.prisma.$transaction(async (tx) => {
      const [rows, total] = await Promise.all([
        tx.promoCode.findMany({ where, select: PROMO_SELECT, orderBy: [{ createdAt: 'desc' }, { code: 'asc' }], skip: (page - 1) * limit, take: limit }),
        tx.promoCode.count({ where }),
      ]);
      const groups = rows.length ? await tx.promoRedemption.groupBy({
        by: ['code', 'status'], where: { code: { in: rows.map(row => row.code) } }, _count: { _all: true },
      }) : [];
      const usage = new Map<string, Usage>();
      for (const group of groups) {
        const item = usage.get(group.code) || { reserved: 0, applied: 0, total: 0, history: 0 };
        item.history += group._count._all;
        if (group.status === 'RESERVED') item.reserved += group._count._all;
        if (group.status === 'APPLIED') item.applied += group._count._all;
        item.total = item.reserved + item.applied;
        usage.set(group.code, item);
      }
      return { items: rows.map(row => this.view(row, usage.get(row.code))), total, page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async create(dto: CreatePromotionDto) {
    const data = this.conditions(dto);
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = dto.code === undefined ? this.makeCode() : this.code(dto.code);
      try {
        const row = await this.prisma.promoCode.create({ data: { ...data, code }, select: PROMO_SELECT });
        return this.view(row);
      } catch (error) {
        if ((error as any)?.code !== 'P2002') throw error;
        if (dto.code !== undefined) throw new ConflictException('Промокод уже существует. Выберите другой код.');
      }
    }
    throw new ConflictException('Не удалось создать свободный промокод. Повторите попытку.');
  }

  async update(rawCode: string, dto: UpdatePromotionDto) {
    const code = this.code(rawCode);
    if (!Number.isInteger(dto.revision) || dto.revision < 1 || dto.revision > 2_147_483_646) throw new BadRequestException('Передайте актуальную ревизию промокода.');
    if (Object.keys(dto).filter(key => key !== 'revision' && dto[key] !== undefined).length === 0) throw new BadRequestException('Укажите изменения промокода.');
    return this.prisma.$transaction(async (tx) => {
      // Same row lock as OrdersService checkout; limit checks and edits cannot race checkout.
      await tx.$queryRaw`SELECT code FROM "PromoCode" WHERE code = ${code} FOR UPDATE`;
      const current = await tx.promoCode.findUnique({ where: { code }, select: PROMO_SELECT });
      if (!current) throw new NotFoundException('Промокод не найден.');
      if (current.revision !== dto.revision) throw new ConflictException('Промокод уже изменён другим сотрудником. Обновите список и повторите изменения.');
      const data = this.conditions(dto, current);
      const groups = await tx.promoRedemption.groupBy({ by: ['status'], where: { code }, _count: { _all: true } });
      const usage: Usage = { reserved: 0, applied: 0, total: 0, history: 0 };
      for (const group of groups) {
        usage.history += group._count._all;
        if (group.status === 'RESERVED') usage.reserved += group._count._all;
        if (group.status === 'APPLIED') usage.applied += group._count._all;
      }
      usage.total = usage.reserved + usage.applied;
      if (data.usageLimit !== null && data.usageLimit < usage.total) throw new ConflictException('Общий лимит не может быть меньше количества применений и активных резервов.');
      if (dto.perCustomerLimit !== undefined) {
        const mostUsed = await tx.promoRedemption.groupBy({
          by: ['customerHash'], where: { code, status: { in: USED_STATUSES } }, _count: { _all: true },
          orderBy: { _count: { customerHash: 'desc' } }, take: 1,
        });
        if (data.perCustomerLimit < (mostUsed[0]?._count._all ?? 0)) throw new ConflictException('Лимит на клиента не может быть меньше уже использованного количества, включая активные резервы.');
      }
      const updated = await tx.promoCode.updateMany({ where: { code, revision: dto.revision }, data: { ...data, revision: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Промокод изменён. Обновите список.');
      const row = await tx.promoCode.findUniqueOrThrow({ where: { code }, select: PROMO_SELECT });
      return this.view(row, usage);
    });
  }

  async remove(rawCode: string, dto: DeletePromotionDto) {
    const code = this.code(rawCode);
    if (dto?.confirmation !== code) throw new BadRequestException('Для удаления введите точный промокод в поле подтверждения.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT code FROM "PromoCode" WHERE code = ${code} FOR UPDATE`;
        const row = await tx.promoCode.findUnique({ where: { code }, select: { code: true } });
        if (!row) throw new NotFoundException('Промокод не найден.');
        const history = await tx.promoRedemption.count({ where: { code } });
        if (history) throw new ConflictException('Промокод имеет историю использования и не может быть удалён. Отключите его вместо удаления: история заказов должна сохраниться.');
        await tx.promoCode.delete({ where: { code } });
        return { code, deleted: true };
      });
    } catch (error) {
      if ((error as any)?.code === 'P2003') throw new ConflictException('Промокод связан с заказами. Отключите его вместо удаления.');
      throw error;
    }
  }
}
