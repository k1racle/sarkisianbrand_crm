import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SessionClaims = { sub: string; sid: string; exp: number };

/** JWT signature is verified by the transport; session and identity are always checked in the database. */
export async function activeSession(prisma: PrismaService, claims: SessionClaims) {
  if (!claims || typeof claims.sub !== 'string' || !claims.sub || typeof claims.sid !== 'string' || !claims.sid ||
      !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) {
    throw new UnauthorizedException('Сессия завершена. Войдите снова');
  }
  const session = await prisma.session.findFirst({
    where: { id: claims.sid, userId: claims.sub, expiresAt: { gt: new Date() }, user: { isActive: true } },
    select: { user: { select: { id: true, role: true, isActive: true } } },
  });
  if (!session?.user?.isActive || session.user.id !== claims.sub) throw new UnauthorizedException('Сессия завершена. Войдите снова');
  return session.user;
}
