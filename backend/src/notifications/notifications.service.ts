import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { SmtpMailService } from './smtp-mail.service';

export interface EnqueueMail {
  kind: string;
  recipient: string;
  subject: string;
  text: string;
  dedupeKey: string;
  bookingId?: string;
  bookingVersion?: number;
  helpdeskCommentId?: string;
  helpdeskTicketId?: string;
}

interface ClaimedMail {
  id: string;
  kind: string;
  recipient: string;
  encryptedPayload: string;
  attempts: number;
}

export const MAIL_MAX_ATTEMPTS = 5;
export const MAIL_LEASE_MS = 10 * 60_000;
export const MAIL_RETRY_BASE_MS = 60_000;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: IntegrationSecretsService,
    private readonly smtp: SmtpMailService,
    private readonly config: ConfigService,
  ) {}

  /** Pass the returned data to tx.mailOutbox.create({ data }) inside an owning transaction. */
  prepare(mail: EnqueueMail) {
    const recipient = mail.recipient.trim().toLowerCase();
    if (!isEmail(recipient) || recipient.length > 254 || !mail.kind || mail.kind.length > 80 ||
        !mail.dedupeKey || mail.dedupeKey.length > 500 || !mail.subject || mail.subject.length > 500 ||
        !mail.text || mail.text.length > 100_000 || /[\r\n]/.test(mail.subject)) {
      throw new Error('MAIL_DATA_INVALID');
    }
    // Do not allow the encryption service's known development fallback for stored mail.
    const key = this.config.get<string>('INTEGRATION_ENCRYPTION_KEY') || this.config.get<string>('JWT_SECRET');
    if (!key || key.length < 32 || key === 'local-development-only') throw new Error('MAIL_ENCRYPTION_KEY_REQUIRED');
    const encryptedPayload = this.secrets.encrypt({ subject: mail.subject, text: mail.text, ...(mail.bookingId && mail.bookingVersion ? { bookingId: mail.bookingId, bookingVersion: String(mail.bookingVersion) } : {}), ...(mail.helpdeskCommentId && mail.helpdeskTicketId ? { helpdeskCommentId: mail.helpdeskCommentId, helpdeskTicketId: mail.helpdeskTicketId } : {}) });
    if (!encryptedPayload) throw new Error('MAIL_ENCRYPTION_FAILED');
    return {
      id: randomUUID(),
      // Hash caller keys so order details / email addresses cannot leak through keys.
      dedupeKey: createHash('sha256').update(mail.dedupeKey).digest('hex'),
      kind: mail.kind,
      recipient,
      encryptedPayload,
      status: 'QUEUED',
      attempts: 0,
      nextAttemptAt: new Date(),
    };
  }

  async enqueue(mail: EnqueueMail): Promise<{ id: string; status: string }> {
    const data = this.prepare(mail);
    const row = await this.prisma.mailOutbox.upsert({
      where: { dedupeKey: data.dedupeKey }, create: data, update: {}, select: { id: true, status: true },
    });
    return row;
  }

  onModuleInit() {
    this.stopping = false;
    // Default safe mode must not even poll / claim existing customer messages.
    if (!this.smtp.deliveryEnabled() || process.env.ECOSYSTEM_AUTOMATION_ENABLED === 'false') return;
    this.timer = setInterval(() => { void this.processQueue().catch(() => {
      this.logger.warn('Очередь писем временно недоступна.');
    }); }, 10_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
  }

  /** Atomic SKIP LOCKED claims work across multiple application processes. */
  async processQueue(limit = 10): Promise<{ processed: number; disabled: boolean }> {
    if (!this.smtp.deliveryEnabled()) return { processed: 0, disabled: true };
    if (this.processing || this.stopping) return { processed: 0, disabled: false };
    this.processing = true;
    let processed = 0;
    try {
      const now = new Date();
      // A process crash on its final attempt must not leave a permanently locked row.
      await this.prisma.mailOutbox.updateMany({
        where: { status: 'PROCESSING', attempts: { gte: MAIL_MAX_ATTEMPTS }, nextAttemptAt: { lte: now } },
        data: { status: 'FAILED', lastError: 'Время обработки истекло; лимит попыток достигнут.' },
      });
      const batchSize = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 10;
      while (processed < batchSize && this.smtp.deliveryEnabled() && !this.stopping) {
        const claimedAt = new Date();
        const leaseUntil = new Date(claimedAt.getTime() + MAIL_LEASE_MS);
        const rows = await this.prisma.$queryRaw<ClaimedMail[]>`
          UPDATE "MailOutbox" AS mail
          SET status = 'PROCESSING', attempts = mail.attempts + 1,
              "nextAttemptAt" = ${leaseUntil}, "updatedAt" = ${claimedAt}
          WHERE mail.id = (
            SELECT candidate.id FROM "MailOutbox" AS candidate
            WHERE candidate.status IN ('QUEUED', 'PROCESSING')
              AND candidate."nextAttemptAt" <= ${claimedAt}
              AND candidate.attempts < ${MAIL_MAX_ATTEMPTS}
            ORDER BY candidate."nextAttemptAt", candidate."createdAt", candidate.id
            FOR UPDATE SKIP LOCKED LIMIT 1
          )
          RETURNING mail.id, mail.kind, mail.recipient, mail."encryptedPayload", mail.attempts
        `;
        const mail = rows[0];
        if (!mail) break;
        const owner = { id: mail.id, status: 'PROCESSING', attempts: mail.attempts };
        try {
          if (!this.smtp.deliveryEnabled() || this.stopping) {
            await this.prisma.mailOutbox.updateMany({ where: owner, data: {
              status: 'QUEUED', attempts: { decrement: 1 }, nextAttemptAt: new Date(),
            } });
            break;
          }
          const payload = this.secrets.decrypt(mail.encryptedPayload);
          if (!payload.subject || !payload.text) throw new Error('MAIL_PAYLOAD_INVALID');
          if (mail.kind === 'HELPDESK_REPLY') {
            // A deleted ticket/comment or an address changed after the reply
            // must not result in a delayed disclosure to an old recipient.
            const current = payload.helpdeskCommentId && payload.helpdeskTicketId && await this.prisma.helpdeskComment.findFirst({ where: { id: payload.helpdeskCommentId, ticketId: payload.helpdeskTicketId, isInternal: false, ticket: { requesterEmail: { equals: mail.recipient, mode: 'insensitive' } } }, select: { id: true } });
            if (!current) {
              await this.prisma.mailOutbox.updateMany({ where: owner, data: { status: 'CANCELLED', lastError: 'Обращение или адрес получателя изменились до отправки.' } });
              processed++; continue;
            }
          }
          if (['SALON_BOOKING_OWNER', 'SALON_BOOKING_CLIENT'].includes(mail.kind)) {
            const version = Number(payload.bookingVersion);
            const current = payload.bookingId && Number.isSafeInteger(version) && version > 0 && await this.prisma.b2BBooking.findFirst({ where: { id: payload.bookingId, version, startTime: { gt: new Date() } }, select: { id: true, organizationId: true } });
            const ownerStillAuthorized = mail.kind !== 'SALON_BOOKING_OWNER' || (current && await this.prisma.organizationMember.findFirst({ where: { organizationId: current.organizationId, role: 'OWNER', isActive: true, user: { email: mail.recipient, role: 'CUSTOMER_B2B', isActive: true } }, select: { id: true } }));
            if (!current || !ownerStillAuthorized) {
              await this.prisma.mailOutbox.updateMany({ where: owner, data: { status: 'CANCELLED', lastError: 'Запись изменилась до отправки письма.' } });
              processed++; continue;
            }
          }
          // Reset mail must not deliver an already expired/revoked link after queue downtime.
          if (mail.kind === 'PASSWORD_RESET') {
            const token = /[?&]token=([a-f0-9]{64})(?:\s|$)/.exec(payload.text)?.[1];
            const tokenHash = token ? createHash('sha256').update(token).digest('hex') : '';
            const valid = tokenHash && await this.prisma.passwordResetToken.findFirst({ where: {
              tokenHash, usedAt: null, expiresAt: { gt: new Date() },
              user: { isActive: true, role: 'CUSTOMER_B2C', email: mail.recipient },
            }, select: { id: true } });
            if (!valid) {
              await this.prisma.mailOutbox.updateMany({ where: owner, data: {
                status: 'CANCELLED', lastError: 'Ссылка сброса недействительна или устарела.',
              } });
              processed++;
              continue;
            }
          }
          if (mail.kind === 'BUSINESS_TEAM_INVITE') {
            const token = /[#&]token=([A-Za-z0-9_-]{43})(?:\s|$)/.exec(payload.text)?.[1];
            const invitation = token && await this.prisma.businessTeamInvitation.findFirst({ where: {
              tokenHash: createHash('sha256').update(token).digest('hex'), email: mail.recipient,
              status: 'PENDING', expiresAt: { gt: new Date() }, organization: { status: { not: 'ARCHIVED' } },
            }, select: { organizationId: true, createdById: true } });
            const inviter = invitation && await this.prisma.organizationMember.findFirst({ where: {
              organizationId: invitation.organizationId, userId: invitation.createdById, isActive: true, role: 'OWNER',
              user: { isActive: true, role: 'CUSTOMER_B2B' },
            }, select: { id: true } });
            if (!inviter) {
              await this.prisma.mailOutbox.updateMany({ where: owner, data: { status: 'CANCELLED', lastError: 'Приглашение недействительно или срок действия истёк.' } });
              processed++; continue;
            }
          }
          await this.smtp.send({ recipient: mail.recipient, subject: payload.subject, text: payload.text });
          await this.prisma.mailOutbox.updateMany({ where: owner, data: {
            status: 'SENT', sentAt: new Date(), lastError: null,
          } });
        } catch {
          const failed = mail.attempts >= MAIL_MAX_ATTEMPTS;
          await this.prisma.mailOutbox.updateMany({ where: owner, data: {
            status: failed ? 'FAILED' : 'QUEUED',
            nextAttemptAt: new Date(Date.now() + MAIL_RETRY_BASE_MS * 2 ** (mail.attempts - 1)),
            // Never persist provider exceptions: they can contain credentials, addresses and text.
            lastError: failed ? 'Письмо не отправлено; лимит попыток достигнут.' : 'Не удалось отправить письмо; запланирована повторная попытка.',
          } });
        }
        processed++;
      }
      return { processed, disabled: !this.smtp.deliveryEnabled() };
    } finally {
      this.processing = false;
    }
  }
}
