import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePromotionDto, DeletePromotionDto, GeneratePromoCodeDto, ListPromotionsDto, PromoCodeParamDto, UpdatePromotionDto } from './promotions.dto';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

const row = (overrides: Record<string, any> = {}) => ({
  code: 'WELCOME10', title: 'Приветственная скидка', discountType: 'PERCENT',
  amount: new Prisma.Decimal('10.00'), minimumAmount: new Prisma.Decimal('500.00'), maximumDiscount: null,
  usageLimit: 100, perCustomerLimit: 1, isActive: true, startsAt: null, endsAt: null,
  revision: 1, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'), ...overrides,
});
const createInput = (): CreatePromotionDto => ({ title: 'Скидка', type: 'PERCENT', amount: 10 });

describe('PromotionsService (mocked DB only)', () => {
  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(row()),
        findUniqueOrThrow: jest.fn().mockResolvedValue(row({ revision: 2 })),
        findMany: jest.fn().mockResolvedValue([row()]), count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }), delete: jest.fn().mockResolvedValue(row()),
      },
      promoRedemption: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    };
    const db = {
      ...tx,
      promoCode: { ...tx.promoCode, create: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))) },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new PromotionsService(db as any);
    return { tx, db, service };
  }

  it('normalizes a manually entered code and returns decimal strings and no customer data', async () => {
    const { service, db } = setup();
    const result = await service.create({ ...createInput(), code: ' hello-10 ', minimumAmount: 499.99, maximumDiscount: 250 });
    expect(db.promoCode.create.mock.calls[0][0].data).toMatchObject({
      code: 'HELLO-10', discountType: 'PERCENT', title: 'Скидка', isActive: true,
      usageLimit: null, perCustomerLimit: 1,
    });
    expect(result).toMatchObject({ code: 'HELLO-10', type: 'PERCENT', amount: '10.00', minimumAmount: '499.99', maximumDiscount: '250.00',
      revision: 1, usage: { reserved: 0, applied: 0, total: 0, history: 0 }, canDelete: true });
    expect(result).not.toHaveProperty('redemptions');
    expect(JSON.stringify(result)).not.toMatch(/customerHash|email|phone/);
  });

  it('creates a readable secure code automatically, retries collisions, and conflicts on a supplied duplicate', async () => {
    const { service, db } = setup();
    db.promoCode.create.mockRejectedValueOnce({ code: 'P2002' });
    const result = await service.create(createInput());
    expect(result.code).toMatch(/^SB-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(db.promoCode.create).toHaveBeenCalledTimes(2);
    db.promoCode.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ ...createInput(), code: 'WELCOME10' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('generates code only, respects generation parameters, checks availability, and never persists', async () => {
    const { service, db } = setup();
    db.promoCode.findUnique.mockResolvedValueOnce(row()).mockResolvedValue(null);
    const result = await service.generate({ prefix: ' salon ', length: 12 });
    expect(result.code).toMatch(/^SALON-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/);
    expect(db.promoCode.findUnique).toHaveBeenCalledTimes(2);
    expect(db.promoCode.create).not.toHaveBeenCalled();
    expect(Object.keys(result)).toEqual(['code']);
  });

  it('caps generation collision retries and rejects invalid generation parameters', async () => {
    const { service, db } = setup();
    await expect(service.generate()).rejects.toBeInstanceOf(ConflictException);
    expect(db.promoCode.findUnique).toHaveBeenCalledTimes(10);
    await expect(service.generate({ prefix: 'РУС', length: 12 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.generate({ length: 50 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { amount: 100.01 }, { type: 'FIXED', amount: 0 }, { amount: 1.123 },
    { amount: -1 }, { amount: Number.NaN }, { amount: true }, { amount: '10' },
    { maximumDiscount: 0 }, { minimumAmount: -1 }, { perCustomerLimit: 0 },
    { usageLimit: 1.5 }, { isActive: 'false' }, { title: '   ' }, { type: 'OTHER' },
  ])('rejects invalid promotion conditions before touching the database: %j', async (overrides) => {
    const { service, db } = setup();
    await expect(service.create({ ...createInput(), ...overrides } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.promoCode.create).not.toHaveBeenCalled();
  });

  it('allows 100% discount and valid fixed amounts, nullable caps/limits and zero minimum', async () => {
    const { service } = setup();
    expect((await service.create({ ...createInput(), amount: 100 })).amount).toBe('100.00');
    expect((await service.create({ ...createInput(), type: 'FIXED', amount: 0.01, minimumAmount: 0, usageLimit: null, maximumDiscount: null })).amount).toBe('0.01');
  });

  it('validates date ordering and rejects explicitly activating an expired promotion', async () => {
    const { service, db } = setup();
    await expect(service.create({ ...createInput(), startsAt: '2090-02-01T00:00:00Z', endsAt: '2090-01-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ ...createInput(), startsAt: 'invalid' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ ...createInput(), endsAt: '2020-01-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.create({ ...createInput(), isActive: false, endsAt: '2020-01-01T00:00:00Z' })).status).toBe('INACTIVE');
    db.promoCode.findUnique.mockResolvedValue(row({ endsAt: new Date('2020-01-01T00:00:00Z') }));
  });

  it('lists consistent counts with reserved/applied usage separate from released history and no PII', async () => {
    const { service, tx, db } = setup();
    tx.promoRedemption.groupBy.mockResolvedValue([
      { code: 'WELCOME10', status: 'RESERVED', _count: { _all: 2 } },
      { code: 'WELCOME10', status: 'APPLIED', _count: { _all: 3 } },
      { code: 'WELCOME10', status: 'RELEASED', _count: { _all: 4 } },
    ]);
    const result = await service.list({ page: 2, limit: 10, search: ' привет ', status: 'active' });
    expect(result).toMatchObject({ total: 1, page: 2, limit: 10, items: [{ usage: { reserved: 2, applied: 3, total: 5, history: 9 }, canDelete: false }] });
    const listCall = tx.promoCode.findMany.mock.calls[0][0];
    expect(listCall).toMatchObject({ skip: 10, take: 10, where: { isActive: true, OR: [
      { code: { contains: 'привет', mode: 'insensitive' } }, { title: { contains: 'привет', mode: 'insensitive' } },
    ] } });
    expect(tx.promoCode.count).toHaveBeenCalledWith({ where: listCall.where });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    expect(tx.promoRedemption.groupBy).toHaveBeenCalledWith({ by: ['code', 'status'], where: { code: { in: ['WELCOME10'] } }, _count: { _all: true } });
    expect(JSON.stringify(result)).not.toMatch(/customerHash|email|phone/);
  });

  it.each(['inactive', 'expired', 'scheduled'])('supports list status filter %s', async (status) => {
    const { service, tx } = setup();
    await service.list({ status });
    const where = tx.promoCode.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(status !== 'inactive');
    if (status === 'expired') expect(where.endsAt.lte).toBeInstanceOf(Date);
    if (status === 'scheduled') expect(where.startsAt.gt).toBeInstanceOf(Date);
  });

  it('does not query redemption counts for an empty page', async () => {
    const { service, tx } = setup();
    tx.promoCode.findMany.mockResolvedValue([]);
    expect((await service.list()).items).toEqual([]);
    expect(tx.promoRedemption.groupBy).not.toHaveBeenCalled();
  });

  it('locks the same row as checkout, updates with revision CAS and keeps omitted conditions', async () => {
    const { service, tx } = setup();
    tx.promoRedemption.groupBy.mockResolvedValue([
      { status: 'RESERVED', _count: { _all: 1 } }, { status: 'APPLIED', _count: { _all: 2 } },
    ]);
    const result = await service.update(' welcome10 ', { revision: 1, title: 'Новое название', maximumDiscount: null });
    expect(tx.$queryRaw.mock.calls[0][0].join(' ')).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.calls[0][1]).toBe('WELCOME10');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.promoCode.findUnique.mock.invocationCallOrder[0]);
    expect(tx.promoCode.updateMany).toHaveBeenCalledWith({ where: { code: 'WELCOME10', revision: 1 }, data: expect.objectContaining({
      title: 'Новое название', discountType: 'PERCENT', revision: { increment: 1 }, maximumDiscount: null,
      usageLimit: 100, perCustomerLimit: 1, isActive: true,
    }) });
    expect(result.revision).toBe(2);
    expect(result.usage.total).toBe(3);
  });

  it('rejects stale revisions, failed CAS and missing/empty patch data', async () => {
    const { service, tx } = setup();
    await expect(service.update('WELCOME10', { revision: 2, title: 'Название' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.promoCode.updateMany).not.toHaveBeenCalled();
    tx.promoCode.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update('WELCOME10', { revision: 1, title: 'Название' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update('WELCOME10', { revision: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('WELCOME10', { title: 'Название' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects lowering total limit below active reservations plus applications, not released history', async () => {
    const { service, tx } = setup();
    tx.promoRedemption.groupBy.mockResolvedValue([
      { status: 'RESERVED', _count: { _all: 2 } }, { status: 'APPLIED', _count: { _all: 3 } }, { status: 'RELEASED', _count: { _all: 100 } },
    ]);
    await expect(service.update('WELCOME10', { revision: 1, usageLimit: 4 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.promoCode.updateMany).not.toHaveBeenCalled();
    await service.update('WELCOME10', { revision: 1, usageLimit: 5 });
    expect(tx.promoCode.updateMany.mock.calls[0][0].data.usageLimit).toBe(5);
  });

  it('rejects lowering per-customer limit below actual maximum and does not expose customer hashes', async () => {
    const { service, tx } = setup();
    tx.promoRedemption.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { customerHash: 'private-customer-hash', _count: { _all: 3 } },
    ]);
    await expect(service.update('WELCOME10', { revision: 1, perCustomerLimit: 2 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.promoRedemption.groupBy.mock.calls[1][0]).toMatchObject({
      by: ['customerHash'], where: { code: 'WELCOME10', status: { in: ['RESERVED', 'APPLIED'] } }, take: 1,
    });
    expect(tx.promoCode.updateMany).not.toHaveBeenCalled();
  });

  it('can deactivate/edit an expired record but cannot explicitly reactivate it without new dates', async () => {
    const { service, tx } = setup();
    tx.promoCode.findUnique.mockResolvedValue(row({ endsAt: new Date('2020-01-01T00:00:00Z') }));
    await expect(service.update('WELCOME10', { revision: 1, isActive: true })).rejects.toBeInstanceOf(BadRequestException);
    await service.update('WELCOME10', { revision: 1, isActive: false });
    await service.update('WELCOME10', { revision: 1, title: 'Исторический промокод' });
    await service.update('WELCOME10', { revision: 1, isActive: true, endsAt: null, startsAt: null });
    expect(tx.promoCode.updateMany).toHaveBeenCalledTimes(3);
  });

  it('requires exact confirmation before any deletion transaction', async () => {
    const { service, db } = setup();
    await expect(service.remove('WELCOME10', { confirmation: 'welcome10' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove('WELCOME10', { confirmation: 'OTHER' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('physically deletes only an unused locked promo row', async () => {
    const { service, tx } = setup();
    expect(await service.remove('WELCOME10', { confirmation: 'WELCOME10' })).toEqual({ code: 'WELCOME10', deleted: true });
    expect(tx.$queryRaw.mock.calls[0][0].join(' ')).toContain('FOR UPDATE');
    expect(tx.promoRedemption.count).toHaveBeenCalledWith({ where: { code: 'WELCOME10' } });
    expect(tx.promoCode.delete).toHaveBeenCalledWith({ where: { code: 'WELCOME10' } });
  });

  it.each(['RESERVED', 'APPLIED', 'RELEASED'])('preserves every financial-history status, including %s', async () => {
    const { service, tx } = setup();
    tx.promoRedemption.count.mockResolvedValue(1);
    await expect(service.remove('WELCOME10', { confirmation: 'WELCOME10' })).rejects.toThrow('Отключите его вместо удаления');
    expect(tx.promoCode.delete).not.toHaveBeenCalled();
  });

  it('returns not-found for unknown update/delete and maps FK races to a safe 409', async () => {
    const { service, tx } = setup();
    tx.promoCode.findUnique.mockResolvedValue(null);
    await expect(service.update('UNKNOWN', { revision: 1, title: 'Название' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('UNKNOWN', { confirmation: 'UNKNOWN' })).rejects.toBeInstanceOf(NotFoundException);
    tx.promoCode.findUnique.mockResolvedValue(row());
    tx.promoCode.delete.mockRejectedValue({ code: 'P2003', meta: 'private-financial-data' });
    await expect(service.remove('WELCOME10', { confirmation: 'WELCOME10' })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Promotions HTTP contract (no server or database)', () => {
  const converted = <T>(cls: new () => T, values: any) => plainToInstance(cls, values, { enableImplicitConversion: true });
  const errors = (dto: any) => validate(dto, { whitelist: true, forbidNonWhitelisted: true });

  it('protects the entire controller with JWT followed by the four exact admin roles', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PromotionsController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata('roles', PromotionsController)).toEqual(['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR']);
  });

  it('accepts valid create/patch nullable fields and strict confirmation', async () => {
    expect(await errors(converted(CreatePromotionDto, { ...createInput(), code: ' hello-10 ', usageLimit: null, maximumDiscount: null,
      startsAt: '2090-01-01T00:00:00Z', endsAt: null }))).toEqual([]);
    expect(await errors(converted(UpdatePromotionDto, { revision: 1, isActive: false, usageLimit: null, maximumDiscount: null, startsAt: null, endsAt: null }))).toEqual([]);
    expect(await errors(converted(DeletePromotionDto, { confirmation: 'HELLO-10' }))).toEqual([]);
    expect(converted(PromoCodeParamDto, { code: ' hello-10 ' }).code).toBe('HELLO-10');
  });

  it.each([
    { amount: true }, { amount: '10' }, { amount: 10.111 }, { amount: null },
    { usageLimit: -1 }, { usageLimit: 2.2 }, { perCustomerLimit: null },
    { minimumAmount: null }, { isActive: null }, { isActive: 'false' },
    { code: 'КИРИЛЛИЦА' }, { code: 'AB' }, { code: 'A'.repeat(41) },
    { endsAt: '2090-02-30T00:00:00Z' }, { startsAt: '2090-01-01' },
  ])('rejects malformed DTO fields even under implicit conversion: %j', async (overrides) => {
    expect((await errors(converted(CreatePromotionDto, { ...createInput(), ...overrides }))).length).toBeGreaterThan(0);
  });

  it('forbids code changes, missing revision, unsupported list/generation and unrelated fields', async () => {
    expect((await errors(converted(UpdatePromotionDto, { revision: 1, code: 'CHANGED' }))).length).toBeGreaterThan(0);
    expect((await errors(converted(UpdatePromotionDto, { title: 'Название' }))).length).toBeGreaterThan(0);
    expect((await errors(converted(ListPromotionsDto, { page: 0, limit: 101, status: 'bad' }))).length).toBeGreaterThan(0);
    expect((await errors(converted(GeneratePromoCodeDto, { prefix: 'BAD PREFIX', length: 2 }))).length).toBeGreaterThan(0);
    expect((await errors(converted(DeletePromotionDto, { confirmation: 'ABC', customerHash: 'private' }))).length).toBeGreaterThan(0);
  });
});
