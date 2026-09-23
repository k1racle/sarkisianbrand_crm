import { activeSession } from './active-session';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('Current session validation (HTTP and realtime)', () => {
  const claims = () => ({ sub: 'employee', sid: 'session', exp: Math.floor(Date.now() / 1000) + 600 });
  const db = () => ({ session: { findFirst: jest.fn().mockResolvedValue({ user: { id: 'employee', role: 'MANAGER_SALES', isActive: true } }) } });
  it.each([{ sid: undefined }, { sub: '' }, { exp: undefined }, { exp: 1 }])('rejects malformed or expired claims %p before database lookup', async patch => {
    const prisma = db();
    await expect(activeSession(prisma as any, { ...claims(), ...patch } as any)).rejects.toThrow('Сессия завершена');
    expect(prisma.session.findFirst).not.toHaveBeenCalled();
  });
  it.each([null, { user: { id: 'employee', isActive: false } }, { user: { id: 'other', isActive: true } }])('rejects a revoked, blocked or unrelated identity', async session => {
    const prisma = db(); prisma.session.findFirst.mockResolvedValue(session as any);
    await expect(activeSession(prisma as any, claims())).rejects.toThrow('Сессия завершена');
  });
  it('loads the current role and binds the database session to its owner and expiry', async () => {
    const prisma = db();
    expect(await activeSession(prisma as any, claims())).toMatchObject({ role: 'MANAGER_SALES' });
    expect(prisma.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session', userId: 'employee', expiresAt: { gt: expect.any(Date) }, user: { isActive: true } } }));
  });
  it('HTTP ignores the stale role in a signed token and rejects revoked sessions', async () => {
    const prisma = db(), jwt = { verifyAsync: jest.fn().mockResolvedValue({ ...claims(), role: 'ADMIN' }) };
    const guard = new JwtAuthGuard(jwt as any, { getOrThrow: () => 'mock-only' } as any, prisma as any);
    const request: any = { headers: { authorization: 'Bearer mock-only' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => request }) };
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(request.user.role).toBe('MANAGER_SALES');
    prisma.session.findFirst.mockResolvedValue(null as any);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Токен недействителен');
  });
});
