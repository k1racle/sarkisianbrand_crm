import { ConfigService } from '@nestjs/config';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { NotificationsService, MAIL_LEASE_MS, MAIL_MAX_ATTEMPTS, MAIL_RETRY_BASE_MS } from './notifications.service';
import { SmtpMailService } from './smtp-mail.service';

const KEY = 'unit-test-encryption-key-not-a-production-secret';
const input = {
  kind: 'ORDER_CREATED', recipient: 'TEST@example.test', subject: 'Заказ принят',
  text: 'Текст письма с приватной ссылкой', dedupeKey: 'order-created:123',
};

describe('Durable notifications (mocked database and SMTP only)', () => {
  function setup() {
    const values: Record<string, any> = { INTEGRATION_ENCRYPTION_KEY: KEY };
    const config = {
      get: (key: string, fallback?: any) => values[key] ?? fallback,
      set: (key: string, value: any) => { values[key] = value; },
    } as unknown as ConfigService;
    const secrets = new IntegrationSecretsService(config);
    const prisma = {
      mailOutbox: { upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      passwordResetToken: { findFirst: jest.fn().mockResolvedValue({ id: 'token-id' }) },
      $queryRaw: jest.fn(),
    };
    const smtp = { deliveryEnabled: jest.fn().mockReturnValue(true), send: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationsService(prisma as any, secrets, smtp as any, config);
    const claim = (attempts = 1) => ({ ...service.prepare(input), id: 'mail-id', attempts });
    return { config, secrets, prisma, smtp, service, claim };
  }

  it('encrypts both subject and text and hashes identifying deduplication keys', () => {
    const { service, secrets } = setup();
    const data = service.prepare(input);
    expect(data.encryptedPayload).not.toContain(input.subject);
    expect(data.encryptedPayload).not.toContain(input.text);
    expect(data.dedupeKey).not.toContain('123');
    expect(data.dedupeKey).toMatch(/^[a-f0-9]{64}$/);
    expect(secrets.decrypt(data.encryptedPayload)).toEqual({ subject: input.subject, text: input.text });
    expect(data.recipient).toBe('test@example.test');
    expect(service.prepare(input).encryptedPayload).not.toBe(data.encryptedPayload);
  });

  it('rejects the known fallback encryption key and email header injection', () => {
    const { service, config } = setup();
    expect(() => service.prepare({ ...input, subject: 'Подмена\r\nBcc: bad@example.test' })).toThrow('MAIL_DATA_INVALID');
    expect(() => service.prepare({ ...input, recipient: 'bad@example.test,other@example.test' })).toThrow('MAIL_DATA_INVALID');
    config.set('INTEGRATION_ENCRYPTION_KEY', '');
    expect(() => service.prepare(input)).toThrow('MAIL_ENCRYPTION_KEY_REQUIRED');
  });

  it('enqueues idempotently without sending, including safe mode', async () => {
    const { service, prisma, smtp } = setup();
    smtp.deliveryEnabled.mockReturnValue(false);
    prisma.mailOutbox.upsert.mockResolvedValue({ id: 'same-id', status: 'QUEUED' });
    expect(await service.enqueue(input)).toEqual({ id: 'same-id', status: 'QUEUED' });
    await service.enqueue(input);
    expect(prisma.mailOutbox.upsert.mock.calls[0][0].where).toEqual(prisma.mailOutbox.upsert.mock.calls[1][0].where);
    expect(prisma.mailOutbox.upsert.mock.calls[0][0].update).toEqual({});
    expect(smtp.send).not.toHaveBeenCalled();
  });

  it('does not query, claim, mutate, decrypt or send in disabled mode', async () => {
    const { service, prisma, smtp, secrets } = setup();
    smtp.deliveryEnabled.mockReturnValue(false);
    const decrypt = jest.spyOn(secrets, 'decrypt');
    service.onModuleInit();
    expect(await service.processQueue()).toEqual({ processed: 0, disabled: true });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.mailOutbox.updateMany).not.toHaveBeenCalled();
    expect(decrypt).not.toHaveBeenCalled();
    expect(smtp.send).not.toHaveBeenCalled();
    service.onModuleDestroy();
  });

  it('atomically claims with a lease and completes only the current owner attempt', async () => {
    const { service, prisma, smtp, claim } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([claim()]).mockResolvedValueOnce([]);
    expect(await service.processQueue()).toEqual({ processed: 1, disabled: false });
    const [sql, leaseUntil, claimedAt] = prisma.$queryRaw.mock.calls[0];
    expect(sql.join(' ')).toContain('FOR UPDATE SKIP LOCKED');
    expect(leaseUntil.getTime() - claimedAt.getTime()).toBe(MAIL_LEASE_MS);
    expect(smtp.send).toHaveBeenCalledWith({ recipient: 'test@example.test', subject: input.subject, text: input.text });
    expect(prisma.mailOutbox.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'mail-id', status: 'PROCESSING', attempts: 1 },
      data: { status: 'SENT', sentAt: expect.any(Date), lastError: null },
    });
  });

  it.each([1, 2, 4])('retries attempt %i exponentially without retaining the provider exception', async (attempt) => {
    const { service, prisma, smtp, claim } = setup();
    prisma.$queryRaw.mockResolvedValue([claim(attempt)]);
    smtp.send.mockRejectedValue(new Error('SMTP password=secret recipient=private@example.test'));
    const before = Date.now();
    await service.processQueue(1);
    const update = prisma.mailOutbox.updateMany.mock.calls.at(-1)![0];
    expect(update.data.status).toBe('QUEUED');
    expect(update.data.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + MAIL_RETRY_BASE_MS * 2 ** (attempt - 1));
    expect(update.data.nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now() + MAIL_RETRY_BASE_MS * 2 ** (attempt - 1));
    expect(JSON.stringify(update)).not.toMatch(/secret|private@example/);
  });

  it('caps attempts and recovers crashed final-attempt leases', async () => {
    const { service, prisma, smtp, claim } = setup();
    prisma.$queryRaw.mockResolvedValue([claim(MAIL_MAX_ATTEMPTS)]);
    smtp.send.mockRejectedValue(new Error('Private SMTP error'));
    await service.processQueue(1);
    expect(prisma.mailOutbox.updateMany.mock.calls[0][0]).toMatchObject({
      where: { status: 'PROCESSING', attempts: { gte: MAIL_MAX_ATTEMPTS }, nextAttemptAt: { lte: expect.any(Date) } },
      data: { status: 'FAILED' },
    });
    expect(prisma.mailOutbox.updateMany.mock.calls.at(-1)![0].data.status).toBe('FAILED');
  });

  it('cancels expired/revoked reset mail without sending it', async () => {
    const { service, prisma, smtp } = setup();
    const mail = service.prepare({ ...input, kind: 'PASSWORD_RESET', text: `Ссылка:\nhttps://example.test/password-reset?token=${'a'.repeat(64)}\n\nИнструкция` });
    prisma.$queryRaw.mockResolvedValue([{ ...mail, attempts: 1 }]);
    prisma.passwordResetToken.findFirst.mockResolvedValue(null);
    await service.processQueue(1);
    expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith({ where: {
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), usedAt: null,
      expiresAt: { gt: expect.any(Date) }, user: { isActive: true, role: 'CUSTOMER_B2C', email: 'test@example.test' },
    }, select: { id: true } });
    expect(smtp.send).not.toHaveBeenCalled();
    expect(prisma.mailOutbox.updateMany.mock.calls.at(-1)![0].data.status).toBe('CANCELLED');
  });

  it('prevents overlapping local queue processing', async () => {
    const { service, prisma } = setup();
    let release: (value: []) => void = () => undefined;
    prisma.$queryRaw.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const first = service.processQueue();
    await Promise.resolve();
    expect(await service.processQueue()).toEqual({ processed: 0, disabled: false });
    release([]);
    await first;
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
