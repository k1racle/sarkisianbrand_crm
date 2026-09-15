import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] } });
    if (existing) throw new ConflictException('Пользователь с такими данными уже существует');
    const password = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: dto.email, phone: dto.phone, firstName: dto.firstName, lastName: dto.lastName, password, role: UserRole.CUSTOMER_B2C } });
      await tx.customer.create({ data: { userId: created.id, firstName: created.firstName, lastName: created.lastName, email: created.email, phone: created.phone, normalizedEmail: created.email.trim().toLowerCase(), normalizedPhone: created.phone?.replace(/\D/g, '') || null, segment: 'B2C', source: 'WEB' } });
      return created;
    });
    return { user: this.publicUser(user), ...(await this.issueTokens(user.id, user.role)) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) throw new UnauthorizedException('Неверный email или пароль');
    if (!user.isActive) throw new UnauthorizedException('Учётная запись заблокирована');
    return { user: this.publicUser(user), ...(await this.issueTokens(user.id, user.role)) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException(user ? 'Учётная запись заблокирована' : 'Пользователь не найден');
    return this.publicUser(user);
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(dto.refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      const session = await this.prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
      if (!session || !session.user.isActive || session.expiresAt < new Date() || !(await bcrypt.compare(dto.refreshToken, session.refreshToken))) throw new UnauthorizedException('Refresh-токен недействителен');
      await this.prisma.session.delete({ where: { id: session.id } });
      return this.issueTokens(session.user.id, session.user.role);
    } catch { throw new UnauthorizedException('Refresh-токен недействителен'); }
  }

  private async issueTokens(userId: string, role: UserRole) {
    const sid = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: userId, role }, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRATION', '15m') }),
      this.jwt.signAsync({ sub: userId, sid, role }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d') }),
    ]);
    await this.prisma.session.create({ data: { id: sid, userId, refreshToken: await bcrypt.hash(refreshToken, 12), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    return { accessToken, refreshToken };
  }

  private publicUser(user: { id: string; email: string; phone: string | null; firstName: string | null; lastName: string | null; role: UserRole; isActive: boolean }) {
    return { id: user.id, email: user.email, phone: user.phone, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive };
  }
}
