import { CrmDriveService, driveMime, driveName } from './drive.service';
import { CrmDriveController } from './drive.controller';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), readFile: jest.fn(), unlink: jest.fn().mockResolvedValue(undefined), writeFile: jest.fn() }));

describe('Private CRM drive', () => {
  let db: any, service: CrmDriveService;
  beforeEach(() => {
    jest.clearAllMocks();
    db = { $executeRaw: jest.fn(), crmDriveNode: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { size: 0 } }), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() }, task: { findFirst: jest.fn().mockResolvedValue({ id: 'task' }) }, crmTaskFile: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() } };
    db.auditLog={create:jest.fn()};db.crmPublication={updateMany:jest.fn()};db.crmTaskFile.findUnique=jest.fn();
    db.$transaction = (fn: any) => fn(db);
    service = new CrmDriveService(db, { get: () => undefined } as any);
  });
  it('validates names and prevents paths/control characters', () => {
    for (const name of ['', '..', '../secrets', 'a\\b', 'bad\nname']) expect(() => driveName(name)).toThrow();
    expect(driveName('  Договор 2026.pdf  ')).toBe('Договор 2026.pdf');
  });
  it('never trusts uploaded MIME; blocks active types and fake image/pdf extensions', () => {
    for (const name of ['a.html','a.svg','a.exe','a.png','a.pdf']) expect(() => driveMime(name, Buffer.from('<script>'))).toThrow();
    expect(driveMime('safe.txt', Buffer.from('<script>'))).toBe('text/plain');
    expect(driveMime('report.docx', Buffer.from('bytes'))).toBe('application/octet-stream');
  });
  it('filters personal listing by the authenticated actor, with bounded pagination', async () => {
    await service.list({ scope: 'PERSONAL' }, 'alice');
    expect(db.crmDriveNode.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'alice', deletedAt: null }), take: 100 }));
    expect(db.crmDriveNode.findMany.mock.calls[0][0].select.storageKey).toBeUndefined();
  });
  it('denies unauthorized content without reading disk', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue(null);
    await expect(service.content('private', 'bob')).rejects.toThrow('недоступны');
    expect(db.crmDriveNode.findFirst.mock.calls[0][0].where.OR).toContainEqual({ scope: 'PERSONAL', ownerId: 'bob' });
    expect(readFile).not.toHaveBeenCalled();
  });
  it('does not allow storage traversal even with corrupted metadata', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue({ kind: 'FILE', storageKey: '../secret' });
    await expect(service.content('id', 'alice')).rejects.toThrow(); expect(readFile).not.toHaveBeenCalled();
  });
  it('rejects moving a folder into its descendant', async () => {
    db.crmDriveNode.findFirst.mockResolvedValueOnce({ id: 'a', kind: 'FOLDER', scope: 'TEAM' }).mockResolvedValueOnce({ id: 'b', kind: 'FOLDER', scope: 'TEAM', parentId: 'a' }).mockResolvedValueOnce({ id: 'a', kind: 'FOLDER', scope: 'TEAM' });
    await expect(service.update('a', { parentId: 'b' }, 'alice')).rejects.toThrow('подпапку'); expect(db.crmDriveNode.update).not.toHaveBeenCalled();
  });
  it('denies cross-scope destination folders', async () => {
    db.crmDriveNode.findFirst.mockResolvedValueOnce({ id: 'file', kind: 'FILE', scope: 'PERSONAL' }).mockResolvedValueOnce({ id: 'team', kind: 'FOLDER', scope: 'TEAM' });
    await expect(service.update('file', { parentId: 'team' }, 'alice')).rejects.toThrow('том же диске');
  });
  it('trash is recoverable and preserves bytes, recursively marks live children only', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue({ id: 'a', scope: 'TEAM' });
    db.crmDriveNode.findMany.mockResolvedValueOnce([{ id: 'b' }]).mockResolvedValueOnce([]);
    await service.trash('a', 'alice');
    expect(db.crmDriveNode.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['a','b'] } }, data: { deletedAt: expect.any(Date), trashBatch: 'a' } });
    expect(unlink).not.toHaveBeenCalled();
  });
  it('restores only the requested deletion batch', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue({ id: 'a', scope: 'TEAM', trashBatch: 'a', deletedAt: new Date(), parentId: null });
    await service.restore('a', 'alice');
    expect(db.crmDriveNode.updateMany.mock.calls[0][0].where).toEqual({ scope: 'TEAM', trashBatch: 'a' });
  });
  it('never publishes a personal attachment to the team implicitly', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue({ kind: 'FILE', scope: 'PERSONAL' });
    await expect(service.link('task','file','alice')).rejects.toThrow('командного диска'); expect(db.crmTaskFile.upsert).not.toHaveBeenCalled();
  });
  it('links team attachments idempotently', async () => {
    db.crmDriveNode.findFirst.mockResolvedValue({ kind: 'FILE', scope: 'TEAM' });
    await service.link('task','file','alice');
    expect(db.crmTaskFile.upsert.mock.calls[0][0].where).toEqual({ taskId_nodeId: { taskId: 'task', nodeId: 'file' } });
  });
  it('removes unattached bytes when quota/metadata transaction fails', async () => {
    db.crmDriveNode.aggregate.mockResolvedValue({ _sum: { size: 1024 ** 3 } });
    await expect(service.upload({ originalname:'test.txt', buffer:Buffer.from('test') }, { scope:'TEAM' }, 'alice')).rejects.toThrow('Лимит');
    expect(writeFile).toHaveBeenCalled(); expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[a-f0-9-]{36}$/));
  });
  it('gives an explicit collision instead of overwriting a file', async () => {
    db.crmDriveNode.create.mockRejectedValue({ code:'P2002' });
    await expect(service.createFolder({ name:'existing', scope:'TEAM' }, 'alice')).rejects.toThrow('уже есть');
  });
  it('content response is authenticated, uncacheable, nosniff and attachment-only', async () => {
    const controller = new CrmDriveController({ content: jest.fn().mockResolvedValue({ name:'Документ.pdf', mime:'application/pdf', buffer:Buffer.from('abc') }) } as any);
    const response = { setHeader: jest.fn(), send: jest.fn() };
    await controller.content('id',{ user:{ sub:'alice' } },response as any);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control','private, no-store');
    expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options','nosniff');
    expect(Reflect.getMetadata('__guards__', CrmDriveController)).toHaveLength(2);
  });
});
