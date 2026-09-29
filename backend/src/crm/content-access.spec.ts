import { ForbiddenException } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from './read-access';
import { CrmContentService } from './content.service';
import { CrmContentController } from './content.controller';

function fixture(scope = 'DEPARTMENT', writeScope = 'OWN') {
  const actor = { id: 'smm', role: 'CONTENT_MANAGER', departmentId: 'marketing', isActive: true };
  const decisions = resolveProfileScopes(actor, ['content_plan.read', 'content_plan.write', 'content_plan.approve'].map(permissionKey => ({ profileId: 'fixture', profileName: 'Not assigned', permissionKey, scope: permissionKey.endsWith('.read') ? scope : writeScope, departmentIds: (permissionKey.endsWith('.read') ? scope : writeScope) === 'SELECTED_DEPARTMENTS' ? ['marketing'] : [] })), [{ id: 'marketing', parentId: null, archivedAt: null }]);
  const access: any = { resolve: jest.fn(async (_db, id, permission = 'crm.read') => { if (id !== actor.id) throw new ForbiddenException(); return new CrmReadPolicy(id, decisions, permission); }) };
  const row = { id: 'source', taskId: 'task', task: { title: 'Material', assignedToId: actor.id }, ideaId: 'idea', version: 1, status: 'REVIEW', scheduledAt: null, archivedAt: null };
  const db: any = { $executeRaw: jest.fn(), user: { findFirst: jest.fn().mockResolvedValue({ id: actor.id }), findMany: jest.fn().mockResolvedValue([]) },
    task: { create: jest.fn().mockResolvedValue({ id: 'new-task' }), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    crmPublication: { findFirst: jest.fn(async ({ where }) => where.id === 'new' ? { ...row, id: 'new', taskId: 'new-task' } : row), findMany: jest.fn().mockResolvedValue([row]), count: jest.fn().mockResolvedValue(1), create: jest.fn().mockResolvedValue({ ...row, id: 'new', taskId: 'new-task' }), update: jest.fn().mockResolvedValue(row) },
    crmTaskFile: { findMany: jest.fn().mockResolvedValue([{ nodeId: 'protected' }]), createMany: jest.fn() }, crmDriveNode: { count: jest.fn().mockResolvedValue(1) },
    crmTaskReminder: { deleteMany: jest.fn(), upsert: jest.fn() }, crmTaskComment: { create: jest.fn() },
  };
  db.$transaction = jest.fn(fn => fn(db));
  return { actor, access, db, row, service: new CrmContentService(db, access) };
}
describe('Content-plan read/write and material boundaries', () => {
  it.each(['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS', 'COMPANY'])('%s is used for lists, totals, direct cards and nested counts', async scope => {
    const f = fixture(scope);
    await f.service.list({ search: 'material' }, f.actor.id);
    await f.service.get('source', f.actor.id);
    const args = f.db.crmPublication.findMany.mock.calls[0][0];
    expect(args.where).toEqual(f.db.crmPublication.count.mock.calls[0][0].where);
    const read = await f.access.resolve(f.db, f.actor.id, 'content_plan.read');
    expect(args.where.task.AND).toContainEqual(read.tasks());
    expect(f.db.crmPublication.findFirst.mock.calls[0][0].where.task.AND).toEqual([read.tasks()]);
    const fields = args.include.task.select;
    expect(fields.leadId).toBeUndefined(); expect(fields.customerId).toBeUndefined(); expect(fields.orderId).toBeUndefined();
    expect(JSON.stringify(fields._count.select.files)).toContain('restrictions');
    expect(fields._count.select.children.where).toEqual(read.tasks());
  });
  it.each(['get', 'update', 'approve', 'archive', 'restore', 'clone'])('a hidden publication cannot be accessed via %s', async operation => {
    const f = fixture(); f.db.crmPublication.findFirst.mockResolvedValue(null);
    const actions = {
      get: () => f.service.get('hidden', f.actor.id), update: () => f.service.update('hidden', { version: 1, title: 'new' } as any, f.actor.id),
      approve: () => f.service.approve('hidden', 1, f.actor.id), archive: () => f.service.archive('hidden', 1, false, f.actor.id), restore: () => f.service.archive('hidden', 1, true, f.actor.id),
      clone: () => f.service.create({ title: 'Variant', sourceId: 'hidden', platform: 'VK', format: 'VIDEO' } as any, f.actor.id),
    };
    await expect(actions[operation]()).rejects.toThrow('недоступна');
    for (const method of [f.db.task.create, f.db.task.update, f.db.crmPublication.create, f.db.crmPublication.update, f.db.crmTaskFile.createMany, f.db.crmTaskComment.create, f.db.crmTaskReminder.deleteMany]) expect(method).not.toHaveBeenCalled();
  });
  it.each(['update', 'approve', 'archive'])('%s requires independent read and operation scopes', async operation => {
    const f = fixture('COMPANY', 'OWN');
    if (operation === 'update') await f.service.update('source', { version: 1, title: 'New' } as any, f.actor.id);
    else if (operation === 'approve') await f.service.approve('source', 1, f.actor.id);
    else await f.service.archive('source', 1, false, f.actor.id);
    const scope = f.db.crmPublication.findFirst.mock.calls[0][0].where.task.AND;
    expect(scope).toContainEqual({ AND: [{}, { publication: { isNot: null } }] });
    expect(scope).toContainEqual({ AND: [{ OR: [{ assignedToId: 'smm' }] }, { publication: { isNot: null } }] });
    expect(f.access.resolve.mock.calls[1][2]).toBe(operation === 'approve' ? 'content_plan.approve' : 'content_plan.write');
  });
  it('a hidden material blocks cloning before creating any new record', async () => {
    const f = fixture(); f.db.crmDriveNode.count.mockResolvedValue(0);
    await expect(f.service.create({ title: 'Variant', sourceId: 'source', platform: 'VK', format: 'VIDEO' } as any, f.actor.id)).rejects.toThrow('Материалы');
    expect(JSON.stringify(f.db.crmDriveNode.count.mock.calls[0][0].where)).toContain('restrictions');
    expect(f.db.task.create).not.toHaveBeenCalled(); expect(f.db.crmTaskFile.createMany).not.toHaveBeenCalled();
  });
  it('copies only checked links; the DB trigger pins each new material origin in the same transaction', async () => {
    const f = fixture(); await f.service.create({ title: 'Variant', sourceId: 'source', platform: 'VK', format: 'VIDEO' } as any, f.actor.id);
    expect(f.db.crmTaskFile.createMany).toHaveBeenCalledWith({ data: [{ taskId: 'new-task', nodeId: 'protected' }] });
    expect(f.db.$transaction).toHaveBeenCalledTimes(1);
    expect(f.db.crmPublication.findFirst.mock.calls.at(-1)[0].where.id).toBe('new');
  });
  it('validates the assignee in both scopes before creating or transferring a publication', async () => {
    const f = fixture('COMPANY', 'OWN'); f.db.user.findFirst.mockResolvedValue(null);
    await expect(f.service.create({ title: 'New', assignedToId: 'other', platform: 'VK', format: 'VIDEO' } as any, f.actor.id)).rejects.toThrow('доступного');
    expect(JSON.stringify(f.db.user.findFirst.mock.calls[0][0].where)).toContain('"id":"smm"');
    expect(f.db.task.create).not.toHaveBeenCalled();
    await expect(f.service.update('source', { version: 1, assignedToId: 'other' } as any, f.actor.id)).rejects.toThrow('доступного');
    expect(f.db.task.update).not.toHaveBeenCalled();
  });
  it('a service-level permission denial cannot be bypassed through a stale route guard', async () => {
    const f = fixture(); f.access.resolve.mockRejectedValue(new ForbiddenException());
    await expect(f.service.list({}, f.actor.id)).rejects.toThrow();
    await expect(f.service.update('source', { version: 1 } as any, f.actor.id)).rejects.toThrow();
    expect(f.db.crmPublication.findMany).not.toHaveBeenCalled(); expect(f.db.crmPublication.findFirst).not.toHaveBeenCalled();
  });
  it('controllers carry the authenticated identity and keep SMM drive in its own domain', async () => {
    const f = fixture(), req = { user: { sub: f.actor.id } };
    const service: any = { list: jest.fn(), team: jest.fn(), get: jest.fn(), archive: jest.fn() };
    const drive: any = { list: jest.fn(), upload: jest.fn(), content: jest.fn().mockResolvedValue({ name: 'f', buffer: Buffer.alloc(0) }), uploadAttachment: jest.fn() };
    const controller = new CrmContentController(service, drive, {} as any, { publicationTask: jest.fn().mockResolvedValue('task') } as any);
    controller.list({}, req); controller.team(req); controller.get('post', req); controller.archive('post', { version: 1 }, req);
    controller.disk({ scope: 'PERSONAL' }, req); controller.upload({}, { scope: 'PERSONAL' }, req);
    await controller.bytes('file', req, { set: jest.fn(), send: jest.fn() } as any);
    await controller.uploadFile('post', {}, req);
    expect(service.get).toHaveBeenCalledWith('post', f.actor.id); expect(service.archive).toHaveBeenCalledWith('post', 1, false, f.actor.id);
    expect(drive.list).toHaveBeenCalledWith({ scope: 'TEAM', view: 'files' }, f.actor.id, 'content_plan.read');
    expect(drive.upload).toHaveBeenCalledWith({}, { scope: 'TEAM' }, f.actor.id, 'content_plan.write');
    expect(drive.content).toHaveBeenCalledWith('file', f.actor.id, 'content_plan.read');
    expect(drive.uploadAttachment).toHaveBeenCalledWith('task', 'task', {}, f.actor.id, 'content_plan.write');
  });
});
