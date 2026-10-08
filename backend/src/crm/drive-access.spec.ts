import { ForbiddenException } from '@nestjs/common';
import { readFile, writeFile, unlink } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveProfileScopes } from '../auth/access-scope-policy';
import { CrmReadPolicy } from './read-access';
import { driveWhere } from './drive-access';
import { CrmDriveService } from './drive.service';
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), readFile: jest.fn(), writeFile: jest.fn(), unlink: jest.fn().mockResolvedValue(undefined) }));

const actor = { id: 'employee', role: 'MANAGER_SALES', isActive: true, departmentId: 'sales' };
const departments = [{ id: 'sales', parentId: null, archivedAt: null }, { id: 'branch', parentId: 'sales', archivedAt: null }, { id: 'other', parentId: null, archivedAt: null }];
function policy(scope = 'DEPARTMENT', key = 'crm.read', writeScope = scope, permissions = ['crm.read', 'crm.write', 'content_plan.read', 'content_plan.write']) {
  return new CrmReadPolicy(actor.id, resolveProfileScopes(actor, permissions.map(permissionKey => ({ profileId: 'fixture', profileName: 'Not assigned', permissionKey, scope: permissionKey.endsWith('.write') ? writeScope : scope, departmentIds: (permissionKey.endsWith('.write') ? writeScope : scope) === 'SELECTED_DEPARTMENTS' ? ['other'] : [] })), departments), key);
}
// Evaluate the actual generated where tree against fixtures; not a substitute for
// PostgreSQL/null/concurrency acceptance tests on the installed server.
function matches(value: any, where: any): boolean {
  if (where === null) return value == null;
  if (typeof where !== 'object') return value === where;
  const list = (x: any) => Array.isArray(x) ? x : [x];
  return Object.entries(where).every(([key, test]: [string, any]) => {
    if (key === 'AND') return list(test).every(t => matches(value, t));
    if (key === 'OR') return list(test).filter(t => Object.keys(t).length > 0).some(t => matches(value, t));
    if (key === 'NOT') return list(test).every(t => !matches(value, t));
    if (key === 'in') return test.includes(value);
    if (key === 'not') return !matches(value, test);
    if (key === 'is') return value != null && matches(value, test);
    if (key === 'isNot') return test === null ? value != null : !matches(value, test);
    if (key === 'some') return (value || []).some(t => matches(t, test));
    if (key === 'none') return !(value || []).some(t => matches(t, test));
    if (key === 'every') return (value || []).every(t => matches(t, test));
    if (key === 'contains') return String(value || '').toLowerCase().includes(test.toLowerCase());
    if (key === 'mode') return true;
    return matches(value?.[key], test);
  });
}
const task = (departmentId = 'sales', assignedToId = actor.id) => ({ id: 'task', assignedToId, assignedTo: { departmentId }, createdById: 'author', publication: { id: 'post' } });
const origin = (parent: any) => ({ originKind: 'TASK', task: parent, lead: null });
const file = (origins: any[] = [], patch: any = {}) => ({ id: 'file', kind: 'FILE', name: 'Brief.txt', scope: 'TEAM', ownerId: actor.id, size: 12, parentId: null, deletedAt: null, tasks: [], leads: [], restricted: origins.length > 0, restrictions: origins, storageKey: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ...patch });

describe('Durable drive policy (generated query semantics)', () => {
  it.each([['crm.read', 'crm.write'], ['crm.read', 'crm.write', 'content_plan.read', 'content_plan.write']])('company grants keep ordinary task attachments accessible: %j', (...permissions: string[]) => {
    const read = policy('COMPANY', 'crm.read', 'COMPANY', permissions);
    const write = policy('COMPANY', 'crm.write', 'COMPANY', permissions);
    const attached = file([origin({ ...task(), publication: null })]);
    expect(matches(attached, driveWhere(read, 'TEAM', write))).toBe(true);
    expect(matches(file([origin(null)]), driveWhere(read, 'TEAM', write))).toBe(false);
  });
  it.each(['OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS', 'COMPANY'])('%s protects public, private and multi-parent material', scope => {
    const predicate = driveWhere(policy(scope));
    expect(matches(file(), predicate)).toBe(true);
    expect(matches(file([], { scope: 'PERSONAL', ownerId: 'other' }), predicate)).toBe(false);
    expect(matches(file([], { scope: 'PERSONAL' }), predicate)).toBe(true);
    expect(matches(file([origin(task())]), predicate)).toBe(scope !== 'SELECTED_DEPARTMENTS');
    expect(matches(file([origin(task('sales')), origin(task('other', 'other'))]), predicate)).toBe(scope === 'COMPANY');
  });
  it.each(['OWN', 'DEPARTMENT', 'COMPANY'])('%s cannot revive access by deleting a link, moving, trashing or restoring', scope => {
    const protectedFile = file([origin(task('other', 'other'))]);
    const predicate = driveWhere(policy(scope), 'TEAM');
    const before = matches(protectedFile, predicate);
    for (const change of [{ tasks: [] }, { parentId: null }, { parentId: 'public' }, { deletedAt: new Date() }, { deletedAt: null, trashBatch: null }]) expect(matches({ ...protectedFile, ...change }, predicate)).toBe(before);
    expect(matches(file([origin(null)]), predicate)).toBe(false); // Deleted parent, even for company read.
    expect(matches(file([], { restricted: true }), predicate)).toBe(false); // Corrupted empty ACL.
  });
  it('legacy links without a backfilled origin fail closed, not common-library fallback', () => {
    expect(matches(file([], { tasks: [{ taskId: 'legacy' }] }), driveWhere(policy('COMPANY')))).toBe(false);
  });
  it('company read never broadens OWN mutation, even for the file uploader', () => {
    const read = policy('COMPANY', 'crm.read', 'OWN'), write = policy('COMPANY', 'crm.write', 'OWN');
    const foreign = file([origin(task('other', 'someone-else'))]);
    expect(matches(foreign, driveWhere(read))).toBe(true);
    expect(matches(foreign, driveWhere(read, 'TEAM', write))).toBe(false);
    expect(matches(file([], { ownerId: 'other' }), driveWhere(read, 'TEAM', write))).toBe(false);
    expect(matches(file([origin(task())]), driveWhere(read, 'TEAM', write))).toBe(true);
  });
  it('content-only access is limited to publication tasks and cannot traverse deal origins', () => {
    const read = policy('COMPANY', 'content_plan.read', 'COMPANY', ['content_plan.read']);
    expect(matches(file([origin(task())]), driveWhere(read, 'TEAM'))).toBe(true);
    expect(matches(file([origin({ ...task(), publication: null })]), driveWhere(read, 'TEAM'))).toBe(false);
    expect(matches(file([{ originKind: 'LEAD', task: null, lead: { id: 'lead', managerId: actor.id } }]), driveWhere(read, 'TEAM'))).toBe(false);
  });
  it('lead and task origins are an intersection, not two alternative grants', () => {
    const ownLead = { originKind: 'LEAD', lead: { id: 'lead', managerId: actor.id, manager: { departmentId: 'sales' } } };
    expect(matches(file([ownLead]), driveWhere(policy()))).toBe(true);
    expect(matches(file([ownLead, origin(task('other', 'other'))]), driveWhere(policy()))).toBe(false);
  });
  it('migration pins all link writers and keeps origins after detach/parent deletion', () => {
    const sql = readFileSync(join(__dirname, '../..', 'prisma/migrations/20260924210000_crm_drive_restrictions/migration.sql'), 'utf8');
    expect(sql).toMatch(/AFTER INSERT OR UPDATE OF "nodeId", "taskId"/);
    expect(sql).toMatch(/AFTER INSERT OR UPDATE OF "nodeId", "leadId"/);
    expect(sql).toMatch(/"taskId" TEXT REFERENCES "Task"\("id"\) ON DELETE SET NULL/);
    expect(sql).toMatch(/"leadId" TEXT REFERENCES "Lead"\("id"\) ON DELETE SET NULL/);
    expect(sql).toContain('FROM "CrmTaskFile"'); expect(sql).toContain('FROM "CrmLeadFile"');
    expect(sql).not.toMatch(/(?:BEFORE|AFTER) DELETE|DELETE FROM|DROP TABLE/);
  });
});

function fixture() {
  const rows = [file([], { id: 'library', name: 'Open brief', size: 10 }), file([origin(task())], { id: 'allowed', size: 20 }), file([origin(task('other', 'other'))], { id: 'secret', name: 'Secret brief', size: 999 })];
  const access: any = { resolve: jest.fn(async (_db, id, key = 'crm.read') => { if (id !== actor.id) throw new ForbiddenException(); return policy('DEPARTMENT', key); }) };
  const db: any = { $executeRaw: jest.fn(), task: { findFirst: jest.fn().mockResolvedValue({ id: 'task' }) }, lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead' }) },
    crmDriveNode: { findFirst: jest.fn(async ({ where }) => rows.find(row => matches(row, where)) || null), findMany: jest.fn(async ({ where }) => rows.filter(row => matches(row, where))), count: jest.fn(async ({ where }) => rows.filter(row => matches(row, where)).length), aggregate: jest.fn(async ({ where }) => ({ _sum: { size: rows.filter(row => matches(row, where)).reduce((sum, row) => sum + row.size, 0) } })), create: jest.fn().mockResolvedValue(file([origin(task())])), update: jest.fn(), updateMany: jest.fn() },
    crmTaskFile: { create: jest.fn(), upsert: jest.fn() }, crmLeadFile: { create: jest.fn() }, crmPublication: { updateMany: jest.fn() }, auditLog: { create: jest.fn() } };
  db.$transaction = jest.fn(fn => fn(db));
  return { rows, access, db, service: new CrmDriveService(db, { get: () => undefined } as any, access) };
}
describe('Drive operations use the same boundary', () => {
  beforeEach(() => { jest.clearAllMocks(); (readFile as jest.Mock).mockResolvedValue(Buffer.from('fixture')); });
  it.each([{ scope: 'TEAM' }, { scope: 'TEAM', search: 'brief' }, { scope: 'TEAM', view: 'recent' }, { scope: 'TEAM', view: 'trash' }])('filters rows, totals and visible bytes for %j', async query => {
    const f = fixture();
    if (query.view === 'trash') f.rows.forEach(row => { row.deletedAt = new Date(); });
    const result = await f.service.list(query, actor.id);
    expect(result.items.map(row => row.id)).not.toContain('secret');
    expect(result.total).toBe(result.items.length); expect(result.used).toBe(30);
    expect(f.db.crmDriveNode.findMany.mock.calls[0][0].where).toEqual(f.db.crmDriveNode.count.mock.calls[0][0].where);
    expect(result.usageScope).toBe('visible');
  });
  it('denies a direct protected content ID before reading any bytes', async () => {
    const f = fixture(); await expect(f.service.content('secret', actor.id)).rejects.toThrow('недоступны');
    expect(readFile).not.toHaveBeenCalled();
  });
  it('rechecks file permission after an asynchronous disk read', async () => {
    const f = fixture();
    (readFile as jest.Mock).mockImplementation(async () => { f.rows[1].restrictions = [origin(task('other', 'other'))]; return Buffer.from('already read'); });
    await expect(f.service.content('allowed', actor.id)).rejects.toThrow('недоступны');
    expect(readFile).toHaveBeenCalledTimes(1);
  });
  it('rechecks effective grants before any disk write, including direct service calls', async () => {
    const f = fixture(); f.access.resolve.mockRejectedValue(new ForbiddenException());
    await expect(f.service.upload({ originalname: 'x.txt', buffer: Buffer.from('x') }, { scope: 'TEAM' }, actor.id)).rejects.toThrow();
    expect(writeFile).not.toHaveBeenCalled(); expect(f.db.crmDriveNode.create).not.toHaveBeenCalled();
  });
  it.each(['task', 'lead'] as const)('uploads a %s attachment as restricted inside one metadata transaction', async kind => {
    const f = fixture(); await f.service.uploadAttachment(kind, kind, { originalname: 'x.txt', buffer: Buffer.from('x') }, actor.id);
    expect(f.db.crmDriveNode.create.mock.calls[0][0].data).toMatchObject({ scope: 'TEAM', restricted: true, ownerId: actor.id });
    expect(f.db[kind === 'task' ? 'crmTaskFile' : 'crmLeadFile'].create).toHaveBeenCalledTimes(1);
    expect(f.db.$transaction).toHaveBeenCalledTimes(2); // preflight + atomic write
  });
  it('a failed card upload cleans up its new private bytes and never falls back to a public upload', async () => {
    const f = fixture(); f.db.crmTaskFile.create.mockRejectedValue(new Error('link failed'));
    await expect(f.service.uploadAttachment('task', 'task', { originalname: 'x.txt', buffer: Buffer.from('x') }, actor.id)).rejects.toThrow('link failed');
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(f.db.crmDriveNode.create.mock.calls[0][0].data.restricted).toBe(true);
    expect(f.db.auditLog.create).not.toHaveBeenCalled();
  });
  it.each(['trash', 'rename', 'move', 'restore'])('a folder %s cannot affect a hidden descendant', async operation => {
    const f = fixture(); const folder = file([], { id: 'folder', kind: 'FOLDER' });
    f.rows.push(folder); f.rows[2].parentId = 'folder';
    if (operation === 'restore') { Object.assign(folder, { deletedAt: new Date(), trashBatch: 'folder' }); Object.assign(f.rows[2], { deletedAt: new Date(), trashBatch: 'folder' }); }
    const action = operation === 'trash' ? f.service.trash('folder', actor.id) : operation === 'restore' ? f.service.restore('folder', actor.id) : f.service.update('folder', operation === 'rename' ? { name: 'new' } : { parentId: null }, actor.id);
    await expect(action).rejects.toThrow('содержимое папки');
    expect(f.db.crmDriveNode.update).not.toHaveBeenCalled(); expect(f.db.crmDriveNode.updateMany).not.toHaveBeenCalled();
  });
  it('moving an allowed file never updates restricted/origins', async () => {
    const f = fixture(); await f.service.update('allowed', { parentId: null }, actor.id);
    expect(f.db.crmDriveNode.update.mock.calls[0][0].data).toEqual({ name: undefined, parentId: null });
  });
});
