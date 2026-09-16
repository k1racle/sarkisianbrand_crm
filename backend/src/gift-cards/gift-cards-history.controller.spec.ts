import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, HEADERS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GiftCardIdDto, ListGiftCardsDto } from './gift-cards.dto';
import { GiftCardsHistoryController } from './gift-cards-history.controller';

const ID = '123e4567-e89b-42d3-a456-426614174000';
function fixture() {
  const card = {
    id: ID, maskedCode: '********-********-********-89ABCDEF',
    faceValue: new Prisma.Decimal('1000.00'), balance: new Prisma.Decimal('750.50'),
    reserved: new Prisma.Decimal('100.25'), expiresAt: new Date('2099-01-01T00:00:00Z'), isActive: true,
    codeHash: 'PRIVATE_HASH', encryptedCode: 'PRIVATE_ENCRYPTED_CODE', purchaserUserId: 'PRIVATE_USER',
  };
  const rows = [{
    id: 'redemption-test', cardId: ID, orderId: 'PRIVATE_ORDER_ID',
    amount: new Prisma.Decimal('249.50'), status: 'APPLIED',
    createdAt: new Date('2026-09-16T10:00:00Z'), appliedAt: new Date('2026-09-16T10:01:00Z'), releasedAt: null,
    order: { orderNumber: 'WEB-TEST-1', userId: 'PRIVATE_BUYER', contact: { email: 'private@example.invalid' } },
  }];
  const writes = { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() };
  const tx = {
    giftCard: { findUnique: jest.fn(async (_args: any) => card), ...writes },
    giftCardRedemption: { count: jest.fn(async (_args: any) => 201), findMany: jest.fn(async (_args: any) => rows), ...writes },
    $executeRaw: jest.fn(), $queryRaw: jest.fn(),
  };
  // Root reads would make the response inconsistent with the transaction snapshot.
  const prisma = {
    giftCard: { findUnique: jest.fn() },
    giftCardRedemption: { count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  return { controller: new GiftCardsHistoryController(prisma as any), prisma, tx, card, rows, writes };
}

describe('GiftCardsHistoryController (mock DB only)', () => {
  it('defines the guarded private history route with only staff roles', () => {
    expect(Reflect.getMetadata(PATH_METADATA, GiftCardsHistoryController)).toBe('gift-cards');
    expect(Reflect.getMetadata(PATH_METADATA, GiftCardsHistoryController.prototype.history)).toBe(':id/history');
    expect(Reflect.getMetadata(GUARDS_METADATA, GiftCardsHistoryController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata('roles', GiftCardsHistoryController)).toEqual(['ADMIN', 'MANAGER_SALES', 'SUPERVISOR']);
    expect(Reflect.getMetadata(HEADERS_METADATA, GiftCardsHistoryController.prototype.history))
      .toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
  });

  it.each(['ADMIN', 'MANAGER_SALES', 'SUPERVISOR'])('allows role %s through the actual RolesGuard', async role => {
    const guard = new RolesGuard(new Reflector(), {} as any);
    const context: any = {
      getClass: () => GiftCardsHistoryController,
      getHandler: () => GiftCardsHistoryController.prototype.history,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'mock-staff', role } }) }),
    };
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it.each([undefined, 'B2C', 'B2B', 'CONTENT_MANAGER', 'WAREHOUSE'])('rejects missing/unauthorized role %s', async role => {
    const guard = new RolesGuard(new Reflector(), {} as any);
    const context: any = {
      getClass: () => GiftCardsHistoryController,
      getHandler: () => GiftCardsHistoryController.prototype.history,
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { sub: 'mock-user', role } : undefined }) }),
    };
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('defaults to the latest 100, using only one repeatable-read snapshot', async () => {
    const f = fixture();
    const result = await f.controller.history({ id: ID });
    expect(result).toMatchObject({ total: 201, page: 1, limit: 100 });
    expect(f.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(f.tx.giftCardRedemption.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cardId: ID }, skip: 0, take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(f.prisma.giftCard.findUnique).not.toHaveBeenCalled();
    expect(f.prisma.giftCardRedemption.count).not.toHaveBeenCalled();
    expect(f.prisma.giftCardRedemption.findMany).not.toHaveBeenCalled();
  });

  it('paginates and scopes both count and rows to the requested card', async () => {
    const f = fixture();
    expect(await f.controller.history({ id: ID }, { page: 3, limit: 20, search: 'ignored', status: 'all' }))
      .toMatchObject({ total: 201, page: 3, limit: 20 });
    expect(f.tx.giftCard.findUnique.mock.calls[0][0]).toEqual({
      where: { id: ID },
      select: { id: true, maskedCode: true, faceValue: true, balance: true, reserved: true, expiresAt: true, isActive: true },
    });
    expect(f.tx.giftCardRedemption.count).toHaveBeenCalledWith({ where: { cardId: ID } });
    expect(f.tx.giftCardRedemption.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { cardId: ID }, skip: 40, take: 20 }));
  });

  it('returns only safe explicit projections and RUB decimal strings even if DB mocks contain secrets', async () => {
    const f = fixture();
    const result = await f.controller.history({ id: ID }, {});
    expect(Object.keys(result.card).sort()).toEqual(['id', 'maskedCode', 'faceValue', 'balance', 'reserved', 'expiresAt', 'isActive'].sort());
    expect(result.card).toMatchObject({ faceValue: '1000', balance: '750.5', reserved: '100.25' });
    expect(result.items).toEqual([{
      id: 'redemption-test', amount: '249.5', status: 'APPLIED', createdAt: f.rows[0].createdAt,
      appliedAt: f.rows[0].appliedAt, releasedAt: null, orderNumber: 'WEB-TEST-1',
    }]);
    const json = JSON.stringify(result);
    for (const privateValue of ['PRIVATE_', 'codeHash', 'encryptedCode', 'purchaserUserId', 'orderId', 'cardId', 'userId', 'contact', 'email']) {
      expect(json).not.toContain(privateValue);
    }
    const args = f.tx.giftCardRedemption.findMany.mock.calls[0][0];
    expect(args.select).toEqual({ id: true, amount: true, status: true, createdAt: true,
      appliedAt: true, releasedAt: true, order: { select: { orderNumber: true } } });
  });

  it('returns 404 before accessing history for a missing card', async () => {
    const f = fixture();
    f.tx.giftCard.findUnique.mockResolvedValueOnce(null as any);
    await expect(f.controller.history({ id: ID }, {})).rejects.toBeInstanceOf(NotFoundException);
    expect(f.tx.giftCardRedemption.count).not.toHaveBeenCalled();
    expect(f.tx.giftCardRedemption.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty page while preserving the scoped total', async () => {
    const f = fixture();
    f.tx.giftCardRedemption.findMany.mockResolvedValueOnce([]);
    expect(await f.controller.history({ id: ID }, { page: 100, limit: 100 }))
      .toMatchObject({ items: [], total: 201, page: 100, limit: 100 });
  });

  it('performs no writes, raw SQL, locks or card mutations', async () => {
    const f = fixture();
    const before = JSON.stringify({ card: f.card, rows: f.rows });
    await f.controller.history({ id: ID }, {});
    Object.values(f.writes).forEach(mock => expect(mock).not.toHaveBeenCalled());
    expect(f.tx.$executeRaw).not.toHaveBeenCalled();
    expect(f.tx.$queryRaw).not.toHaveBeenCalled();
    expect(JSON.stringify({ card: f.card, rows: f.rows })).toBe(before);
  });

  it.each([{ page: 0 }, { page: 1.5 }, { page: 100001 }, { limit: 0 }, { limit: 101 }, { limit: 1.5 }])
    ('rejects invalid pagination %j before DB access', async query => {
      const f = fixture();
      await expect(f.controller.history({ id: ID }, query)).rejects.toBeInstanceOf(BadRequestException);
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    });

  it('uses the shared UUID param DTO and transforms query pagination', async () => {
    expect(await validate(plainToInstance(GiftCardIdDto, { id: ID }))).toHaveLength(0);
    expect(await validate(plainToInstance(GiftCardIdDto, { id: 'not-a-uuid' }))).not.toHaveLength(0);
    const query = plainToInstance(ListGiftCardsDto, { page: '2', limit: '10' });
    expect(query).toMatchObject({ page: 2, limit: 10 });
    expect(await validate(query)).toHaveLength(0);
    expect(await validate(plainToInstance(ListGiftCardsDto, { limit: '101' }))).not.toHaveLength(0);
  });
});
