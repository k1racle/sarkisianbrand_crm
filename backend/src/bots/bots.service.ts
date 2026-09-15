import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { BotAudience, BotEventStatus, IntegrationStatus, Prisma } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';

const providers = ['TELEGRAM', 'MAX', 'VK'] as const;
type BotProvider = typeof providers[number];

type IncomingMessage = {
  externalEventId: string;
  externalUserId?: string;
  externalChatId?: string;
  eventType?: string;
  text?: string;
  displayName?: string;
};

@Injectable()
export class BotsService {
  private readonly jobName = 'BOT_WEBHOOK_PROCESS';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: BackgroundJobsService,
    private readonly secrets: IntegrationSecretsService,
  ) {
    this.jobs.register(this.jobName, (payload, progress) => this.processEvent(payload.eventId, progress));
  }

  async accept(providerValue: string, audienceValue: string, headers: Record<string, any>, payload: any) {
    const provider = providerValue.toUpperCase() as BotProvider;
    const audience = audienceValue.toUpperCase() as BotAudience;
    if (!providers.includes(provider)) throw new BadRequestException('Неизвестный канал бота');
    if (!Object.values(BotAudience).includes(audience)) throw new BadRequestException('Неизвестная аудитория бота');
    if (!payload || typeof payload !== 'object') throw new BadRequestException('Тело события должно быть объектом JSON');

    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: `BOT_${provider}_${audience}` } });
    if (!integration?.isEnabled || (integration.status !== IntegrationStatus.CONFIGURED && integration.status !== IntegrationStatus.CONNECTED)) {
      throw new ServiceUnavailableException('Этот бот не включён или настроен не полностью');
    }
    const secretValues = this.secrets.decrypt(integration.encryptedSecrets);
    this.verifyWebhook(provider, headers, payload, secretValues.webhookSecret);

    if (provider === 'VK' && payload.type === 'confirmation') {
      if (!secretValues.confirmationToken) throw new ServiceUnavailableException('Для VK не задана строка подтверждения Callback API');
      return secretValues.confirmationToken;
    }

    const message = this.extract(provider, payload);
    let event: { id: string };
    try {
      event = await this.prisma.botWebhookEvent.create({
        data: {
          integrationId: integration.id,
          provider,
          audience,
          externalEventId: message.externalEventId,
          externalUserId: message.externalUserId,
          externalChatId: message.externalChatId,
          eventType: message.eventType,
          commandText: message.text,
          status: BotEventStatus.QUEUED,
          payload: payload as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return { ok: true, duplicate: true };
      throw error;
    }

    if (message.externalUserId) {
      await this.prisma.botIdentity.upsert({
        where: { provider_audience_externalUserId: { provider, audience, externalUserId: message.externalUserId } },
        update: { externalChatId: message.externalChatId, displayName: message.displayName, lastSeenAt: new Date() },
        create: { provider, audience, externalUserId: message.externalUserId, externalChatId: message.externalChatId, displayName: message.displayName },
      });
    }

    try {
      await this.jobs.enqueue(this.jobName, { eventId: event.id });
    } catch (error: any) {
      await this.prisma.botWebhookEvent.update({ where: { id: event.id }, data: { status: BotEventStatus.FAILED, error: String(error?.message || error).slice(0, 2000) } });
      throw new ServiceUnavailableException('Событие принято, но очередь обработки временно недоступна');
    }
    return { ok: true, eventId: event.id };
  }

  private verifyWebhook(provider: BotProvider, headers: Record<string, any>, payload: any, expected?: string) {
    if (!expected) throw new ServiceUnavailableException('В настройках бота не задан секрет webhook');
    const authorization = String(headers.authorization || '');
    const actual = provider === 'TELEGRAM'
      ? headers['x-telegram-bot-api-secret-token']
      : provider === 'VK'
        ? payload.secret
        : headers['x-max-bot-secret'] || headers['x-bot-secret'] || (authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
    if (!this.equalSecret(String(actual || ''), expected)) throw new UnauthorizedException('Секрет webhook недействителен');
  }

  private equalSecret(actual: string, expected: string) {
    const left = Buffer.from(actual);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private extract(provider: BotProvider, payload: any): IncomingMessage {
    const digest = () => createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (provider === 'TELEGRAM') {
      const message = payload.message || payload.edited_message || payload.channel_post || payload.callback_query?.message || {};
      const sender = payload.callback_query?.from || message.from || {};
      return {
        externalEventId: String(payload.update_id ?? digest()),
        externalUserId: sender.id !== undefined ? String(sender.id) : undefined,
        externalChatId: message.chat?.id !== undefined ? String(message.chat.id) : undefined,
        eventType: payload.callback_query ? 'callback_query' : payload.message ? 'message' : payload.edited_message ? 'edited_message' : 'event',
        text: payload.callback_query?.data || message.text || message.caption,
        displayName: [sender.first_name, sender.last_name].filter(Boolean).join(' ') || sender.username,
      };
    }
    if (provider === 'VK') {
      const message = payload.object?.message || payload.object || {};
      return {
        externalEventId: String(payload.event_id ?? `${payload.type || 'event'}:${payload.group_id || ''}:${message.id || message.conversation_message_id || digest()}`),
        externalUserId: message.from_id !== undefined ? String(message.from_id) : undefined,
        externalChatId: message.peer_id !== undefined ? String(message.peer_id) : undefined,
        eventType: payload.type || 'event',
        text: message.text,
      };
    }
    const message = payload.message || payload.body?.message || payload.update?.message || {};
    const sender = message.sender || message.from || payload.user || {};
    return {
      externalEventId: String(payload.update_id ?? payload.event_id ?? payload.id ?? digest()),
      externalUserId: sender.user_id !== undefined ? String(sender.user_id) : sender.id !== undefined ? String(sender.id) : undefined,
      externalChatId: message.chat_id !== undefined ? String(message.chat_id) : message.chat?.id !== undefined ? String(message.chat.id) : undefined,
      eventType: payload.type || payload.update_type || 'event',
      text: message.text || message.body?.text || payload.callback?.payload,
      displayName: sender.name || [sender.first_name, sender.last_name].filter(Boolean).join(' ') || undefined,
    };
  }

  private commandName(text?: string) {
    const first = String(text || '').trim().split(/\s+/)[0]?.toLowerCase();
    return first?.startsWith('/') ? first.split('@')[0] : '';
  }

  private async processEvent(eventId: string, progress: (value: number) => Promise<void>) {
    await progress(10);
    const event = await this.prisma.botWebhookEvent.update({
      where: { id: eventId }, data: { status: BotEventStatus.PROCESSING, error: null },
      include: { integration: true },
    });
    try {
      const commandName = this.commandName(event.commandText || undefined);
      if (!commandName) return this.finish(eventId, BotEventStatus.IGNORED, 'Событие не содержит команды');
      await progress(35);
      const command = await this.prisma.botCommand.findFirst({
        where: { command: commandName, isEnabled: true, audiences: { has: event.audience }, channels: { has: event.provider } },
      });
      if (!command) return this.finish(eventId, BotEventStatus.IGNORED, 'Команда не найдена или недоступна для этой аудитории');

      const identity = event.externalUserId ? await this.prisma.botIdentity.findUnique({
        where: { provider_audience_externalUserId: { provider: event.provider, audience: event.audience, externalUserId: event.externalUserId } },
      }) : null;
      await progress(60);
      if (command.requiresAuth && !identity?.isVerified) {
        return this.finish(eventId, BotEventStatus.REQUIRES_AUTH, 'Сначала привяжите мессенджер к профилю экосистемы.', command.id);
      }
      const response = await this.renderResponse(command.handlerKey, command.responseTemplate, event.provider, event.audience);
      await progress(90);
      return this.finish(eventId, BotEventStatus.COMPLETED, response, command.id);
    } catch (error: any) {
      await this.prisma.botWebhookEvent.update({
        where: { id: eventId }, data: { status: BotEventStatus.FAILED, error: String(error?.message || error).slice(0, 2000), processedAt: new Date() },
      });
      throw error;
    }
  }

  private async renderResponse(handlerKey: string, template: string | null, provider: string, audience: BotAudience) {
    if (template) return template;
    if (handlerKey === 'WELCOME') return 'Добро пожаловать в экосистему SARKISIAN. Используйте /help, чтобы увидеть доступные команды.';
    if (handlerKey === 'HELP') {
      const commands = await this.prisma.botCommand.findMany({
        where: { isEnabled: true, audiences: { has: audience }, channels: { has: provider } }, orderBy: { sortOrder: 'asc' },
      });
      return commands.map((item) => `${item.command} — ${item.title}`).join('\n');
    }
    if (handlerKey === 'CATALOG') return 'Каталог SARKISIAN готов к подключению: команда будет открывать актуальные товары и персональные цены.';
    return 'Команда принята. Результат появится после подключения рабочего адаптера этого сценария.';
  }

  private async finish(eventId: string, status: BotEventStatus, responseText: string, commandId?: string) {
    await this.prisma.botWebhookEvent.update({
      where: { id: eventId }, data: { status, responseText, commandId, processedAt: new Date() },
    });
    return { eventId, status, commandId, responseText };
  }
}
