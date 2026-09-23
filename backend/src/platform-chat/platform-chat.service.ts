import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmChatType, PlatformChatAttachmentKind, TaskStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformChannelDto, CreatePlatformMessageDto, PlatformEntityAttachmentDto } from './dto/platform-chat.dto';
import { PlatformChatGateway } from './platform-chat.gateway';
import { AuthService } from '../auth/auth.service';

const internalRoles: UserRole[] = [
  UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.MANAGER_B2B, UserRole.MANAGER_SALES,
  UserRole.MARKETPLACE_MANAGER, UserRole.SUPERVISOR, UserRole.EXECUTIVE, UserRole.IT_SUPPORT,
  UserRole.CURATOR, UserRole.WAREHOUSE,
];
const defaults = [
  { name: 'Общий', description: 'Новости компании и общие вопросы' },
  { name: 'Продажи', description: 'Сделки, клиенты и выполнение плана' },
  { name: 'B2B', description: 'Работа с партнёрами и салонами' },
  { name: 'IT и система', description: 'Работа платформы, интеграции и поддержка' },
];

@Injectable()
export class PlatformChatService {
  private readonly uploadDirectory = join(process.cwd(), 'uploads', 'platform-chat');
  constructor(private readonly prisma: PrismaService, private readonly realtime: PlatformChatGateway, private readonly auth: AuthService) {}

  team() {
    return this.prisma.user.findMany({
      where: { role: { in: internalRoles }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: 'asc' }, { email: 'asc' }],
    });
  }

  async channels(userId: string) {
    await this.ensureDefaultChannels(userId);
    const channels = await this.prisma.crmChatChannel.findMany({
      where: { isArchived: false, OR: [{ type: CrmChatType.TEAM }, { createdById: userId }, { members: { some: { userId } } }] },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return Promise.all(channels.map(async channel => ({ ...channel, unread: await this.unreadForChannel(channel.id, userId, channel.members.find(item => item.userId === userId)?.lastReadAt) })));
  }

  async unread(userId: string) {
    const channels = await this.channels(userId);
    return { total: channels.reduce((sum, channel) => sum + channel.unread, 0), channels: channels.map(channel => ({ id: channel.id, unread: channel.unread })) };
  }

  async createChannel(dto: CreatePlatformChannelDto, actorId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Введите название канала');
    if (await this.prisma.crmChatChannel.findUnique({ where: { name } })) throw new ConflictException('Канал с таким названием уже существует');
    const memberIds = [...new Set([actorId, ...(dto.memberIds || [])])];
    await this.assertInternalUsers(memberIds);
    const channel = await this.prisma.crmChatChannel.create({
      data: {
        name, description: dto.description, type: dto.type || CrmChatType.TEAM, createdById: actorId,
        members: { create: memberIds.map(userId => ({ userId, role: userId === actorId ? 'OWNER' : 'MEMBER' })) },
      },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
    await this.realtime.publishChannel(channel);
    return channel;
  }

  async messages(channelId: string, userId: string) {
    await this.assertChannelAccess(channelId, userId);
    const rows = await this.prisma.crmChatMessage.findMany({
      where: { channelId, deletedAt: null },
      include: {
        attachments: true,
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        replyTo: { include: { author: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    await this.markRead(channelId, userId);
    return rows.reverse();
  }

  async postMessage(channelId: string, dto: CreatePlatformMessageDto, userId: string) {
    await this.assertChannelAccess(channelId, userId);
    await this.assertReply(channelId, dto.replyToId);
    const body = dto.body?.trim() || '';
    const attachments = await this.resolveEntities(dto.entities || [],userId);
    if (!body && !attachments.length) throw new BadRequestException('Сообщение не может быть пустым');
    const message = await this.prisma.crmChatMessage.create({
      data: { channelId, authorId: userId, body, replyToId: dto.replyToId, attachments: { create: attachments } },
      include: { attachments: true, author: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    await this.realtime.publishMessage(message);
    return message;
  }

  async postUpload(channelId: string, files: any[], body: string | undefined, entitiesSource: string | undefined, replyToId: string | undefined, userId: string) {
    await this.assertChannelAccess(channelId, userId);
    await this.assertReply(channelId, replyToId);
    let entities: PlatformEntityAttachmentDto[] = [];
    if (entitiesSource) {
      try { entities = JSON.parse(entitiesSource); } catch { throw new BadRequestException('Некорректный список прикреплённых карточек'); }
    }
    if (!Array.isArray(entities)) throw new BadRequestException('Некорректный список прикреплённых карточек');
    const entityAttachments = await this.resolveEntities(entities,userId);
    if ((!files || !files.length) && !body?.trim() && !entityAttachments.length) throw new BadRequestException('Сообщение не может быть пустым');
    await mkdir(this.uploadDirectory, { recursive: true });
    const stored: { key: string; path: string; attachment: any }[] = [];
    try {
      for (const file of files || []) {
        if (!file?.buffer?.length) throw new BadRequestException('Файл пуст');
        if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Размер файла не должен превышать 10 МБ');
        const suffix = extname(file.originalname || '').slice(0, 16).toLowerCase();
        const key = `${randomUUID()}${suffix}`;
        const target = join(this.uploadDirectory, key);
        await writeFile(target, file.buffer);
        const kind = file.mimetype?.startsWith('image/') ? PlatformChatAttachmentKind.IMAGE : file.mimetype?.startsWith('audio/') ? PlatformChatAttachmentKind.AUDIO : PlatformChatAttachmentKind.FILE;
        stored.push({ key, path: target, attachment: { kind, name: file.originalname || 'Файл', mimeType: file.mimetype || 'application/octet-stream', size: file.size, storageKey: key } });
      }
      const message = await this.prisma.crmChatMessage.create({
        data: { channelId, authorId: userId, body: body?.trim() || '', replyToId, attachments: { create: [...stored.map(item => item.attachment), ...entityAttachments] } },
        include: { attachments: true, author: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
      await this.realtime.publishMessage(message);
      return message;
    } catch (error) {
      await Promise.all(stored.map(item => unlink(item.path).catch(() => undefined)));
      throw error;
    }
  }

  async attachment(id: string, userId: string) {
    const attachment = await this.prisma.platformChatAttachment.findUnique({ where: { id }, include: { message: { select: { channelId: true } } } });
    if (!attachment?.storageKey) throw new NotFoundException('Вложение не найдено');
    await this.assertChannelAccess(attachment.message.channelId, userId);
    try {
      return { ...attachment, buffer: await readFile(join(this.uploadDirectory, attachment.storageKey)) };
    } catch {
      throw new NotFoundException('Файл вложения не найден');
    }
  }

  async markRead(channelId: string, userId: string) {
    const channel = await this.assertChannelAccess(channelId, userId);
    await this.prisma.crmChatMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId, lastReadAt: new Date(), role: channel.createdById === userId ? 'OWNER' : 'MEMBER' },
      update: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  async searchEntities(type: string, search = '', userId: string, entityId?: string) {
    const permissions:Record<string,string>={TASK:'crm.read',STAGE:'crm.read',CUSTOMER:'customers.read',PRODUCT:'catalog.read'};
    if(!permissions[type])throw new BadRequestException('Неизвестный тип карточки');
    const access=await this.auth.access(userId);
    if(!access.permissions.includes(permissions[type]))throw new ForbiddenException('Нет доступа к этому типу карточек');
    const query = search.trim();
    if (type === 'TASK') {
      const rows = await this.prisma.task.findMany({ where: { ...(entityId?{id:entityId}:{}), status: { not: TaskStatus.CANCELLED }, ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] } : {}) }, include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 });
      return rows.map(item => ({ id: item.id, type, title: item.title, subtitle: `${this.taskStatus(item.status)} · ${[item.assignedTo?.firstName, item.assignedTo?.lastName].filter(Boolean).join(' ') || item.assignedTo?.email}`, url: '/crm-tasks' }));
    }
    if (type === 'CUSTOMER') {
      const rows = await this.prisma.customer.findMany({ where: entityId ? {id:entityId} : query ? { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query } }] } : {}, orderBy: { updatedAt: 'desc' }, take: 20 });
      return rows.map(item => ({ id: item.id, type, title: [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email || item.phone || 'Клиент', subtitle: item.email || item.phone || 'Карточка Customer 360°', url: '/crm-customers' }));
    }
    if (type === 'STAGE') {
      const rows = await this.prisma.crmPipelineStage.findMany({ where: entityId ? {id:entityId} : query ? { name: { contains: query, mode: 'insensitive' } } : {}, include: { pipeline: true, _count: { select: { leads: true } } }, orderBy: { sortOrder: 'asc' }, take: 20 });
      return rows.map(item => ({ id: item.id, type, title: item.name, subtitle: `${item.pipeline.name} · ${item._count.leads} сделок`, url: '/crm-pipeline', color: item.color }));
    }
    if (type === 'PRODUCT') {
      const rows = await this.prisma.product.findMany({ where: { ...(entityId?{id:entityId}:{}), isActive: true, ...(query ? { OR: [{ nameRu: { contains: query, mode: 'insensitive' } }, { sku: { contains: query, mode: 'insensitive' } }] } : {}) }, include: { images: { take: 1 } }, orderBy: { updatedAt: 'desc' }, take: 20 });
      return rows.map(item => ({ id: item.id, type, title: item.nameRu, subtitle: `${item.sku} · ${Number(item.basePrice).toLocaleString('ru-RU')} ₽`, url: '/admin-workspace?section=products', image: item.images[0]?.url }));
    }
    throw new BadRequestException('Неизвестный тип карточки');
  }

  private async resolveEntities(entities: PlatformEntityAttachmentDto[],userId:string) {
    const result: any[] = [];
    for (const entity of entities.slice(0, 8)) {
      if (!entity?.id || !entity?.type) throw new BadRequestException('Некорректная прикреплённая карточка');
      const matches = await this.searchEntities(entity.type,'',userId,entity.id);
      const item: any = matches.find(candidate => candidate.id === entity.id);
      if (!item) throw new NotFoundException('Прикреплённая карточка не найдена');
      result.push({ kind: PlatformChatAttachmentKind.ENTITY, name: item.title, entityType: entity.type, entityId: entity.id, metadata: { subtitle: item.subtitle, url: item.url, color: item.color, image: item.image } });
    }
    return result;
  }

  private async ensureDefaultChannels(userId: string) {
    for (const item of defaults) {
      const channel = await this.prisma.crmChatChannel.upsert({ where: { name: item.name }, create: { ...item, type: CrmChatType.TEAM, createdById: userId }, update: { description: item.description, isArchived: false } });
      await this.prisma.crmChatMember.upsert({ where: { channelId_userId: { channelId: channel.id, userId } }, create: { channelId: channel.id, userId, role: channel.createdById === userId ? 'OWNER' : 'MEMBER' }, update: {} });
    }
  }

  private async assertChannelAccess(channelId: string, userId: string) {
    const channel = await this.prisma.crmChatChannel.findUnique({ where: { id: channelId }, include: { members: { where: { userId }, select: { userId: true } } } });
    if (!channel || channel.isArchived) throw new NotFoundException('Канал не найден');
    if (channel.type === CrmChatType.PRIVATE && channel.createdById !== userId && !channel.members.length) throw new ForbiddenException('Нет доступа к приватному каналу');
    return channel;
  }

  private async assertReply(channelId: string, replyToId?: string) {
    if (replyToId && !await this.prisma.crmChatMessage.findFirst({ where: { id: replyToId, channelId, deletedAt: null } })) throw new BadRequestException('Исходное сообщение не найдено в этом канале');
  }

  private async assertInternalUsers(ids: string[]) {
    const count = await this.prisma.user.count({ where: { id: { in: ids }, role: { in: internalRoles }, isActive: true } });
    if (count !== ids.length) throw new BadRequestException('Один из участников недоступен для внутреннего чата');
  }

  private unreadForChannel(channelId: string, userId: string, lastReadAt?: Date | null) {
    return this.prisma.crmChatMessage.count({ where: { channelId, deletedAt: null, authorId: { not: userId }, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) } });
  }

  private taskStatus(status: TaskStatus) {
    return ({ BACKLOG: 'В очереди', TODO: 'Запланирована', IN_PROGRESS: 'В работе', REVIEW: 'На проверке', DONE: 'Выполнена', OVERDUE: 'Просрочена', CANCELLED: 'В архиве' } as Record<TaskStatus, string>)[status];
  }
}
