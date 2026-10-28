import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { operationAccess } from '../common/operational-access.fixture';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { HelpdeskService } from './helpdesk.service';

const url = process.env.WAREHOUSE_TEST_DATABASE_URL;
if (url && (!url.startsWith('postgresql://warehouse_fixture:') || !url.includes('@127.0.0.1:55432/warehouse_test'))) throw new Error('Helpdesk test requires the isolated warehouse fixture database');
const pg = url ? describe : describe.skip;

pg('Support email delivery and retries (isolated PostgreSQL, no SMTP)', () => {
  const db = new PrismaClient({ datasources: { db: { url: url || 'postgresql://unused:unused@127.0.0.1:55432/warehouse_test' } } });
  const actor = randomUUID(), ticketId = randomUUID(), requestKey = randomUUID();
  const cfg = new ConfigService({ INTEGRATION_ENCRYPTION_KEY: 'fixture-only-encryption-key-with-32-characters' });
  const secrets = new IntegrationSecretsService(cfg);
  const smtp: any = { send: jest.fn(), deliveryEnabled: () => false };
  const notifications = new NotificationsService(db as any, secrets, smtp, cfg);
  const service = new HelpdeskService(db as any, operationAccess(), notifications);
  const sentIds: string[] = [];
  beforeAll(async () => {
    await db.user.create({ data: { id: actor, email: `helpdesk-${actor}@example.invalid`, password: 'test-only', role: 'IT_SUPPORT' } });
    await db.helpdeskTicket.create({ data: { id: ticketId, number: `HD-TEST-${ticketId}`, source: 'B2C', subject: 'Fixture', description: 'Fixture only', requesterEmail: 'reply@example.invalid', assignedToId: actor } });
  });
  afterAll(async () => {
    await db.mailOutbox.deleteMany({ where: { id: { in: sentIds } } });
    await db.auditLog.deleteMany({ where: { actorId: actor, resource: 'helpdesk', resourceId: ticketId } });
    await db.helpdeskTicket.deleteMany({ where: { id: ticketId } });
    await db.user.deleteMany({ where: { id: actor } });
    await db.$disconnect();
  });
  it('keeps one encrypted email and one comment after concurrent retries', async () => {
    const dto = { body: 'Ваш заказ проверен', sendEmail: true, requestKey };
    const first = await Promise.allSettled([service.addComment(actor, ticketId, dto), service.addComment(actor, ticketId, dto)]);
    expect(first.some(result => result.status === 'fulfilled')).toBe(true);
    const replay = await service.addComment(actor, ticketId, dto);
    const comments = await db.helpdeskComment.findMany({ where: { ticketId } });
    expect(comments).toHaveLength(1); expect(replay.id).toBe(comments[0].id);
    const mails = await db.mailOutbox.findMany({ where: { kind: 'HELPDESK_REPLY', recipient: 'reply@example.invalid' } });
    sentIds.push(...mails.map(mail => mail.id));
    expect(mails).toHaveLength(1); expect(mails[0].status).toBe('QUEUED');
    expect(mails[0].encryptedPayload).not.toContain(dto.body);
    expect(secrets.decrypt(mails[0].encryptedPayload).text).toBe(dto.body);
    expect((await service.ticket(actor, ticketId)).comments[0].emailDelivery).toMatchObject({ status: 'QUEUED' });
    expect(smtp.send).not.toHaveBeenCalled();
    await expect(service.addComment(actor, ticketId, { ...dto, body: 'Другой ответ' })).rejects.toMatchObject({ status: 409 });
    await expect(service.addComment(actor, ticketId, { ...dto, sendEmail: false })).rejects.toMatchObject({ status: 409 });
  });
  it('never sends an internal comment and rolls back when the outbox cannot be prepared', async () => {
    await expect(service.addComment(actor, ticketId, { body: 'Internal', isInternal: true, sendEmail: true, requestKey: randomUUID() })).rejects.toMatchObject({ status: 400 });
    const broken = new HelpdeskService(db as any, operationAccess(), { prepare: () => { throw new Error('fixture failure'); } } as any);
    await expect(broken.addComment(actor, ticketId, { body: 'Rollback', sendEmail: true, requestKey: randomUUID() })).rejects.toThrow('fixture failure');
    expect(await db.helpdeskComment.count({ where: { ticketId, body: { in: ['Internal', 'Rollback'] } } })).toBe(0);
    expect(smtp.send).not.toHaveBeenCalled();
  });
  it('does not allow a staff member with own-only access to reply to someone else’s ticket', async () => {
    const scoped = new HelpdeskService(db as any, operationAccess('OWN', 'OWN'), notifications);
    await expect(scoped.addComment(randomUUID(), ticketId, { body: 'Forbidden', sendEmail: true, requestKey: randomUUID() })).rejects.toMatchObject({ status: 404 });
    expect(await db.helpdeskComment.count({ where: { ticketId, body: 'Forbidden' } })).toBe(0);
  });
});
