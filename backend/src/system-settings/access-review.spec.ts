import { SystemSettingsService } from './system-settings.service';
import { workspaceRoleCatalog } from '../auth/workspace-role-catalog';

describe('Saved employee access review', () => {
  function fixture() {
    const db: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'staff', role: 'MANAGER_SALES', isActive: true, department: { id: 'dept', name: 'Продажи' } }) },
      permission: { findMany: jest.fn().mockResolvedValue([
        { key: 'crm.read', resource: 'crm', action: 'read', roles: [{}], users: [] },
        { key: 'crm.write', resource: 'crm', action: 'write', roles: [{}], users: [{ effect: 'DENY' }] },
        { key: 'media.read', resource: 'media', action: 'read', roles: [], users: [{ effect: 'ALLOW' }] },
        { key: 'system.manage', resource: 'system', action: 'manage', roles: [], users: [] },
      ]) },
      $transaction: jest.fn(),
    };
    db.$transaction.mockImplementation((fn: any) => fn(db));
    return { db, service: new SystemSettingsService(db, {} as any, {} as any, {} as any) };
  }
  it('explains role, personal allow/deny and absent grants in a consistent snapshot', async () => {
    const { db, service } = fixture();
    const review = await service.accessReview('staff');
    expect(review.role?.label).toBe('Специалист интернет-магазина');
    expect(review.permissions.map(item => [item.key, item.allowed, item.source])).toEqual([
      ['crm.read', true, 'ROLE'], ['crm.write', false, 'DENY'], ['media.read', true, 'ALLOW'], ['system.manage', false, 'NOT_GRANTED'],
    ]);
    expect(review.dataVisibility.departmentEnforced).toBe(false);
    expect(db.permission.findMany.mock.calls[0][0].include.users.where).toEqual({ userId: 'staff' });
    expect(db.permission.findMany.mock.calls[0][0].include.roles.where).toEqual({ role: 'MANAGER_SALES' });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  });
  it('shows blocked accounts without effective allowed actions', async () => {
    const { db, service } = fixture();
    db.user.findUnique.mockResolvedValue({ id: 'staff', role: 'ADMIN', isActive: false });
    const review = await service.accessReview('staff');
    expect(review.permissions.every(item => !item.allowed && item.source === 'BLOCKED_ACCOUNT')).toBe(true);
  });
  it.each([null, { id: 'client', role: 'CUSTOMER_B2B' }])('rejects missing and customer accounts', async record => {
    const { db, service } = fixture(); db.user.findUnique.mockResolvedValue(record);
    await expect(service.accessReview('client')).rejects.toThrow('Сотрудник не найден');
    expect(db.permission.findMany).not.toHaveBeenCalled();
  });
  it('uses unique, descriptive role names instead of indistinguishable manager labels', () => {
    expect(new Set(workspaceRoleCatalog.map(item => item.label)).size).toBe(workspaceRoleCatalog.length);
    expect(new Set(workspaceRoleCatalog.map(item => item.shortLabel)).size).toBe(workspaceRoleCatalog.length);
    expect(workspaceRoleCatalog.every(item => Boolean(item.description))).toBe(true);
  });
  it('rejects administrative self-blocking at the API layer', async () => {
    const { db, service } = fixture();
    await expect(service.updateEmployee('staff', { role: 'MANAGER_SALES' }, 'staff')).rejects.toThrow('собственную роль');
    await expect(service.updatePermissions('staff', { allow: [], deny: ['system.manage'] }, 'staff')).rejects.toThrow('себе управление');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
