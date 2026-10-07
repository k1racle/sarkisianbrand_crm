import { ValidationPipe } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { notificationView, notificationVisibility } from './staff-notifications.service';
import { NotificationPreferencesDto, NotificationQueryDto, NotificationReadAllDto } from './staff-notifications.dto';

const actor = { id: 'me', role: 'SUPERVISOR', isActive: true, departmentId: 'sales', accessProfileMode: true };
const departments = [{ id: 'sales', parentId: null, archivedAt: null }, { id: 'other', parentId: null, archivedAt: null }];
function policy(scope = 'OWN', denied: string[] = []) {
  return resolveProfileScopes(actor, ['crm.read','oms.read','helpdesk.read'].map(permissionKey => ({ permissionKey, profileId: 'test', profileName: 'Test', scope, departmentIds: scope === 'SELECTED_DEPARTMENTS' ? ['other'] : [] })), departments, denied);
}
// Evaluate access predicates against independent fixture relationships.
function matches(row: any, where: any): boolean {
  if (where === null || typeof where !== 'object') return row == where;
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'AND') return value.every(v => matches(row, v));
    if (key === 'OR') return value.some(v => matches(row, v));
    if (key === 'in') return value.includes(row);
    if (key === 'notIn') return !value.includes(row);
    if (key === 'not') return !matches(row, value);
    if (key === 'some') return (row || []).some(v => matches(v, value));
    if (key === 'none') return !(row || []).some(v => matches(v, value));
    if (key === 'isNot') return value === null ? row != null : !matches(row, value);
    if (row == null) return false;
    return matches(row[key], value);
  });
}
const task = { id: 't1', assignedToId: 'me', createdById: 'other', assignedTo: { departmentId: 'sales' } };
const event = (extra: any) => ({ actorId: 'other', recipientId: null, ...extra });
describe('notification audiences and privacy', () => {
  it('delivers assigned tasks, but hides reassigned tasks and self-created ones', () => {
    const where = notificationVisibility(actor, policy(), []), row = event({ kind: 'TASK_CREATED', recipientId: 'me', task });
    expect(matches(row, where)).toBe(true);
    expect(matches({ ...row, task: { ...task, assignedToId: 'other' } }, where)).toBe(false);
    expect(matches({ ...row, actorId: 'me' }, where)).toBe(false);
  });
  it('company task access does not broadcast every task comment to managers', () => {
    const where = notificationVisibility(actor, policy('COMPANY'), []);
    expect(matches(event({ kind: 'TASK_COMMENT', task }), where)).toBe(true);
    expect(matches(event({ kind: 'TASK_COMMENT', task: { ...task, assignedToId: 'someone', createdById: 'someone' } }), where)).toBe(false);
  });
  it.each(['OWN', 'SELECTED_DEPARTMENTS'])('orders obey %s scope', scope => {
    const where = notificationVisibility(actor, policy(scope), []);
    const order = { managerId: scope === 'OWN' ? 'me' : 'another', manager: { departmentId: 'other' } };
    expect(matches(event({ category: 'ORDER', order }), where)).toBe(true);
    expect(matches(event({ category: 'ORDER', order: { managerId: 'foreign', manager: { departmentId: 'sales' } } }), where)).toBe(false);
  });
  it('personal DENY removes task/order/ticket events even from company scope', () => {
    const where = notificationVisibility(actor, policy('COMPANY', ['crm.read','oms.read','helpdesk.read']), []);
    expect(matches(event({ kind: 'TASK_CREATED', task }), where)).toBe(false);
    expect(matches(event({ category: 'ORDER', order: { id: 'order' } }), where)).toBe(false);
    expect(matches(event({ kind: 'TICKET_CREATED', ticket: { id: 'ticket' } }), where)).toBe(false);
  });
  it('trash is inaccessible, and closed/dismissed reminders stop appearing', () => {
    const where = notificationVisibility(actor, policy(), [{ entityType: 'TASK', entityId: task.id }]);
    expect(matches(event({ kind: 'TASK_CREATED', task }), where)).toBe(false);
    const reminder = event({ kind: 'TASK_REMINDER', recipientId: 'me', reminder: { recipientId: 'me', dismissedAt: null, task: { ...task, status: 'TODO' } } });
    expect(matches(reminder, notificationVisibility(actor, policy(), []))).toBe(true);
    reminder.reminder.task.status = 'DONE'; expect(matches(reminder, notificationVisibility(actor, policy(), []))).toBe(false);
  });
  it('private chats require membership; mute, archive, deletion and own messages suppress events', () => {
    const where = notificationVisibility(actor, [], []);
    const row = event({ category: 'CHAT', message: { authorId: 'peer', deletedAt: null, channel: { isArchived: false, type: 'PRIVATE', createdById: 'peer', members: [{ userId: 'me', isMuted: false }] } } });
    expect(matches(row, where)).toBe(true);
    row.message.channel.members[0].isMuted = true; expect(matches(row, where)).toBe(false);
    row.message.channel.members = []; expect(matches(row, where)).toBe(false);
    row.message.channel.type = 'TEAM'; expect(matches(row, where)).toBe(true);
    row.message.channel.isArchived = true; expect(matches(row, where)).toBe(false);
    row.message.channel.isArchived = false; row.message.deletedAt = 'deleted'; expect(matches(row, where)).toBe(false);
  });
  it('contact inbox needs its existing role and company read permission', () => {
    const row = event({ kind: 'CONTACT_CREATED', contact: { id: 'contact' } });
    expect(matches(row, notificationVisibility(actor, policy(), []))).toBe(false);
    expect(matches(row, notificationVisibility(actor, policy('COMPANY'), []))).toBe(true);
    expect(matches(row, notificationVisibility({ ...actor, role: 'WAREHOUSE' }, policy('COMPANY'), []))).toBe(false);
  });
  it('a grant cannot bypass the source controller role boundary', () => {
    const where = notificationVisibility({ ...actor, role: 'CONTENT_MANAGER' }, policy('COMPANY'), []);
    expect(matches(event({ kind: 'TASK_CREATED', task }), where)).toBe(false);
    expect(matches(event({ category: 'ORDER', order: { id: 'order' } }), where)).toBe(false);
    expect(matches(event({ kind: 'TICKET_CREATED', ticket: { id: 'ticket' } }), where)).toBe(false);
  });
  it('returns only the allowed preview, not recipient IDs or finance/customer data', () => {
    const row = { id: 'event', category: 'ORDER', kind: 'ORDER_CREATED', occurredAt: new Date(), reads: [], order: { id: 'order', orderNumber: 'SB-1', source: 'B2B', buyerEmail: 'PRIVATE', totalAmount: 100 }, actorId: 'PRIVATE', recipientId: 'PRIVATE' };
    expect(notificationView(row)).toMatchObject({ body: 'SB-1 · B2B', url: '/crm/fulfillment?order=order', read: false });
    expect(JSON.stringify(notificationView(row))).not.toContain('PRIVATE');
  });
  it('direct chat title uses the sender, never the internal unique channel name', () => {
    const row = { id: 'event', kind: 'CHAT_MESSAGE', category: 'CHAT', occurredAt: new Date(), reads: [{ readAt: new Date() }], message: { channelId: 'channel', body: 'x'.repeat(500), channel: { directKey: 'INTERNAL', name: 'INTERNAL' }, author: { firstName: 'Анна', lastName: 'Волкова' } } };
    expect(notificationView(row)).toMatchObject({ title: 'Анна Волкова', channelId: 'channel', read: true });
    expect(notificationView(row).body.length).toBe(200);
    expect(JSON.stringify(notificationView(row))).not.toContain('INTERNAL');
  });
});
describe('notification request validation', () => {
 const pipe = new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true }, whitelist: true, forbidNonWhitelisted: true });
 it.each([{ category: 'UNKNOWN' }, { unread: '1' }, { cursor: 'x'.repeat(101) }, { userId: 'someone' }, { scope: 'COMPANY' }])('rejects invalid filters or caller scope %j', async value => {
   await expect(pipe.transform(value, { type: 'query', metatype: NotificationQueryDto })).rejects.toMatchObject({ status: 400 });
 });
 it.each([{ popupsEnabled: 'false' }, { popupsEnabled: true, userId: 'someone' }])('rejects unsafe preference changes %j', async value => {
   await expect(pipe.transform(value, { type: 'body', metatype: NotificationPreferencesDto })).rejects.toMatchObject({ status: 400 });
 });
 it('requires a server snapshot time for read-all', async () => {
   await expect(pipe.transform({}, { type: 'body', metatype: NotificationReadAllDto })).rejects.toMatchObject({ status: 400 });
 });
});
