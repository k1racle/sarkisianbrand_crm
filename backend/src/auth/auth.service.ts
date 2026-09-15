import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Locale, Prisma, ProfileChangeStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, CompletePasswordResetDto, LoginDto, RefreshTokenDto, RegisterDto, RequestProfileChangeDto, UpdateOwnProfileDto } from './dto/auth.dto';

type SessionContext = { userAgent?: string; ipAddress?: string };
type SocialProfile = { provider: string; externalId: string; email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; avatarUrl?: string | null; metadata?: Record<string, unknown> };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, context: SessionContext = {}) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] } });
    if (existing) throw new ConflictException('Пользователь с такими данными уже существует');
    const password = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, phone: dto.phone, firstName: dto.firstName, lastName: dto.lastName, password, passwordChangedAt: new Date(), role: UserRole.CUSTOMER_B2C } });
      await tx.customer.create({ data: { userId: created.id, firstName: created.firstName, lastName: created.lastName, email: created.email, phone: created.phone, normalizedEmail: created.email, normalizedPhone: created.phone?.replace(/\D/g, '') || null, segment: 'B2C', source: 'WEB' } });
      return created;
    });
    return { user: this.publicUser(user), ...(await this.issueTokens(user.id, user.role, context)) };
  }

  async login(dto: LoginDto, context: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) throw new UnauthorizedException('Неверный email или пароль');
    if (!user.isActive) throw new UnauthorizedException('Учётная запись заблокирована');
    return { user: this.publicUser(user), ...(await this.issueTokens(user.id, user.role, context)) };
  }

  async resolveSocialUser(profile: SocialProfile) {
    const identity = await this.prisma.customerExternalIdentity.findUnique({
      where: { provider_externalId: { provider: profile.provider, externalId: profile.externalId } },
      include: { customer: { include: { user: true } } },
    });
    if (identity?.customer.user?.isActive) return identity.customer.user;

    const email = profile.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Провайдер не передал email. Разрешите доступ к адресу электронной почты.');
    const existing = await this.prisma.user.findUnique({ where: { email }, include: { customer: true } });
    if (existing && existing.role !== UserRole.CUSTOMER_B2C) throw new ConflictException('Этот email используется служебной или B2B-учётной записью');
    if (existing && !existing.isActive) throw new UnauthorizedException('Учётная запись заблокирована');

    return this.prisma.$transaction(async (tx) => {
      const user = existing || await tx.user.create({
        data: {
          email,
          phone: profile.phone || undefined,
          firstName: profile.firstName || undefined,
          lastName: profile.lastName || undefined,
          password: await bcrypt.hash(randomUUID() + randomUUID(), 12),
          passwordChangedAt: new Date(),
          role: UserRole.CUSTOMER_B2C,
        },
      });
      const customer = existing?.customer || await tx.customer.create({
        data: {
          userId: user.id, firstName: profile.firstName || user.firstName, lastName: profile.lastName || user.lastName,
          email, phone: profile.phone || user.phone, normalizedEmail: email,
          normalizedPhone: (profile.phone || user.phone)?.replace(/\D/g, '') || null, segment: 'B2C', source: profile.provider,
        },
      });
      await tx.customerExternalIdentity.upsert({
        where: { provider_externalId: { provider: profile.provider, externalId: profile.externalId } },
        update: { customerId: customer.id, metadata: profile.metadata as Prisma.InputJsonValue | undefined },
        create: { customerId: customer.id, provider: profile.provider, externalId: profile.externalId, metadata: profile.metadata as Prisma.InputJsonValue | undefined },
      });
      return user;
    });
  }

  async issueSocialSession(userId: string, context: SessionContext = {}) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException('Учётная запись недоступна');
    return { user: this.publicUser(user), ...(await this.issueTokens(user.id, user.role, context)) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException(user ? 'Учётная запись заблокирована' : 'Пользователь не найден');
    return this.publicUser(user);
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } },
        profileChangeRequests: { where: { status: ProfileChangeStatus.PENDING }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user?.isActive) throw new UnauthorizedException('Учётная запись недоступна');
    return {
      ...this.publicUser(user),
      sessions: user.sessions.map(({ refreshToken: _secret, ...session }) => session),
      pendingChangeRequest: user.profileChangeRequests[0] || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateOwnProfileDto) {
    const preferences = dto.notificationPreferences ? this.sanitizeNotificationPreferences(dto.notificationPreferences) : undefined;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        country: dto.country?.toUpperCase(),
        city: dto.city?.trim(),
        timezone: dto.timezone,
        locale: dto.locale as Locale | undefined,
        notificationPreferences: preferences as Prisma.InputJsonValue | undefined,
      },
    });
    return this.publicUser(user);
  }

  async requestProfileChange(userId: string, dto: RequestProfileChangeDto) {
    const requestedData = Object.fromEntries(
      Object.entries(dto)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([key, value]) => [key, String(value).trim()]),
    );
    if (!Object.keys(requestedData).length) throw new BadRequestException('Укажите данные, которые требуется изменить');
    const pending = await this.prisma.profileChangeRequest.findFirst({ where: { userId, status: ProfileChangeStatus.PENDING } });
    if (pending) throw new ConflictException('Запрос на изменение данных уже ожидает рассмотрения');
    return this.prisma.profileChangeRequest.create({ data: { userId, requestedData } });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) throw new UnauthorizedException('Текущий пароль указан неверно');
    if (await bcrypt.compare(dto.newPassword, user.password)) throw new BadRequestException('Новый пароль должен отличаться от текущего');
    this.assertPasswordStrength(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(dto.newPassword, 12), passwordChangedAt: new Date(), forcePasswordChange: false } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    return { changed: true, sessionsRevoked: true };
  }

  async completePasswordReset(dto: CompletePasswordResetDto) {
    this.assertPasswordStrength(dto.newPassword);
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const token = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.isActive) throw new BadRequestException('Ссылка недействительна или срок её действия истёк');
    const password = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: token.userId }, data: { password, passwordChangedAt: new Date(), forcePasswordChange: false } }),
      this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.updateMany({ where: { userId: token.userId, id: { not: token.id }, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId: token.userId } }),
    ]);
    return { changed: true };
  }

  async refresh(dto: RefreshTokenDto, context: SessionContext = {}) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(dto.refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      const session = await this.prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
      if (!session || !session.user.isActive || session.expiresAt < new Date() || !(await bcrypt.compare(dto.refreshToken, session.refreshToken))) throw new UnauthorizedException();
      await this.prisma.session.delete({ where: { id: session.id } });
      return this.issueTokens(session.user.id, session.user.role, {
        userAgent: context.userAgent || session.userAgent || undefined,
        ipAddress: context.ipAddress || session.ipAddress || undefined,
      });
    } catch {
      throw new UnauthorizedException('Сессия истекла. Войдите снова');
    }
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Сессия не найдена');
    await this.prisma.session.delete({ where: { id: sessionId } });
    return { revoked: true };
  }

  async saveAvatar(userId: string, file?: { buffer: Buffer; mimetype: string; size: number }) {
    if (!file) throw new BadRequestException('Выберите изображение');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Размер изображения не должен превышать 5 МБ');
    const extension = this.imageExtension(file.buffer, file.mimetype);
    if (!extension) throw new BadRequestException('Поддерживаются изображения JPG, PNG и WEBP');
    const directory = this.avatarDirectory();
    await mkdir(directory, { recursive: true });
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarStorageKey: true } });
    const key = `${randomUUID()}.${extension}`;
    await writeFile(resolve(directory, key), file.buffer);
    await this.prisma.user.update({ where: { id: userId }, data: { avatarStorageKey: key } });
    if (current?.avatarStorageKey) await this.removeAvatarFile(current.avatarStorageKey);
    return { avatarUrl: this.avatarUrl(userId, key) };
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarStorageKey: true } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarStorageKey: null } });
    if (user.avatarStorageKey) await this.removeAvatarFile(user.avatarStorageKey);
    return { removed: true };
  }

  async avatar(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarStorageKey: true } });
    if (!user?.avatarStorageKey) throw new NotFoundException('Изображение не найдено');
    const path = resolve(this.avatarDirectory(), user.avatarStorageKey);
    const extension = extname(path).toLowerCase();
    return { buffer: await readFile(path), mime: extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg' };
  }

  private async issueTokens(userId: string, role: UserRole, context: SessionContext = {}) {
    const sid = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ sub: userId, sid, role }, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRATION', '15m') }),
      this.jwt.signAsync({ sub: userId, sid, role }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d') }),
    ]);
    await this.prisma.session.create({ data: { id: sid, userId, refreshToken: await bcrypt.hash(refreshToken, 12), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), userAgent: context.userAgent?.slice(0, 500), ipAddress: context.ipAddress?.slice(0, 100) } });
    return { accessToken, refreshToken };
  }

  private publicUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      locale: user.locale,
      country: user.country,
      city: user.city,
      timezone: user.timezone,
      notificationPreferences: user.notificationPreferences || { email: true, push: true, chat: true },
      forcePasswordChange: user.forcePasswordChange,
      passwordChangedAt: user.passwordChangedAt,
      avatarUrl: user.avatarStorageKey ? this.avatarUrl(user.id, user.avatarStorageKey) : null,
    };
  }

  private sanitizeNotificationPreferences(value: Record<string, boolean>) {
    const allowed = ['email', 'push', 'chat'];
    return Object.fromEntries(allowed.map((key) => [key, value[key] !== false]));
  }

  private assertPasswordStrength(password: string) {
    if (!/[a-zа-я]/i.test(password) || !/\d/.test(password)) throw new BadRequestException('Пароль должен содержать буквы и цифры');
  }

  private avatarDirectory() {
    return resolve(process.cwd(), this.config.get('AVATAR_STORAGE_PATH', 'uploads/avatars'));
  }

  private avatarUrl(userId: string, key: string) {
    return `/api/v1/auth/avatar/${userId}?v=${encodeURIComponent(key)}`;
  }

  private async removeAvatarFile(key: string) {
    if (key !== key.split(/[\\/]/).pop()) return;
    try { await unlink(resolve(this.avatarDirectory(), key)); } catch { /* already removed */ }
  }

  private imageExtension(buffer: Buffer, mime: string) {
    if (mime === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
    if (mime === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
    if (mime === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
    return null;
  }
}
