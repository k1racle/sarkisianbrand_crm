import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from './auth.service';
import { CompletePasswordResetDto, RequestProfileChangeDto } from './dto/auth.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mocked-password-hash'),
  compare: jest.fn().mockResolvedValue(false),
}));

const NOW = new Date('2026-09-16T12:00:00Z');
const RAW_TOKEN = 'a'.repeat(64);
const input = () => ({ token: RAW_TOKEN, newPassword: 'SecurePass123' });

function fixture() {
  let claimed = false;
  const token: any = { id: 'token-id', userId: 'user-id', usedAt: null, expiresAt: new Date('2026-09-16T13:00:00Z'), user: { isActive: true } };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    passwordResetToken: { updateMany: jest.fn().mockImplementation(({ where }) => {
      if (!where.id || typeof where.id !== 'string') return Promise.resolve({ count: 2 });
      if (claimed) return Promise.resolve({ count: 0 });
      claimed = true;
      return Promise.resolve({ count: 1 });
    }) },
    user: { update: jest.fn().mockResolvedValue({ id: 'user-id' }) },
    session: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    profileChangeRequest: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'request-id', ...data })) },
  };
  const db = {
    passwordResetToken: { findUnique: jest.fn().mockImplementation(() => Promise.resolve(token)) },
    user: { findUnique: jest.fn().mockResolvedValue({ role: 'CUSTOMER_B2C' }) },
    $transaction: jest.fn().mockImplementation(callback => callback(tx)),
  };
  const jwt = { signAsync: jest.fn() };
  const service = new AuthService(db as any, jwt as any, { get: jest.fn() } as any);
  return { service, db, tx, token, jwt };
}

describe('Auth completion and profile validation (mocked DB/bcrypt only)', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(NOW); });
  afterEach(() => jest.useRealTimers());

  it('claims once with live/active predicates before password change, other token revocation and sessions', async () => {
    const f = fixture();
    expect(await f.service.completePasswordReset(input())).toEqual({ changed: true });
    expect(f.db.passwordResetToken.findUnique).toHaveBeenCalledWith({ where: {
      tokenHash: createHash('sha256').update(RAW_TOKEN).digest('hex'),
    }, include: { user: true } });
    expect(f.tx.passwordResetToken.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'token-id', usedAt: null, expiresAt: { gt: NOW }, user: { isActive: true } }, data: { usedAt: NOW },
    });
    expect(f.tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-id' }, data: {
      password: 'mocked-password-hash', passwordChangedAt: NOW, forcePasswordChange: false,
    } });
    expect(f.tx.passwordResetToken.updateMany.mock.calls[1][0]).toEqual({ where: {
      userId: 'user-id', id: { not: 'token-id' }, usedAt: null,
    }, data: { usedAt: NOW } });
    expect(f.tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-id' } });
    expect(f.tx.passwordResetToken.updateMany.mock.invocationCallOrder[0]).toBeLessThan(f.tx.user.update.mock.invocationCallOrder[0]);
    expect(f.tx.user.update.mock.invocationCallOrder[0]).toBeLessThan(f.tx.session.deleteMany.mock.invocationCallOrder[0]);
    expect(f.jwt.signAsync).not.toHaveBeenCalled();
  });

  it('makes no password/session/other-token changes when atomic claim count is zero', async () => {
    const f = fixture(); f.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.completePasswordReset(input())).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    expect(f.tx.user.update).not.toHaveBeenCalled();
    expect(f.tx.session.deleteMany).not.toHaveBeenCalled();
  });

  it('allows only one password change when concurrent requests read the same unused token', async () => {
    const f = fixture();
    const results = await Promise.allSettled([f.service.completePasswordReset(input()), f.service.completePasswordReset(input())]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(f.tx.user.update).toHaveBeenCalledTimes(1);
    expect(f.tx.session.deleteMany).toHaveBeenCalledTimes(1);
  });

  it.each(['used', 'expired', 'inactive', 'missing'])('rejects %s links before hashing/changing password', async state => {
    const f = fixture();
    if (state === 'used') f.token.usedAt = NOW;
    if (state === 'expired') f.token.expiresAt = NOW;
    if (state === 'inactive') f.token.user.isActive = false;
    if (state === 'missing') f.db.passwordResetToken.findUnique.mockResolvedValue(null);
    await expect(f.service.completePasswordReset(input())).rejects.toBeInstanceOf(BadRequestException);
    expect(bcrypt.hash).not.toHaveBeenCalled(); expect(f.db.$transaction).not.toHaveBeenCalled();
  });

  it('propagates password update failure through its owning transaction, without issuing sessions', async () => {
    const f = fixture(); f.tx.user.update.mockRejectedValue(new Error('mocked database failure'));
    await expect(f.service.completePasswordReset(input())).rejects.toThrow('mocked database failure');
    expect(f.db.$transaction).toHaveBeenCalledTimes(1);
    expect(f.tx.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    expect(f.tx.session.deleteMany).not.toHaveBeenCalled();
    expect(f.jwt.signAsync).not.toHaveBeenCalled();
  });

  it.each(['short123', 'abcdefghijk', '12345678901', 'a'.repeat(72) + '1', 'я'.repeat(36) + '1'])('rejects weak or over-72-byte passwords before token lookup: %s', async newPassword => {
    const f = fixture();
    await expect(f.service.completePasswordReset({ ...input(), newPassword })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.passwordResetToken.findUnique).not.toHaveBeenCalled(); expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it.each(['a'.repeat(71) + '1', 'я'.repeat(35) + '12', 'Letters1234'])('accepts strong passwords at or below the UTF-8 byte limit: %s', async newPassword => {
    const f = fixture();
    expect(Buffer.byteLength(newPassword, 'utf8')).toBeLessThanOrEqual(72);
    expect(await f.service.completePasswordReset({ ...input(), newPassword })).toEqual({ changed: true });
    expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
  });

  it.each(['2026-02-30', '1900-02-29', '2090-01-01', '1899-12-31', '2000/02/29', 'not-a-date'])('rejects malformed/future birthday requests before pending writes: %s', async birthday => {
    const f = fixture();
    await expect(f.service.requestProfileChange('user-id', { birthday })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
    expect(f.tx.profileChangeRequest.create).not.toHaveBeenCalled();
  });

  it('records a valid leap-day birthday only as an approval request, without changing user/customer data', async () => {
    const f = fixture();
    expect(await f.service.requestProfileChange('user-id', { birthday: '2000-02-29' })).toMatchObject({ requestedData: { birthday: '2000-02-29' } });
    expect(f.db.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id' }, select: { role: true } });
    expect(f.tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects birthday requests for non-B2C users', async () => {
    const f = fixture(); f.db.user.findUnique.mockResolvedValue({ role: 'CUSTOMER_B2B' });
    await expect(f.service.requestProfileChange('user-id', { birthday: '2000-02-29' })).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.profileChangeRequest.create).not.toHaveBeenCalled();
  });

  it('validates minimum password length, birthday shape and forbidden profile fields at DTO boundary', async () => {
    expect((await validate(plainToInstance(CompletePasswordResetDto, { token: RAW_TOKEN, newPassword: 'short123' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(RequestProfileChangeDto, { birthday: '02/29/2000' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(RequestProfileChangeDto, { birthday: '2000-02-29', role: 'ADMIN' }), {
      whitelist: true, forbidNonWhitelisted: true,
    })).length).toBeGreaterThan(0);
  });
});
