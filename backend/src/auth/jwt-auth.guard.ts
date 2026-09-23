import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { activeSession } from './active-session';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Требуется Bearer-токен');
    try {
      request.user = await this.jwt.verifyAsync(header.slice(7), { secret: this.config.getOrThrow('JWT_SECRET') });
      const account = await activeSession(this.prisma, request.user);
      request.user.role = account.role;
      return true;
    } catch { throw new UnauthorizedException('Токен недействителен или истёк'); }
  }
}
