import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from '../crm/read-access';
import { customerVisibility } from '../customer360/customer-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';

const permissions = { TASK: 'crm.read', STAGE: 'crm.read', CUSTOMER: 'customers.read', PRODUCT: 'catalog.read' } as const;
type RecordType = keyof typeof permissions;
type Card = { id: string; type: string; title: string; subtitle: string; url: string; color?: string };
const personSelect = { id: true, firstName: true, lastName: true };
const messageInclude = { attachments: true, author: { select: personSelect }, replyTo: { include: { attachments: true, author: { select: personSelect } } } } satisfies Prisma.CrmChatMessageInclude;

/** Live, recipient-specific references. Stored attachment metadata is never an authority. */
@Injectable()
export class ChatRecordsService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  private type(value: string): RecordType {
    if (!Object.prototype.hasOwnProperty.call(permissions, value)) throw new BadRequestException('Неизвестный тип карточки');
    return value as RecordType;
  }
  private async read<T>(actor: string, action: (db: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async db => {
      const user = actor && await db.user.findUnique({ where: { id: actor }, select: { isActive: true, role: true } });
      if (!user || !user.isActive || !internalWorkspaceRoles.includes(user.role)) throw new ForbiddenException('Чат доступен только действующим сотрудникам');
      return action(db);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }
  assertStaff(actor: string) { return this.read(actor, async () => undefined); }
  private channelWhere(actor: string): Prisma.CrmChatChannelWhereInput {
    return { isArchived: false, OR: [{ type: 'TEAM' }, { createdById: actor }, { members: { some: { userId: actor } } }] };
  }
  async search(value: string, search: string, actor: string, entityId?: string) {
    const type = this.type(value);
    if (typeof search !== 'string' || search.length > 120) throw new BadRequestException('Поиск: не более 120 символов');
    return this.read(actor, async db => this.lookup(db, await this.access.resolve(db, actor, permissions[type]), type, search.trim(), entityId ? [entityId] : undefined));
  }
  private async lookup(db: Prisma.TransactionClient, policy: CrmReadPolicy, type: RecordType, query = '', ids?: string[]): Promise<Card[]> {
    const identity = ids ? { id: { in: ids } } : {};
    const limit = ids ? ids.length : 20;
    if (type === 'PRODUCT') {
      // Catalog has no record owner/department contract yet; do not turn OWN into COMPANY.
      if (!policy.company('catalog.read')) return [];
      const trash = await db.dataTrashEntry.findMany({ where: { entityType: 'PRODUCT', status: 'TRASHED' }, select: { entityId: true } });
      const rows = await db.product.findMany({ where: { AND: [identity, { id: { notIn: trash.map(row => row.entityId) } }], isActive: true, ...(query ? { OR: [{ nameRu: { contains: query, mode: 'insensitive' } }, { sku: { contains: query, mode: 'insensitive' } }] } : {}) }, select: { id: true, nameRu: true, sku: true, slug: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: limit });
      return rows.map(row => ({ id: row.id, type, title: row.nameRu, subtitle: row.sku, url: '/catalog/' + encodeURIComponent(row.slug) }));
    }
    const visible = await customerVisibility(db, policy);
    if (type === 'TASK') {
      const rows = await db.task.findMany({ where: { AND: [visible.tasks, identity], ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] } : {}) }, select: { id: true, title: true, status: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: limit });
      const labels = { BACKLOG: 'В очереди', TODO: 'Запланирована', IN_PROGRESS: 'В работе', REVIEW: 'На проверке', DONE: 'Выполнена', OVERDUE: 'Просрочена' };
      return rows.map(row => ({ id: row.id, type, title: row.title, subtitle: labels[row.status] || 'Задача', url: '/crm/tasks?task=' + encodeURIComponent(row.id) }));
    }
    if (type === 'CUSTOMER') {
      const rows = await db.customer.findMany({ where: { AND: [visible.customers, identity], status: { not: 'ARCHIVED' }, ...(query ? { OR: ['firstName', 'lastName', 'email', 'phone'].map(key => ({ [key]: { contains: query, mode: 'insensitive' } })) } : {}) }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: limit });
      return rows.map(row => ({ id: row.id, type, title: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Клиент', subtitle: 'Карточка клиента', url: '/crm/customers' }));
    }
    const rows = await db.crmPipelineStage.findMany({ where: { ...identity, pipeline: { isActive: true }, ...(policy.company('crm.read') ? {} : { leads: { some: visible.leads } }), ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}) }, select: { id: true, name: true, color: true, pipeline: { select: { name: true } }, _count: { select: { leads: { where: visible.leads } } } }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: limit });
    return rows.map(row => ({ id: row.id, type, title: row.name, subtitle: `${row.pipeline.name} · Сделок в доступной области: ${row._count.leads}`, url: '/crm/pipeline', color: /^#[\da-f]{6}$/i.test(row.color) ? row.color : undefined }));
  }

  async resolve(entities: Array<{ type: string; id: string }>, actor: string) {
    if (!Array.isArray(entities) || entities.length > 8 || entities.some(item => !item || !isUUID(item.id))) throw new BadRequestException('Можно прикрепить до 8 корректных карточек');
    entities.forEach(item => this.type(item.type));
    return this.read(actor, async db => {
      const result: Array<{ kind: 'ENTITY'; name: string; entityType: string; entityId: string }> = [];
      for (const type of Object.keys(permissions) as RecordType[]) {
        const ids = [...new Set(entities.filter(item => item.type === type).map(item => item.id))];
        if (!ids.length) continue;
        const policy = await this.access.resolve(db, actor, permissions[type]);
        const cards = await this.lookup(db, policy, type, '', ids);
        if (ids.some(id => !cards.some(card => card.id === id))) throw new NotFoundException('Прикреплённая карточка не найдена или недоступна');
        // No title, description, amount, contact details or URL snapshot in new messages.
        result.push(...ids.map(id => ({ kind: 'ENTITY' as const, name: 'Карточка CRM', entityType: type, entityId: id })));
      }
      return result;
    });
  }

  private async project(db: Prisma.TransactionClient, actor: string, messages: any[]) {
    const refs = messages.flatMap(message => [...(message.attachments || []), ...(message.replyTo?.channelId === message.channelId && !message.replyTo?.deletedAt ? message.replyTo.attachments || [] : [])]).filter(item => item.kind === 'ENTITY');
    const cards = new Map<string, Card>();
    for (const type of Object.keys(permissions) as RecordType[]) {
      const ids: string[] = [...new Set<string>(refs.filter(item => item.entityType === type && typeof item.entityId === 'string').map(item => item.entityId))];
      if (!ids.length) continue;
      let policy: CrmReadPolicy;
      try { policy = await this.access.resolve(db, actor, permissions[type]); }
      catch (error) { if (error instanceof ForbiddenException) continue; throw error; }
      for (const card of await this.lookup(db, policy, type, '', ids)) cards.set(`${type}:${card.id}`, card);
    }
    const attachments = (items: any[] = []) => items.map(item => {
      if (item.kind !== 'ENTITY') return { id: item.id, kind: item.kind, name: item.name, mimeType: item.mimeType, size: item.size };
      const card = cards.get(`${item.entityType}:${item.entityId}`);
      if (!card) return { id: item.id, kind: 'ENTITY', name: 'Карточка недоступна', restricted: true, entityType: null, entityId: null, metadata: null };
      return { id: item.id, kind: 'ENTITY', name: card.title, restricted: false, entityType: card.type, entityId: card.id, metadata: { subtitle: card.subtitle, url: card.url, color: card.color } };
    });
    const person = (row: any) => row ? { id: row.id, firstName: row.firstName, lastName: row.lastName } : null;
    return messages.map(message => {
      const reply = message.replyTo?.channelId === message.channelId && !message.replyTo?.deletedAt ? message.replyTo : null;
      return { id: message.id, channelId: message.channelId, authorId: message.authorId, body: message.body, createdAt: message.createdAt, editedAt: message.editedAt, author: person(message.author), attachments: attachments(message.attachments), replyToId: reply?.id || null,
        replyTo: reply ? { id: reply.id, body: reply.body, author: person(reply.author), attachments: attachments(reply.attachments) } : null };
    });
  }

  messages(channelId: string, actor: string) { return this.read(actor, async db => {
    if (!await db.crmChatChannel.findFirst({ where: { id: channelId, ...this.channelWhere(actor) }, select: { id: true } })) throw new NotFoundException('Канал не найден или недоступен');
    const rows = await db.crmChatMessage.findMany({ where: { channelId, deletedAt: null }, include: messageInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 });
    return this.project(db, actor, rows.reverse());
  }); }
  message(id: string, channelId: string, actor: string) { return this.read(actor, async db => {
    const row = await db.crmChatMessage.findFirst({ where: { id, channelId, deletedAt: null, channel: this.channelWhere(actor) }, include: messageInclude });
    return row ? (await this.project(db, actor, [row]))[0] : null;
  }); }
  channels(actor: string, id?: string) { return this.read(actor, async db => {
    const rows = await db.crmChatChannel.findMany({ where: { ...this.channelWhere(actor), ...(id ? { id } : {}) }, include: {
      members: { select: { userId: true, role: true, lastReadAt: true, user: { select: personSelect } } },
      messages: { where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: messageInclude },
      _count: { select: { messages: { where: { deletedAt: null } } } },
    }, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    const messages = new Map((await this.project(db, actor, rows.flatMap(row => row.messages))).map(row => [row.id, row]));
    return Promise.all(rows.map(async row => {
      const lastReadAt = row.members.find(member => member.userId === actor)?.lastReadAt;
      const unread = await db.crmChatMessage.count({ where: { channelId: row.id, deletedAt: null, authorId: { not: actor }, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) } });
      return { ...row, messages: row.messages.map(message => messages.get(message.id)), unread };
    }));
  }); }
}
