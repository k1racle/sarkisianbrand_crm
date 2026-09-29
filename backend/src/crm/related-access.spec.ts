import { ForbiddenException } from '@nestjs/common';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { CrmDriveService } from './drive.service';
import { CrmDriveController } from './drive.controller';
import { CrmReadService } from './crm-read.service';
import { CrmContentController } from './content.controller';

const actor = { id: 'employee', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
const departments = [{ id: 'sales', parentId: null, archivedAt: null }, { id: 'branch', parentId: 'sales', archivedAt: null }, { id: 'other', parentId: null, archivedAt: null }];
const scopes = ['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS', 'COMPANY'];
function policy(scope = 'DEPARTMENT', permission = 'crm.read', writeScope = scope) {
  const keys = ['crm.read', 'crm.write', 'content_plan.read', 'content_plan.write'];
  return new CrmReadPolicy(actor.id, resolveProfileScopes(actor, keys.map(permissionKey => ({ profileId: 'fixture', profileName: 'Test only; not assigned', permissionKey,
    scope: permissionKey.endsWith('.write') ? writeScope : scope,
    departmentIds: (permissionKey.endsWith('.write') ? writeScope : scope) === 'SELECTED_DEPARTMENTS' ? ['other'] : [],
  })), departments), permission);
}
function fixture(scope = 'DEPARTMENT', writeScope = scope) {
  const access = { resolve: jest.fn(async (_db, id, permission = 'crm.read') => {
    if (id !== actor.id) throw new ForbiddenException();
    return policy(scope, permission, writeScope);
  }) };
  const file = { id: 'file', kind: 'FILE', scope: 'TEAM', name: 'Материал.pdf' };
  const relation = () => ({ findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), deleteMany: jest.fn() });
  const db: any = { $executeRaw: jest.fn(), task: { findFirst: jest.fn().mockResolvedValue({ id: 'task' }) }, lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead' }) },
    user: { findMany: jest.fn().mockResolvedValue([]) }, crmPublication: { findFirst: jest.fn().mockResolvedValue({ taskId: 'task' }), updateMany: jest.fn() },
    crmDriveNode: { findFirst: jest.fn().mockResolvedValue(file) }, crmTaskFile: relation(), crmLeadFile: relation(), auditLog: { create: jest.fn() } };
  db.$transaction = jest.fn(fn => fn(db));
  return { db, access, drive: new CrmDriveService(db, {} as any, access as any), reads: new CrmReadService(db, access as any), file };
}

describe('Scoped attachment parents, publication references and assignees', () => {
  it.each(scopes)('%s applies task and deal scope before fetching any attachment metadata', async scope => {
    const f = fixture(scope);
    await f.drive.taskFiles('task', actor.id); await f.drive.leadFiles('lead', actor.id);
    expect(f.db.task.findFirst.mock.calls[0][0].where).toEqual({ AND: [{ id: 'task', status: { not: 'CANCELLED' } }, policy(scope).tasks()] });
    expect(f.db.lead.findFirst.mock.calls[0][0].where).toEqual({ AND: [{ id: 'lead' }, policy(scope).leads()] });
    expect(f.db.crmTaskFile.findMany.mock.calls[0][0].where).toMatchObject({ taskId: 'task', node: { AND: expect.arrayContaining([{ deletedAt: null, scope: 'TEAM' }]) } });
    expect(JSON.stringify(f.db.crmTaskFile.findMany.mock.calls[0][0].where)).toContain('restrictions');
    expect(f.db.crmTaskFile.findMany.mock.calls[0][0].include.node.select.storageKey).toBeUndefined();
  });
  it.each(['task', 'lead'])('a forbidden %s ID cannot reveal names or mutate links/audit', async kind => {
    const f = fixture(); f.db[kind].findFirst.mockResolvedValue(null);
    const actions = kind === 'task'
      ? [() => f.drive.taskFiles('hidden', actor.id), () => f.drive.link('hidden', 'file', actor.id), () => f.drive.unlinkTask('hidden', 'file', actor.id)]
      : [() => f.drive.leadFiles('hidden', actor.id), () => f.drive.linkLead('hidden', 'file', actor.id), () => f.drive.unlinkLead('hidden', 'file', actor.id)];
    for (const action of actions) await expect(action()).rejects.toThrow('недоступна');
    for (const model of ['crmTaskFile', 'crmLeadFile']) for (const method of ['findMany', 'findUnique', 'upsert', 'deleteMany']) expect(f.db[model][method]).not.toHaveBeenCalled();
    expect(f.db.crmDriveNode.findFirst).not.toHaveBeenCalled(); expect(f.db.auditLog.create).not.toHaveBeenCalled();
  });
  it.each(['task', 'lead'])('company read scope cannot broaden OWN mutation of a %s attachment', async kind => {
    const f = fixture('COMPANY', 'OWN');
    if (kind === 'task') await f.drive.link('task', 'file', actor.id); else await f.drive.linkLead('lead', 'file', actor.id);
    const where = f.db[kind].findFirst.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({});
    expect(where.AND).toContainEqual({ OR: [{ [kind === 'task' ? 'assignedToId' : 'managerId']: actor.id }] });
    expect(f.access.resolve.mock.calls.map(call => call[2])).toEqual(['crm.read', 'crm.write', 'crm.read', 'crm.write']);
  });
  it('rejects a missing/forged actor before querying a parent or file', async () => {
    const f = fixture();
    await expect(f.drive.taskFiles('task', '')).rejects.toThrow();
    await expect(f.drive.unlinkLead('lead', 'file', 'other')).rejects.toThrow();
    expect(f.db.task.findFirst).not.toHaveBeenCalled(); expect(f.db.lead.findFirst).not.toHaveBeenCalled(); expect(f.db.crmTaskFile.findMany).not.toHaveBeenCalled();
  });
  it('rechecks the real effective DENY even after an outer route guard could have succeeded', async () => {
    const f = fixture();
    f.db.user.findUnique = jest.fn().mockResolvedValue(actor);
    f.db.rolePermission = { findMany: jest.fn().mockResolvedValue([{ permission: { key: 'crm.read' } }]) };
    f.db.userPermission = { findMany: jest.fn().mockResolvedValue([{ effect: 'DENY', permission: { key: 'crm.read' } }]) };
    await expect(new CrmDriveService(f.db, {} as any, new CrmReadAccess()).taskFiles('task', actor.id)).rejects.toThrow('Нет доступа');
    expect(f.db.task.findFirst).not.toHaveBeenCalled();
  });
  it('publication attachments require content read AND write and a publication-backed task', async () => {
    const f = fixture('DEPARTMENT', 'OWN');
    await f.drive.link('task', 'file', actor.id, 'content_plan.write');
    expect(f.access.resolve.mock.calls.map(call => call[2])).toEqual(['content_plan.read', 'content_plan.write', 'content_plan.read', 'content_plan.write']);
    expect(f.db.task.findFirst.mock.calls[0][0].where.AND).toContainEqual({ AND: [{ OR: [{ assignedToId: actor.id }] }, { publication: { isNot: null } }] });
  });
  it('does not enumerate or remove a legacy private attachment belonging to somebody else', async () => {
    const f = fixture(); f.db.crmTaskFile.findUnique.mockResolvedValue({ node: { name: 'Private' } }); f.db.crmDriveNode.findFirst.mockResolvedValue(null);
    await expect(f.drive.unlinkTask('task', 'private', actor.id)).rejects.toThrow('недоступны');
    expect(f.db.crmTaskFile.deleteMany).not.toHaveBeenCalled(); expect(f.db.auditLog.create).not.toHaveBeenCalled();
  });
  it('unlink is idempotent; a real unlink audits and invalidates SMM approval once', async () => {
    const f = fixture();
    await f.drive.unlinkTask('task', 'file', actor.id);
    expect(f.db.auditLog.create).not.toHaveBeenCalled();
    f.db.crmTaskFile.findUnique.mockResolvedValue({ node: f.file });
    await f.drive.unlinkTask('task', 'file', actor.id);
    expect(f.db.crmTaskFile.deleteMany).toHaveBeenCalledWith({ where: { taskId: 'task', nodeId: 'file' } });
    expect(f.db.auditLog.create).toHaveBeenCalledTimes(1); expect(f.db.crmPublication.updateMany).toHaveBeenCalledTimes(1);
  });
  it('authorizes a publication ID before resolving its internal task ID', async () => {
    const f = fixture();
    expect(await f.reads.publicationTask(actor.id, 'publication')).toBe('task');
    expect(f.db.crmPublication.findFirst.mock.calls[0][0]).toEqual({ where: { id: 'publication', task: policy('DEPARTMENT', 'content_plan.read').tasks() }, select: { taskId: true } });
    f.db.crmPublication.findFirst.mockResolvedValue(null);
    await expect(f.reads.publicationTask(actor.id, 'hidden')).rejects.toThrow('Публикация не найдена');
  });
  it('assignee options use intersection of read and write, never client department IDs', async () => {
    const f = fixture('COMPANY', 'DEPARTMENT'); await f.reads.team(actor.id);
    const where = f.db.user.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual(expect.objectContaining({ AND: expect.arrayContaining([{ OR: [{ departmentId: { in: ['sales'] } }] }]) }));
    expect(JSON.stringify(where)).toContain('isActive');
    expect(f.db.user.findMany.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });
  it('all attachment controllers pass the authenticated actor and the proper permission domain', async () => {
    const drive: any = { taskFiles: jest.fn(), leadFiles: jest.fn(), link: jest.fn(), unlinkTask: jest.fn() };
    const request = { user: { sub: actor.id } };
    const controller = new CrmDriveController(drive);
    controller.files('task', request); controller.leadFiles('lead', request);
    expect(drive.taskFiles).toHaveBeenCalledWith('task', actor.id); expect(drive.leadFiles).toHaveBeenCalledWith('lead', actor.id);
    const reads: any = { publicationTask: jest.fn().mockResolvedValue('smm-task') };
    const content = new CrmContentController({} as any, drive, {} as any, reads);
    await content.files('pub', request); await content.link('pub', { nodeId: 'file' }, request); await content.unlink('pub', 'file', request);
    expect(reads.publicationTask).toHaveBeenCalledWith(actor.id, 'pub');
    expect(drive.taskFiles).toHaveBeenCalledWith('smm-task', actor.id, 'content_plan.read');
    expect(drive.link).toHaveBeenCalledWith('smm-task', 'file', actor.id, 'content_plan.write');
    expect(drive.unlinkTask).toHaveBeenCalledWith('smm-task', 'file', actor.id, 'content_plan.write');
  });
});
