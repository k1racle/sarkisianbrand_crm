import { AuthService } from './auth.service';

describe('Workspace effective access', () => {
  const prisma: any = { user: { findUnique: jest.fn() }, rolePermission: { findMany: jest.fn() }, userPermission: { findMany: jest.fn() } };
  const service = new AuthService(prisma, {} as any, {} as any);
  beforeEach(() => jest.resetAllMocks());
  it('uses the current database role and removes personal DENY after ALLOW', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CONTENT_MANAGER', isActive: true });
    prisma.rolePermission.findMany.mockResolvedValue([{ permission: { key: 'catalog.read' } }, { permission: { key: 'catalog.write' } }]);
    prisma.userPermission.findMany.mockResolvedValue([{ effect: 'DENY', permission: { key: 'catalog.write' } }, { effect: 'ALLOW', permission: { key: 'media.read' } }]);
    await expect(service.access('own-user')).resolves.toEqual({ role: 'CONTENT_MANAGER', permissions: ['catalog.read', 'media.read'], denied: ['catalog.write'] });
    expect(prisma.userPermission.findMany.mock.calls[0][0].where).toEqual({ userId: 'own-user' });
  });
  it.each([null, { role: 'ADMIN', isActive: false }])('rejects absent or inactive identity', async user => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.access('own-user')).rejects.toThrow('Сессия завершена');
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });
  it('never lets ALLOW override DENY for the same permission', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    prisma.rolePermission.findMany.mockResolvedValue([]);
    prisma.userPermission.findMany.mockResolvedValue([{ effect: 'ALLOW', permission: { key: 'media.write' } }, { effect: 'DENY', permission: { key: 'media.write' } }]);
    expect((await service.access('own-user')).permissions).toEqual([]);
  });
});
