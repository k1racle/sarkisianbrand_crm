import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';

describe('Employee permission updates (isolated)', () => {
  function fixture() {
    const db = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'employee', role: 'ADMIN' }) },
      permission: { findMany: jest.fn().mockResolvedValue([{ key: 'crm.read', id: 'read' }, { key: 'crm.write', id: 'write' }]) },
      userPermission: { deleteMany: jest.fn(), createMany: jest.fn() },
      session: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    db.$transaction.mockImplementation(async fn => fn(db));
    return { db, service: new SystemSettingsService(db as any, {} as any, {} as any, {} as any) };
  }

  it('rejects conflicting ALLOW/DENY before any read, write or session revocation', async () => {
    const { db, service } = fixture();
    await expect(service.updatePermissions('employee', { allow: ['crm.write'], deny: ['crm.write'] })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.session.deleteMany).not.toHaveBeenCalled();
  });

  it('deduplicates entries and preserves explicit denials, then revokes sessions', async () => {
    const { db, service } = fixture();
    await expect(service.updatePermissions('employee', { allow: ['crm.read', 'crm.read'], deny: ['crm.write', 'crm.write'] })).resolves.toEqual({ id: 'employee', overrides: 2 });
    expect(db.userPermission.createMany).toHaveBeenCalledWith({ data: [
      { userId: 'employee', permissionId: 'read', effect: 'ALLOW' },
      { userId: 'employee', permissionId: 'write', effect: 'DENY' },
    ] });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'employee' } });
  });

  it('keeps existing permissions and sessions when an unknown key is requested', async () => {
    const { db, service } = fixture();
    db.permission.findMany.mockResolvedValueOnce([]);
    await expect(service.updatePermissions('employee', { allow: ['unknown'], deny: [] })).rejects.toBeInstanceOf(NotFoundException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('can clear overrides atomically without an empty insert', async () => {
    const { db, service } = fixture();
    db.permission.findMany.mockResolvedValueOnce([]);
    await expect(service.updatePermissions('employee', { allow: [], deny: [] })).resolves.toEqual({ id: 'employee', overrides: 0 });
    expect(db.userPermission.deleteMany).toHaveBeenCalledWith({ where: { userId: 'employee' } });
    expect(db.userPermission.createMany).not.toHaveBeenCalled();
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1);
  });
});
