import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PasswordResetRequestDto } from './password-reset-request.dto';

export const PASSWORD_RESET_COOLDOWN_MS = 5 * 60_000;
export const PASSWORD_RESET_EXPIRY_MS = 30 * 60_000;
export const PASSWORD_RESET_ACCEPTED = {
  message: 'Если для этого адреса доступно восстановление пароля, мы отправим письмо с инструкциями.',
};

@Controller('auth/password-reset')
export class PasswordResetRequestController {
  private readonly logger = new Logger(PasswordResetRequestController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  async request(@Body() dto: PasswordResetRequestDto) {
    const startedAt = Date.now();
    const email = dto.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    try {
      // Never derive the reset origin from caller-controlled headers / redirect parameters.
      const appUrl = new URL(this.config.get<string>('PUBLIC_APP_URL', 'http://localhost:3001'));
      if (!['http:', 'https:'].includes(appUrl.protocol) || appUrl.username || appUrl.password ||
          (this.config.get('NODE_ENV') === 'production' && appUrl.protocol !== 'https:')) {
        throw new Error('PASSWORD_RESET_ORIGIN_INVALID');
      }
      const resetUrl = new URL('/password-reset', appUrl);
      resetUrl.searchParams.set('token', rawToken);
      await this.prisma.$transaction(async (tx) => {
        // Per-address cross-process lock prevents concurrent requests bypassing cooldown.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`password-reset:${email}`}))`;
        const user = await tx.user.findFirst({
          where: { email, isActive: true, role: 'CUSTOMER_B2C' }, select: { id: true, email: true },
        });
        if (!user) return;
        const now = new Date();
        const recent = await tx.passwordResetToken.findFirst({ where: {
          userId: user.id, createdAt: { gte: new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS) },
        }, select: { id: true } });
        if (recent) return;
        const data = this.notifications.prepare({
          kind: 'PASSWORD_RESET', recipient: user.email,
          subject: 'Восстановление пароля SARKISIAN BRAND',
          text: `Для смены пароля перейдите по ссылке:\n${resetUrl.toString()}\n\nСсылка действует 30 минут и может быть использована один раз. Если вы не запрашивали смену пароля, проигнорируйте это письмо.`,
          dedupeKey: `password-reset:${tokenHash}`,
        });
        await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
        await tx.passwordResetToken.create({ data: {
          userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MS),
        } });
        await tx.mailOutbox.create({ data });
      });
    } catch {
      // Deliberately return the same accepted response for queue/configuration/database failures.
      this.logger.warn('Не удалось подготовить запрос восстановления пароля.');
    } finally {
      // Equal minimum latency for nonexistent, staff, cooling-down and active accounts.
      const remaining = 250 + randomInt(0, 51) - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    return { ...PASSWORD_RESET_ACCEPTED };
  }
}
