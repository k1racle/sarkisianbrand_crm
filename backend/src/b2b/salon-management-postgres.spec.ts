import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { SalonBookingService } from './salon-booking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';

const url = process.env.SALON_MANAGEMENT_TEST_DATABASE_URL;
if (url && (!url.startsWith('postgresql://salon_fixture:') || !url.includes('@127.0.0.1:55434/salon_fixture'))) throw new Error('Use the isolated salon fixture database only');
const pg = url ? describe : describe.skip;

pg('Public salon booking management (isolated PostgreSQL, fake SMTP)', () => {
  const db = new PrismaClient({ datasources: { db: { url: url || 'postgresql://unused:unused@127.0.0.1:55434/salon_fixture' } } });
  const config: any = { get: (key: string) => key === 'SITE_URL' ? 'https://example.invalid' : 'fixture-secret-not-for-real-use-12345678' };
  const smtp: any = { deliveryEnabled: () => true, send: jest.fn().mockResolvedValue(undefined) };
  const secrets = new IntegrationSecretsService(config), notifications = new NotificationsService(db as any, secrets, smtp, config);
  const salon = new SalonBookingService(db as any, notifications, config);
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  async function fixture() {
    const org = await db.organization.create({ data: { name: 'Fixture', status: 'ACTIVE' } });
    const owner = await db.user.create({ data: { email: `owner-${randomUUID()}@example.invalid`, firstName: 'Анна', lastName: 'Мастер', password: 'fixture', role: 'CUSTOMER_B2B' } });
    const member = await db.organizationMember.create({ data: { organizationId: org.id, userId: owner.id, role: 'OWNER' } });
    const service = await db.b2BService.create({ data: { organizationId: org.id, name: 'Маникюр', duration: 60, price: 1000 } });
    await db.salonBookingSetting.create({ data: { organizationId: org.id, enabled: true, timeZone: 'UTC', startMinute: 540, endMinute: 1200, masterIds: [member.id], workingDays: [0,1,2,3,4,5,6] } });
    const dto = { requestKey: randomUUID(), serviceId: service.id, masterMemberId: member.id, date: day, startTime: `${day}T09:00:00.000Z`, firstName: 'Клиент', phone: '79000000000', email: `client-${randomUUID()}@example.invalid`, personalDataConsent: true };
    return { org, owner, service, dto };
  }
  afterAll(async () => db.$disconnect());
  beforeEach(async () => { smtp.send.mockClear(); await db.mailOutbox.deleteMany({ where: { kind: { in: ['SALON_BOOKING_OWNER', 'SALON_BOOKING_CLIENT'] } } }); });

  it('creates one visit and one encrypted message per recipient even on concurrent replay', async () => {
    const f = await fixture();
    const [a, b] = await Promise.all([salon.publicCreate(f.org.id, f.dto), salon.publicCreate(f.org.id, f.dto)]);
    expect(b).toEqual(a); expect(a.manageToken).toMatch(/^[a-f0-9-]{36}\.[a-f0-9]{64}$/);
    expect(await db.b2BBooking.count({ where: { organizationId: f.org.id } })).toBe(1);
    const saved = await db.salonBookingRequest.findFirstOrThrow({ where: { organizationId: f.org.id } });
    expect(JSON.stringify(saved.response)).not.toContain(a.manageToken);
    const messages = await db.mailOutbox.findMany({ where: { recipient: { in: [f.owner.email, f.dto.email] } } });
    expect(messages).toHaveLength(2);
    expect(messages.every(mail => !mail.encryptedPayload.includes(a.manageToken!))).toBe(true);
    const clientMessage = messages.find(mail => mail.recipient === f.dto.email)!;
    const payload = secrets.decrypt(clientMessage.encryptedPayload);
    expect(payload.text).toContain('/booking-manage/'); expect(payload.text).toContain('#token='); expect(payload.text).toContain(a.manageToken);
    expect(smtp.send).not.toHaveBeenCalled();
  });

  it('rolls back the visit if the notification outbox cannot be created', async () => {
    const f = await fixture();
    const failing = new SalonBookingService(db as any, { prepare: () => { throw new Error('fixture-outbox-failure'); } } as any, config);
    await expect(failing.publicCreate(f.org.id, f.dto)).rejects.toThrow('fixture-outbox-failure');
    expect(await db.b2BBooking.count({ where: { organizationId: f.org.id } })).toBe(0);
    expect(await db.salonBookingRequest.count({ where: { organizationId: f.org.id } })).toBe(0);
    expect(await db.b2BClient.count({ where: { organizationId: f.org.id } })).toBe(0);
    expect(await db.mailOutbox.count({ where: { recipient: { in: [f.owner.email, f.dto.email] } } })).toBe(0);
  });

  it('rejects another salon, altered capability and stale versions; repeated cancel is harmless', async () => {
    const f = await fixture(), a = await salon.publicCreate(f.org.id, f.dto);
    const token = a.manageToken!;
    await expect(salon.publicManageView(randomUUID(), token)).rejects.toMatchObject({ status: 404 });
    await expect(salon.publicManageView(f.org.id, token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'))).rejects.toMatchObject({ status: 404 });
    await expect(salon.publicManageCancel(f.org.id, { token, version: 99 })).rejects.toMatchObject({ status: 409 });
    const [one, two] = await Promise.all([salon.publicManageCancel(f.org.id, { token, version: 1 }), salon.publicManageCancel(f.org.id, { token, version: 1 })]);
    expect(one.status).toBe('CANCELLED'); expect(two.status).toBe('CANCELLED');
    expect(await db.salonBookingEvent.count({ where: { bookingId: a.id } })).toBe(2);
    expect(await db.mailOutbox.count({ where: { recipient: { in: [f.owner.email, f.dto.email] } } })).toBe(4);
  });

  it('serializes competing moves, preserving one booking per slot and the original duration', async () => {
    const f = await fixture();
    const a = await salon.publicCreate(f.org.id, f.dto);
    const b = await salon.publicCreate(f.org.id, { ...f.dto, requestKey: randomUUID(), email: undefined, phone: '79000000001', startTime: `${day}T11:00:00.000Z` });
    const target = `${day}T10:00:00.000Z`;
    const results = await Promise.allSettled([salon.publicManageMove(f.org.id, { token: a.manageToken!, version: 1, date: day, startTime: target }), salon.publicManageMove(f.org.id, { token: b.manageToken!, version: 1, date: day, startTime: target })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await db.b2BBooking.count({ where: { organizationId: f.org.id, startTime: new Date(target), status: { not: 'CANCELLED' } } })).toBe(1);
    const moved = await db.b2BBooking.findFirstOrThrow({ where: { organizationId: f.org.id, startTime: new Date(target) } });
    expect(moved.endTime.getTime() - moved.startTime.getTime()).toBe(3600000);
    const retryToken = moved.id === a.id ? a.manageToken! : b.manageToken!;
    expect((await salon.publicManageMove(f.org.id, { token: retryToken, version: 1, date: day, startTime: target })).id).toBe(moved.id);
  });

  it('does not send a stale confirmation after the booking is cancelled', async () => {
    const f = await fixture(), a = await salon.publicCreate(f.org.id, f.dto);
    await salon.publicManageCancel(f.org.id, { token: a.manageToken!, version: 1 });
    await notifications.processQueue(50);
    const messages = await db.mailOutbox.findMany({ where: { recipient: { in: [f.owner.email, f.dto.email] } } });
    expect(messages.filter(mail => mail.status === 'CANCELLED')).toHaveLength(2);
    expect(messages.filter(mail => mail.status === 'SENT')).toHaveLength(2);
    const sentTexts = smtp.send.mock.calls.map((call: any[]) => call[0].subject);
    expect(sentTexts).not.toContain('Новая онлайн-запись');
  });

  it('does not email a former salon owner after their access is revoked', async () => {
    const f = await fixture(); await salon.publicCreate(f.org.id, f.dto);
    await db.user.update({ where: { id: f.owner.id }, data: { isActive: false } });
    await notifications.processQueue(50);
    expect((await db.mailOutbox.findFirstOrThrow({ where: { recipient: f.owner.email } })).status).toBe('CANCELLED');
    expect((await db.mailOutbox.findFirstOrThrow({ where: { recipient: f.dto.email } })).status).toBe('SENT');
    expect(smtp.send.mock.calls.some((call: any[]) => call[0].recipient === f.owner.email)).toBe(false);
  });

  it('notifies the online client when the salon reschedules the appointment and cancels stale mail', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    await salon.update(f.org.id, booking.id, { version: 1, startTime: `${day}T10:00:00.000Z` }, { id: f.owner.id, label: 'Владелец' });
    await notifications.processQueue(50);
    const messages = await db.mailOutbox.findMany({ where: { recipient: f.dto.email } });
    expect(messages.filter(mail => mail.status === 'CANCELLED')).toHaveLength(1);
    expect(messages.filter(mail => mail.status === 'SENT')).toHaveLength(1);
    expect(smtp.send.mock.calls.map((call: any[]) => call[0].subject)).toEqual(['Салон изменил запись']);
    expect(smtp.send.mock.calls[0][0].text).toContain('10:00');
    expect(smtp.send.mock.calls[0][0].text).toContain('Мастер: Анна Мастер');
  });

  it('emails a salon cancellation once and does not notify clients who did not supply an email', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    await salon.update(f.org.id, booking.id, { version: 1, status: 'CANCELLED' });
    await salon.update(f.org.id, booking.id, { version: 2, status: 'CANCELLED' });
    await notifications.processQueue(50);
    expect(smtp.send.mock.calls.map((call: any[]) => call[0].subject)).toEqual(['Салон отменил запись']);
    expect(await db.mailOutbox.count({ where: { recipient: f.dto.email } })).toBe(2);

    const noEmail = await salon.publicCreate(f.org.id, { ...f.dto, requestKey: randomUUID(), email: undefined, phone: '79000000001', startTime: `${day}T11:00:00.000Z` });
    const countBefore = await db.mailOutbox.count();
    await salon.update(f.org.id, noEmail.id, { version: 1, status: 'CANCELLED' });
    expect(await db.mailOutbox.count()).toBe(countBefore);
  });

  it('rolls back salon changes when the client notification cannot be queued', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    const failing = new SalonBookingService(db as any, { prepare: () => { throw new Error('fixture-outbox-failure'); } } as any, config);
    await expect(failing.update(f.org.id, booking.id, { version: 1, status: 'CANCELLED' })).rejects.toThrow('fixture-outbox-failure');
    expect((await db.b2BBooking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('NEW');
    expect(await db.salonBookingEvent.count({ where: { bookingId: booking.id } })).toBe(1);
  });

  it('delivers the current salon change even if an internal note is edited before delivery', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    await salon.update(f.org.id, booking.id, { version: 1, startTime: `${day}T10:00:00.000Z` });
    await salon.update(f.org.id, booking.id, { version: 2, notes: 'Внутренняя заметка' });
    await notifications.processQueue(50);
    expect(smtp.send.mock.calls.map((call: any[]) => call[0].subject)).toEqual(['Салон изменил запись']);
    expect(smtp.send.mock.calls[0][0].text).not.toContain('Внутренняя заметка');
    expect((await db.mailOutbox.findFirstOrThrow({ where: { recipient: f.dto.email, status: 'SENT' } })).kind).toBe('SALON_BOOKING_CLIENT');
  });

  it('does not deliver older reschedule messages after another material change', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    await salon.update(f.org.id, booking.id, { version: 1, startTime: `${day}T10:00:00.000Z` });
    await salon.update(f.org.id, booking.id, { version: 2, status: 'CANCELLED' });
    await notifications.processQueue(50);
    expect(smtp.send.mock.calls.map((call: any[]) => call[0].subject)).toEqual(['Салон отменил запись']);
    expect(await db.mailOutbox.count({ where: { recipient: f.dto.email, status: 'CANCELLED' } })).toBe(2);
  });

  it('sends the latest confirmation when the salon confirms before a previous mail is delivered', async () => {
    const f = await fixture(), booking = await salon.publicCreate(f.org.id, f.dto);
    await salon.update(f.org.id, booking.id, { version: 1, startTime: `${day}T10:00:00.000Z` });
    await salon.update(f.org.id, booking.id, { version: 2, status: 'CONFIRMED' });
    await notifications.processQueue(50);
    expect(smtp.send.mock.calls.map((call: any[]) => call[0].subject)).toEqual(['Салон подтвердил запись']);
    expect(smtp.send.mock.calls[0][0].text).toContain('10:00');
  });
});
