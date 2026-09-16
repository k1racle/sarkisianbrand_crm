import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { NotificationsService } from './notifications.service';
import { PasswordResetRequestController, PASSWORD_RESET_ACCEPTED, PASSWORD_RESET_EXPIRY_MS } from '../auth/password-reset-request.controller';
import { PasswordResetRequestDto } from '../auth/password-reset-request.dto';

describe('Public password reset (mocked data only)', () => {
  function setup() {
    const values: Record<string, any> = { INTEGRATION_ENCRYPTION_KEY: 'test-key-for-encrypted-reset-mail-at-least-32-characters', PUBLIC_APP_URL: 'https://store.example.test' };
    const config = {
      get: (key: string, fallback?: any) => values[key] ?? fallback,
      set: (key: string, value: any) => { values[key] = value; },
    } as unknown as ConfigService;
    const secrets = new IntegrationSecretsService(config);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-id', email: 'customer@example.test' }) },
      passwordResetToken: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'token-id' }),
      },
      mailOutbox: { create: jest.fn().mockResolvedValue({ id: 'mail-id' }) },
    };
    const prisma = { $transaction: jest.fn().mockImplementation((callback) => callback(tx)) };
    const smtp = { deliveryEnabled: jest.fn().mockReturnValue(false), send: jest.fn() };
    const notifications = new NotificationsService(prisma as any, secrets, smtp as any, config);
    const controller = new PasswordResetRequestController(prisma as any, notifications, config);
    return { config, secrets, tx, prisma, smtp, notifications, controller };
  }

  it('validates and normalizes email without accepting extra reset origin fields', async () => {
    const dto = plainToInstance(PasswordResetRequestDto, { email: '  CUSTOMER@Example.Test  ' });
    expect(dto.email).toBe('customer@example.test');
    expect(await validate(dto)).toEqual([]);
    expect((await validate(plainToInstance(PasswordResetRequestDto, { email: 'not an email' }))).length).toBeGreaterThan(0);
    const extra = plainToInstance(PasswordResetRequestDto, { email: 'test@example.test', returnUrl: 'https://attacker.test' });
    expect((await validate(extra, { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0);
  });

  it('atomically revokes unused tokens, stores only a short-lived hash and encrypts the full link', async () => {
    const { controller, tx, secrets, smtp, prisma } = setup();
    const response = await controller.request({ email: 'CUSTOMER@EXAMPLE.TEST' });
    expect(response).toEqual(PASSWORD_RESET_ACCEPTED);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.calls[0][0].join(' ')).toContain('pg_advisory_xact_lock');
    expect(tx.user.findFirst).toHaveBeenCalledWith({ where: {
      email: 'customer@example.test', isActive: true, role: 'CUSTOMER_B2C',
    }, select: { id: true, email: true } });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-id', usedAt: null }, data: { usedAt: expect.any(Date) } });
    const tokenData = tx.passwordResetToken.create.mock.calls[0][0].data;
    const mailData = tx.mailOutbox.create.mock.calls[0][0].data;
    const payload = secrets.decrypt(mailData.encryptedPayload);
    const rawToken = /token=([a-f0-9]{64})/.exec(payload.text)![1];
    expect(payload.text).toContain(`https://store.example.test/password-reset?token=${rawToken}`);
    expect(tokenData.tokenHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(tokenData.expiresAt.getTime() - tx.passwordResetToken.updateMany.mock.calls[0][0].data.usedAt.getTime()).toBe(PASSWORD_RESET_EXPIRY_MS);
    expect(JSON.stringify(tokenData)).not.toContain(rawToken);
    expect(JSON.stringify(mailData)).not.toContain(rawToken);
    expect(JSON.stringify(response)).not.toMatch(/token|resetUrl|customer@example/);
    expect(smtp.send).not.toHaveBeenCalled();
  });

  it.each(['unknown', 'staff', 'inactive'])('returns the same response for %s accounts and creates no token or mail', async () => {
    const { controller, tx } = setup();
    // The role/isActive-constrained database lookup cannot select these accounts.
    tx.user.findFirst.mockResolvedValue(null);
    expect(await controller.request({ email: 'other@example.test' })).toEqual(PASSWORD_RESET_ACCEPTED);
    expect(tx.passwordResetToken.create).not.toHaveBeenCalled();
    expect(tx.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('uses persistent cooldown under the transaction lock with a uniform response', async () => {
    const { controller, tx } = setup();
    tx.passwordResetToken.findFirst.mockResolvedValue({ id: 'recent-token' });
    expect(await controller.request({ email: 'customer@example.test' })).toEqual(PASSWORD_RESET_ACCEPTED);
    expect(tx.passwordResetToken.findFirst).toHaveBeenCalledWith({ where: {
      userId: 'user-id', createdAt: { gte: expect.any(Date) },
    }, select: { id: true } });
    expect(tx.passwordResetToken.updateMany).not.toHaveBeenCalled();
    expect(tx.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('does not enumerate accounts on queue failure, and emits no private exception details', async () => {
    const { controller, tx } = setup();
    tx.mailOutbox.create.mockRejectedValue(new Error('Sensitive address customer@example.test and token=private'));
    const warning = jest.spyOn((controller as any).logger, 'warn').mockImplementation(() => undefined);
    expect(await controller.request({ email: 'customer@example.test' })).toEqual(PASSWORD_RESET_ACCEPTED);
    expect(warning).toHaveBeenCalledWith('Не удалось подготовить запрос восстановления пароля.');
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/customer@example|private/);
  });

  it('fails closed for non-HTTPS production origins without returning configuration details', async () => {
    const { controller, config, prisma } = setup();
    config.set('NODE_ENV', 'production');
    config.set('PUBLIC_APP_URL', 'http://store.example.test');
    jest.spyOn((controller as any).logger, 'warn').mockImplementation(() => undefined);
    expect(await controller.request({ email: 'customer@example.test' })).toEqual(PASSWORD_RESET_ACCEPTED);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
