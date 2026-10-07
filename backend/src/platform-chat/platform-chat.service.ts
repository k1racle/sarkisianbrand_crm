import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmChatType, PlatformChatAttachmentKind, Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformChannelDto, CreatePlatformMessageDto, PlatformEntityAttachmentDto } from './dto/platform-chat.dto';
import { PlatformChatGateway } from './platform-chat.gateway';
import { ChatRecordsService } from './chat-records.service';

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
  constructor(private readonly prisma: PrismaService, private readonly realtime: PlatformChatGateway, private readonly records: ChatRecordsService) {}

  team() {
    return this.prisma.user.findMany({
      where: { role: { in: internalRoles }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: 'asc' }, { email: 'asc' }],
    });
  }

  async channels(userId: string) {
    await this.records.assertStaff(userId);
    await this.ensureDefaultChannels(userId);
    return this.records.channels(userId);
  }

  async unread(userId: string) {
    const channels = await this.channels(userId);
    return { total: channels.reduce((sum, channel) => sum + channel.unread, 0), channels: channels.map(channel => ({ id: channel.id, unread: channel.unread })) };
  }

  async createChannel(dto: CreatePlatformChannelDto, actorId: string) {
    await this.records.assertStaff(actorId);
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
    return (await this.records.channels(actorId, channel.id))[0];
  }

  async openDirect(actorId:string,peerId:string){
    await this.records.assertStaff(actorId);
    if(actorId===peerId)throw new BadRequestException('Выберите другого сотрудника');
    const memberIds=[actorId,peerId].sort(),directKey=memberIds.join(':');
    const channel=await this.prisma.$transaction(async db=>{
      const count=await db.user.count({where:{id:{in:memberIds},role:{in:internalRoles},isActive:true}});
      if(count!==2)throw new BadRequestException('Сотрудник недоступен для личного диалога');
      return db.crmChatChannel.upsert({where:{directKey},update:{},create:{directKey,name:'Личный диалог '+randomUUID(),type:CrmChatType.PRIVATE,createdById:actorId,members:{create:memberIds.map(userId=>({userId,role:'MEMBER'}))}}});
    }).catch(async error=>{
      // Concurrent opens of the same pair must converge to the one unique channel.
      if(!(error instanceof Prisma.PrismaClientKnownRequestError)||error.code!=='P2002')throw error;
      const existing=await this.prisma.crmChatChannel.findUnique({where:{directKey}});if(!existing)throw error;return existing;
    });
    if(channel.isArchived)throw new ConflictException('Диалог находится в архиве');
    await this.realtime.publishChannel(channel);
    return (await this.records.channels(actorId,channel.id))[0];
  }

  async messages(channelId: string, userId: string, before?:string) {
    const rows = await this.records.messages(channelId, userId, before);
    if(!before)await this.markRead(channelId, userId);
    return rows;
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
    return this.records.message(message.id, channelId, userId);
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
    let message: any;
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
      message = await this.prisma.crmChatMessage.create({
        data: { channelId, authorId: userId, body: body?.trim() || '', replyToId, attachments: { create: [...stored.map(item => item.attachment), ...entityAttachments] } },
        include: { attachments: true, author: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
    } catch (error) {
      await Promise.all(stored.map(item => unlink(item.path).catch(() => undefined)));
      throw error;
    }
    // Delivery/read failures must not delete files of an already persisted message.
    await this.realtime.publishMessage(message);
    return this.records.message(message.id, channelId, userId);
  }

  async attachment(id: string, userId: string) {
    const attachment = await this.prisma.platformChatAttachment.findUnique({ where: { id }, include: { message: { select: { channelId: true, deletedAt: true } } } });
    if (!attachment?.storageKey || attachment.kind === 'ENTITY' || attachment.message.deletedAt) throw new NotFoundException('Вложение не найдено');
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

  searchEntities(type: string, search = '', userId: string, entityId?: string) {
    return this.records.search(type, search, userId, entityId);
  }

  private resolveEntities(entities: PlatformEntityAttachmentDto[], userId: string) {
    return this.records.resolve(entities, userId);
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

}
