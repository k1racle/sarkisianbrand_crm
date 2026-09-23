import { DepartmentsService } from './departments.service';
import { DepartmentListDto } from './dto/department.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('Department lifecycle and session invalidation (isolated)', () => {
  function fixture() {
    const previous = { id: 'dept', name: 'Продажи', parentId: null, archivedAt: null, version: 1, members: [{ id: 'old' }] };
    const tx: any = {
      $executeRaw: jest.fn(),
      crmDepartment: { findUnique: jest.fn().mockResolvedValue(previous), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'dept', version: 2 }), create: jest.fn().mockResolvedValue({ id: 'dept', version: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'dept', version: 2 }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'new', isActive: true, departmentId: null }]), updateMany: jest.fn() },
      session: { deleteMany: jest.fn() }, auditLog: { create: jest.fn() },
    };
    const db: any = { ...tx, $transaction: jest.fn((fn: any) => fn(tx)) };
    return { tx, db, previous, service: new DepartmentsService(db) };
  }
  it('revokes exactly the removed and newly added members in the same transaction', async () => {
    const { tx, service } = fixture();
    await service.save({ name: 'Продажи', memberIds: ['new'], version: 1 }, 'actor', 'dept');
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ['old', 'new'] } } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ payload: expect.objectContaining({ sessionsRevokedFor: ['old', 'new'] }) }) });
  });
  it('does not end sessions for a rename with unchanged membership', async () => {
    const { tx, service } = fixture(); tx.user.findMany.mockResolvedValue([{ id: 'old', isActive: true, departmentId: 'dept' }]);
    await service.save({ name: 'Новое название', memberIds: ['old'], version: 1 }, 'actor', 'dept');
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
  it('invalidates descendant memberships when a department changes parent', async () => {
    const { tx, service } = fixture();
    tx.crmDepartment.findMany.mockResolvedValue([{ id: 'parent', parentId: null }, { id: 'dept', parentId: null }, { id: 'child', parentId: 'dept' }]);
    tx.user.findMany.mockResolvedValueOnce([{ id: 'old', isActive: true, departmentId: 'dept' }]).mockResolvedValueOnce([{ id: 'old' }, { id: 'child-member' }]);
    await service.save({ name: 'Продажи', parentId: 'parent', memberIds: ['old'], version: 1 }, 'actor', 'dept');
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ['old', 'child-member'] } } });
  });
  it('rejects stale versions without invalidating any sessions', async () => {
    const { tx, service } = fixture();
    await expect(service.save({ name: 'Продажи', memberIds: [], version: 2 }, 'actor', 'dept')).rejects.toThrow('уже изменён');
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
  it('restores an archived empty department without silently assigning users', async () => {
    const { tx, previous, service } = fixture(); tx.crmDepartment.findUnique.mockResolvedValue({ ...previous, archivedAt: new Date(), members: [] });
    await service.restore('dept', 1, 'actor');
    expect(tx.crmDepartment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'dept' }, data: { archivedAt: null, version: { increment: 1 } } }));
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'RESTORE', actorId: 'actor' }) });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
  it('requires the parent to be active before restoration', async () => {
    const { tx, previous, service } = fixture(); tx.crmDepartment.findUnique.mockResolvedValue({ ...previous, archivedAt: new Date(), parentId: 'archived-parent' });
    await expect(service.restore('dept', 1, 'actor')).rejects.toThrow('родительский отдел');
    expect(tx.crmDepartment.update).not.toHaveBeenCalled();
  });
  it('separates active/archive queries and rejects unknown filters', async () => {
    const { tx, service } = fixture();
    await service.list(true); expect(tx.crmDepartment.findMany.mock.calls[0][0].where).toEqual({ archivedAt: { not: null } });
    await service.list(); expect(tx.crmDepartment.findMany.mock.calls[1][0].where).toEqual({ archivedAt: null });
    expect((await validate(plainToInstance(DepartmentListDto, { status: 'anything' }))).length).toBeGreaterThan(0);
  });
});
