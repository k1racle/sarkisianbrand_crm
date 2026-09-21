import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpMailService } from '../notifications/smtp-mail.service';
import { SubmitContactMessageDto, UpdateContactFormSettingDto } from './contact-messages.dto';

@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger(ContactMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly smtp: SmtpMailService,
  ) {}

  async submit(dto: SubmitContactMessageDto) {
    // Honeypot: acknowledge bots without putting their content into the inbox.
    if (dto.website?.trim()) return { accepted: true };
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    const email = dto.email.trim().toLowerCase();
    const message = dto.message.trim();
    if (name.length < 2 || message.length < 10) throw new BadRequestException('Заполните имя и сообщение.');

    const id = randomUUID();
    const setting = await this.prisma.contactFormSetting.findUnique({ where: { key: 'main' } });
    let mailData: ReturnType<NotificationsService['prepare']> | undefined;
    if (setting?.recipientEmail) {
      try {
        mailData = this.notifications.prepare({
          kind: 'CONTACT_FORM',
          recipient: setting.recipientEmail,
          subject: 'Новое сообщение с сайта SARKISIAN',
          text: `Новое сообщение через форму контактов\n\nИмя: ${name}\nТелефон: ${phone}\nПочта: ${email}\n\nСообщение:\n${message}\n\nОткрыть в админке: /admin-workspace/contact-messages`,
          dedupeKey: `contact-form:${id}`,
        });
      } catch {
        // Saving the inquiry must not depend on mail configuration.
        this.logger.warn('Контактное сообщение сохранится без письма: почтовая очередь недоступна.');
      }
    }
    await this.prisma.$transaction(async tx => {
      if (mailData) await tx.mailOutbox.create({ data: mailData });
      await tx.contactMessage.create({ data: {
        id, name, phone, email, message,
        notificationStatus: mailData ? 'QUEUED' : 'DISABLED',
        mailOutboxId: mailData?.id,
      } });
    });
    return { accepted: true };
  }

  async settings() {
    const row = await this.prisma.contactFormSetting.findUnique({ where: { key: 'main' } });
    return { recipientEmail: row?.recipientEmail || '', deliveryEnabled: this.smtp.deliveryEnabled() && process.env.ECOSYSTEM_AUTOMATION_ENABLED !== 'false' };
  }

  async updateSettings(dto: UpdateContactFormSettingDto) {
    if (!Object.prototype.hasOwnProperty.call(dto, 'recipientEmail')) throw new BadRequestException('Укажите адрес почты.');
    const recipientEmail = dto.recipientEmail?.trim().toLowerCase() || null;
    await this.prisma.contactFormSetting.upsert({ where: { key: 'main' }, create: { key: 'main', recipientEmail }, update: { recipientEmail } });
    return this.settings();
  }

  async list(pageValue?: string, unreadValue?: string) {
    const parsed = Number(pageValue || 1);
    const page = Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 100000)) : 1;
    const where = unreadValue === 'true' ? { readAt: null } : {};
    const [items, total, unread] = await Promise.all([
      this.prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20 }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { readAt: null } }),
    ]);
    return { items, total, unread, page, pages: Math.max(1, Math.ceil(total / 20)) };
  }

  async markRead(id: string) {
    const result = await this.prisma.contactMessage.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) {
      const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Сообщение не найдено.');
      return existing;
    }
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }
}
