import { UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('Необязательный JWT: гость разрешён, плохой токен не становится гостем', () => {
  let guard: OptionalJwtAuthGuard;
  let jwt: any;
  let prisma: any;
  let request: any;
  const context = () => ({ switchToHttp: () => ({ getRequest: () => request }) } as any);
  beforeEach(() => {
    jwt = { verifyAsync: jest.fn(async () => ({ sub: 'customer-1', role: 'ADMIN', sid: 'session-1' })) };
    prisma = { user: { findUnique: jest.fn(async () => ({ isActive: true, role: 'CUSTOMER_B2C' })) }, session: { findFirst: jest.fn(async () => ({ id: 'session-1' })) } };
    guard = new OptionalJwtAuthGuard(jwt, { get: () => 'test', getOrThrow: () => 'mock-only-secret-not-for-production' } as any, prisma);
    request = { headers: {} };
  });
  it('без Authorization пропускает гостя без JWT/БД', async () => {
    expect(await guard.canActivate(context())).toBe(true);
    expect(request.user).toBeUndefined();
    expect(jwt.verifyAsync).not.toHaveBeenCalled(); expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('валидный JWT использует текущую роль из БД, не повышенную роль из токена', async () => {
    request.headers.authorization = 'Bearer mock-token';
    expect(await guard.canActivate(context())).toBe(true);
    expect(request.user).toMatchObject({ sub: 'customer-1', role: 'CUSTOMER_B2C' });
    expect(prisma.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'session-1', userId: 'customer-1', expiresAt: { gt: expect.any(Date) } }) }));
  });
  it.each(['Basic abc', 'invalid', 'bearer abc'])('неправильный заголовок %s отклоняется', async header => {
    request.headers.authorization = header;
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });
  it('истёкший/поддельный JWT не переводит запрос в гостевой режим', async () => {
    request.headers.authorization = 'Bearer expired'; jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it.each([null, { isActive: false, role: 'CUSTOMER_B2C' }])('удалённый/заблокированный аккаунт не допускается', async account => {
    request.headers.authorization = 'Bearer mock'; prisma.user.findUnique.mockResolvedValue(account);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('отозванная серверная сессия не допускается', async () => {
    request.headers.authorization = 'Bearer mock'; prisma.session.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('production не принимает устаревший JWT без server-side sid', async () => {
    request.headers.authorization = 'Bearer legacy'; jwt.verifyAsync.mockResolvedValue({ sub: 'customer-1', role: 'CUSTOMER_B2C' });
    const production = new OptionalJwtAuthGuard(jwt, { get: () => 'production', getOrThrow: () => 'mock-only-secret-not-for-production' } as any, prisma);
    await expect(production.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.session.findFirst).not.toHaveBeenCalled();
  });
});
