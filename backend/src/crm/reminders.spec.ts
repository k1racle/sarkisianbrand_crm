import { ForbiddenException } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from './read-access';
import { CrmRemindersService } from './reminders.service';
import { CrmReminderScheduler } from './crm-reminder.scheduler';

const actor = { id: 'employee', role: 'MANAGER_SALES', departmentId: 'sales', isActive: true };
function fixture(readScope = 'DEPARTMENT', writeScope = 'OWN') {
  const decisions = resolveProfileScopes(actor, [
    { profileId: 'test', profileName: 'Test', permissionKey: 'crm.read', scope: readScope, departmentIds: [] },
    { profileId: 'test', profileName: 'Test', permissionKey: 'crm.write', scope: writeScope, departmentIds: [] },
  ], [{ id: 'sales', parentId: null, archivedAt: null }]);
  const access = { resolve: jest.fn(async (_db, _id, permission = 'crm.read') => new CrmReadPolicy(actor.id, decisions, permission)) };
  const reminder = { id: 'reminder', task: { id: 'task', title: 'Visible task', dueDate: null, priority: 'MEDIUM' } };
  const db: any = { $executeRaw: jest.fn(), crmTaskReminder: { findFirst: jest.fn().mockResolvedValue(reminder), findMany: jest.fn().mockResolvedValue([reminder]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
  db.$transaction = jest.fn(fn => fn(db));
  const service = new CrmRemindersService(db, access as any);
  return { db, access, service, reminder };
}

describe('Reminder visibility and delivery', () => {
  it.each(['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'COMPANY'])('%s filters polling by recipient AND task scope; reading has no side effects', async scope => {
    const f = fixture(scope); await f.service.list(actor.id);
    const args = f.db.crmTaskReminder.findMany.mock.calls[0][0];
    const read = await f.access.resolve(f.db, actor.id);
    expect(args.where).toMatchObject({ recipientId: actor.id, dismissedAt: null, remindAt: { lte: expect.any(Date) }, task: { AND: [read.tasks(), { status: { notIn: ['DONE', 'CANCELLED'] } }] } });
    expect(args.select.task.select).toEqual({ id: true, title: true, dueDate: true, priority: true });
    expect(args.take).toBe(50); expect(args.include).toBeUndefined();
    expect(f.db.crmTaskReminder.updateMany).not.toHaveBeenCalled();
  });
  it('returns no payload after task access is revoked', async () => {
    const f = fixture(); f.db.crmTaskReminder.findFirst.mockResolvedValue(null);
    expect(await f.service.visible(actor.id, 'hidden')).toBeNull();
    expect(f.db.crmTaskReminder.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'hidden', recipientId: actor.id, dismissedAt: null });
    f.access.resolve.mockRejectedValue(new ForbiddenException());
    expect(await f.service.visible(actor.id, 'hidden')).toBeNull();
    expect(f.db.crmTaskReminder.updateMany).not.toHaveBeenCalled();
  });
  it('does not disguise a database outage as revoked access', async () => {
    const f = fixture(); f.access.resolve.mockRejectedValue(new Error('Database unavailable'));
    await expect(f.service.visible(actor.id, 'id')).rejects.toThrow('Database unavailable');
    await expect(f.service.claim(actor.id, 'id')).rejects.toThrow('Database unavailable');
    expect(f.db.crmTaskReminder.updateMany).not.toHaveBeenCalled();
  });
  it('claims an authorized due reminder once, rechecks access and emits no payload from the claim', async () => {
    const f = fixture();
    expect(await f.service.claim(actor.id, 'reminder')).toBe(true);
    expect(f.db.crmTaskReminder.findFirst.mock.calls[0][0].select).toEqual({ id: true });
    expect(f.db.crmTaskReminder.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'reminder', recipientId: actor.id, deliveredAt: null, dismissedAt: null, remindAt: { lte: expect.any(Date) } }, data: { deliveredAt: expect.any(Date) } });
    f.db.crmTaskReminder.updateMany.mockResolvedValue({ count: 0 });
    expect(await f.service.claim(actor.id, 'reminder')).toBe(false);
  });
  it.each(['forbidden', 'outside-scope'])('suppresses a %s reminder so obsolete rows do not starve delivery', async kind => {
    const f = fixture();
    if (kind === 'forbidden') f.access.resolve.mockRejectedValue(new ForbiddenException()); else f.db.crmTaskReminder.findFirst.mockResolvedValue(null);
    expect(await f.service.claim(actor.id, 'reminder')).toBe(false);
    expect(f.db.crmTaskReminder.updateMany.mock.calls[0][0].data).toEqual({ dismissedAt: expect.any(Date) });
  });
  it('dismiss cannot target another recipient or a task outside read AND write scope', async () => {
    const f = fixture('COMPANY', 'OWN'); f.db.crmTaskReminder.findFirst.mockResolvedValue(null);
    await expect(f.service.dismiss(actor.id, 'hidden')).rejects.toThrow('недоступно');
    expect(f.db.crmTaskReminder.findFirst.mock.calls[0][0].where).toEqual({ id: 'hidden', recipientId: actor.id, task: { AND: [{}, { OR: [{ assignedToId: actor.id }] }] } });
    expect(f.db.crmTaskReminder.updateMany).not.toHaveBeenCalled();
  });
  it('dismiss is a private idempotent update and never modifies the task itself', async () => {
    const f = fixture();
    expect(await f.service.dismiss(actor.id, 'reminder')).toEqual({ success: true });
    expect(f.db.crmTaskReminder.updateMany.mock.calls[0][0].where).toEqual({ id: 'reminder', recipientId: actor.id, dismissedAt: null });
    f.db.crmTaskReminder.updateMany.mockResolvedValue({ count: 0 });
    expect(await f.service.dismiss(actor.id, 'reminder')).toEqual({ success: true });
  });
  it('scheduler selects no business payload before authorization and reloads at socket send', async () => {
    const f = fixture(); f.db.crmTaskReminder.findMany.mockResolvedValue([{ id: 'denied', recipientId: actor.id }, { id: 'allowed', recipientId: actor.id }]);
    const service = { claim: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true), visible: jest.fn().mockResolvedValue(null) };
    const realtime = { publishReminder: jest.fn() };
    const scheduler = new CrmReminderScheduler(f.db, realtime as any, service as any);
    await (scheduler as any).deliver();
    expect(f.db.crmTaskReminder.findMany.mock.calls[0][0].select).toEqual({ id: true, recipientId: true });
    expect(realtime.publishReminder).toHaveBeenCalledTimes(1);
    expect(service.visible).not.toHaveBeenCalled(); // Deferred until the socket session is checked.
    expect(await realtime.publishReminder.mock.calls[0][1]()).toBeNull();
    expect(service.visible).toHaveBeenCalledWith(actor.id, 'allowed');
    expect(f.db.crmTaskReminder.updateMany).not.toHaveBeenCalled();
  });
  it('scheduler does not overlap slow delivery cycles', async () => {
    const f = fixture(); let release!: (value: any[]) => void;
    f.db.crmTaskReminder.findMany.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const scheduler = new CrmReminderScheduler(f.db, {} as any, {} as any);
    const first = (scheduler as any).deliver(); await (scheduler as any).deliver();
    expect(f.db.crmTaskReminder.findMany).toHaveBeenCalledTimes(1);
    release([]); await first;
    const next = (scheduler as any).deliver(); expect(f.db.crmTaskReminder.findMany).toHaveBeenCalledTimes(2); release([]); await next;
  });
});
