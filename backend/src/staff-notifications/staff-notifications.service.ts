import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { AccessDecision, orderScopeWhere, taskScopeWhere, ticketScopeWhere } from '../auth/access-scope-policy';
import { NotificationPreferencesDto, NotificationQueryDto } from './staff-notifications.dto';

export function notificationVisibility(actor: { id: string; role: string; accessProfileMode?: boolean }, decisions: AccessDecision[], trash: { entityType: string; entityId: string }[]): Prisma.CrmNotificationEventWhereInput {
  const id = actor.id, live = (type: string) => ({ id: { notIn: trash.filter(r => r.entityType === type).map(r => r.entityId) } });
  const taskRoles = ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE'];
  const orderRoles = [...taskRoles, 'MARKETPLACE_MANAGER', 'WAREHOUSE'];
  const ticketRoles = ['ADMIN', 'IT_SUPPORT', 'SUPERVISOR', 'EXECUTIVE'];
  const task = { AND: [taskRoles.includes(actor.role) ? taskScopeWhere(decisions, 'crm.read') : { id: { in: [] } }, live('TASK')] };
  const ticket = { AND: [ticketRoles.includes(actor.role) ? ticketScopeWhere(decisions, 'helpdesk.read') : { id: { in: [] } }, live('HELPDESK_TICKET')] };
  const crm = decisions.find(d => d.permissionKey === 'crm.read' && d.allowed && !d.denied);
  // Contact inbox uses the same company-only boundary as its existing controller.
  const contacts = ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR'].includes(actor.role) && !!crm && (!actor.accessProfileMode || crm.grants.some(g => g.allowed && g.effectiveScope === 'COMPANY'));
  return { AND: [
    { OR: [{ actorId: null }, { actorId: { not: id } }] },
    { OR: [{ recipientId: null }, { recipientId: id }] },
    { OR: [
      { category: 'CHAT', message: { deletedAt: null, authorId: { not: id }, channel: { isArchived: false,
        AND: [{ OR: [{ type: 'TEAM' }, { createdById: id }, { members: { some: { userId: id } } }] }, { members: { none: { userId: id, isMuted: true } } }] } } },
      { kind: { in: ['TASK_CREATED', 'TASK_ASSIGNED'] }, task: { AND: [task, { assignedToId: id }] } },
      { kind: { in: ['TASK_COMMENT', 'TASK_STATUS'] }, task: { AND: [task, { OR: [{ assignedToId: id }, { createdById: id }] }] } },
      { kind: 'TASK_REMINDER', reminder: { recipientId: id, dismissedAt: null, task: { AND: [task, { status: { notIn: ['DONE', 'CANCELLED'] } }] } } },
      { category: 'ORDER', order: orderRoles.includes(actor.role) ? orderScopeWhere(decisions, 'oms.read') : { id: { in: [] } } },
      { kind: { in: ['TICKET_CREATED', 'TICKET_ASSIGNED'] }, ticket },
      { kind: 'TICKET_COMMENT', ticket: { AND: [ticket, { OR: [{ assignedToId: id }, { requesterUserId: id }] }] } },
      ...(contacts ? [{ kind: 'CONTACT_CREATED', contact: { isNot: null } }] : []),
    ] },
  ] };
}

const titles: Record<string, string> = {
  CHAT_MESSAGE: 'Новое сообщение', TASK_CREATED: 'Новая задача', TASK_ASSIGNED: 'Вам назначена задача', TASK_COMMENT: 'Комментарий к задаче', TASK_STATUS: 'Изменён статус задачи', TASK_REMINDER: 'Напоминание о задаче',
  ORDER_CREATED: 'Новый заказ', ORDER_ASSIGNED: 'Вам назначен заказ', ORDER_STATUS: 'Изменён статус заказа', TICKET_CREATED: 'Новое обращение', TICKET_ASSIGNED: 'Вам назначено обращение', TICKET_COMMENT: 'Ответ в обращении', CONTACT_CREATED: 'Сообщение с сайта',
};
const select = (actor: string) => ({
  id: true, kind: true, category: true, occurredAt: true,
  reads: { where: { userId: actor }, select: { readAt: true }, take: 1 },
  task: { select: { id: true, title: true } }, order: { select: { id: true, orderNumber: true, source: true } },
  ticket: { select: { id: true, number: true, subject: true } }, contact: { select: { id: true, name: true } },
  reminder: { select: { task: { select: { id: true, title: true } } } },
  message: { select: { channelId: true, body: true, channel: { select: { name: true, directKey: true } }, author: { select: { firstName: true, lastName: true } } } },
}) satisfies Prisma.CrmNotificationEventSelect;

export function notificationView(row: any) {
  let title = titles[row.kind] || 'Уведомление', body = '', url = '', channelId: string | undefined;
  const task = row.task || row.reminder?.task;
  if (task) { body = task.title; url = '/crm/tasks?task=' + encodeURIComponent(task.id); }
  if (row.order) { body = row.order.orderNumber + ' · ' + ({ WEB: 'Сайт', B2B: 'B2B', WILDBERRIES: 'Wildberries', OZON: 'Ozon', YANDEX_MARKET: 'Яндекс Маркет', MEGAMARKET: 'Мегамаркет' }[row.order.source] || row.order.source); url = '/crm/fulfillment?order=' + encodeURIComponent(row.order.id); }
  if (row.ticket) { body = row.ticket.number + ' · ' + row.ticket.subject; url = '/crm/support/tickets?ticket=' + encodeURIComponent(row.ticket.id); }
  if (row.contact) { body = row.contact.name; url = '/crm/messages?message=' + encodeURIComponent(row.contact.id); }
  if (row.message) {
    const author = [row.message.author?.firstName, row.message.author?.lastName].filter(Boolean).join(' ') || 'Сотрудник';
    title = row.message.channel.directKey ? author : row.message.channel.name;
    body = (row.message.channel.directKey ? '' : author + ': ') + (row.message.body || 'Вложение');
    channelId = row.message.channelId;
  }
  return { id: row.id, category: row.category, kind: row.kind, title, body: body.slice(0, 200), createdAt: row.occurredAt, read: row.reads.length > 0, url, ...(channelId ? { channelId } : {}) };
}

@Injectable()
export class StaffNotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  private async context(db: Prisma.TransactionClient, id: string) {
    const actor = await db.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true, departmentId: true, accessProfileMode: true } });
    if (!actor?.isActive || !internalWorkspaceRoles.includes(actor.role)) throw new ForbiddenException('Уведомления доступны только сотрудникам');
    const [roles, overrides, trash, preferences] = await Promise.all([
      db.rolePermission.findMany({ where: { role: actor.role }, select: { permission: { select: { key: true } } } }),
      db.userPermission.findMany({ where: { userId: id }, select: { effect: true, permission: { select: { key: true } } } }),
      db.dataTrashEntry.findMany({ where: { entityType: { in: ['TASK', 'HELPDESK_TICKET'] }, status: 'TRASHED' }, select: { entityType: true, entityId: true } }),
      db.crmNotificationPreference.findUnique({ where: { userId: id } }),
    ]);
    const { decisions } = await employeeAccess(db, actor, roles, overrides);
    const now = new Date();
    const visible: Prisma.CrmNotificationEventWhereInput = { AND: [notificationVisibility(actor, decisions, trash), { occurredAt: { lte: now } }] };
    const unread: Prisma.CrmNotificationEventWhereInput = { AND: [visible, { reads: { none: { userId: id } } }] };
    return { visible, unread, now, popupsEnabled: preferences?.popupsEnabled ?? true };
  }
  private run<T>(fn: (db: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }); }

  list(actor: string, query: NotificationQueryDto) { return this.run(async db => {
    const ctx = await this.context(db, actor), where: Prisma.CrmNotificationEventWhereInput[] = [query.unread === 'true' ? ctx.unread : ctx.visible];
    if (query.category && query.category !== 'ALL') where.push({ category: query.category });
    if (query.cursor) {
      const [at, id, extra] = query.cursor.split('|'), date = new Date(at);
      if (extra || !id || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(date.getTime())) throw new BadRequestException('Некорректная страница уведомлений');
      where.push({ OR: [{ occurredAt: { lt: date } }, { occurredAt: date, id: { lt: id } }] });
    }
    const [rows, unreadCount, fresh] = await Promise.all([
      db.crmNotificationEvent.findMany({ where: { AND: where }, select: select(actor), orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 41 }),
      db.crmNotificationEvent.count({ where: ctx.unread }),
      db.crmNotificationEvent.findMany({ where: ctx.unread, select: select(actor), orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 10 }),
    ]);
    const items = rows.slice(0, 40), last = items.at(-1);
    return { items: items.map(row => notificationView(row)), fresh: fresh.map(row => notificationView(row)), unreadCount,
      nextCursor: rows.length > 40 && last ? last.occurredAt.toISOString() + '|' + last.id : null, through: ctx.now.toISOString(), popupsEnabled: ctx.popupsEnabled };
  }); }

  // Re-resolve before navigating: an old open dropdown must not reuse revoked content.
  detail(actor: string, id: string) { return this.run(async db => {
    const ctx = await this.context(db, actor);
    const row = await db.crmNotificationEvent.findFirst({ where: { AND: [ctx.visible, { id }] }, select: select(actor) });
    if (!row) throw new NotFoundException('Уведомление больше недоступно');
    return notificationView(row);
  }); }
  read(actor: string, id: string) { return this.run(async db => {
    const ctx = await this.context(db, actor);
    if (!await db.crmNotificationEvent.findFirst({ where: { AND: [ctx.visible, { id }] }, select: { id: true } })) throw new NotFoundException('Уведомление больше недоступно');
    await db.crmNotificationRead.upsert({ where: { userId_eventId: { userId: actor, eventId: id } }, create: { userId: actor, eventId: id }, update: {} });
    return { success: true };
  }); }
  readAll(actor: string, through: string) { return this.run(async db => {
    const ctx = await this.context(db, actor), cutoff = new Date(through);
    if (!Number.isFinite(cutoff.getTime()) || cutoff > ctx.now || cutoff < new Date(0)) throw new BadRequestException('Некорректное время прочтения');
    // Only committed, visible events in this snapshot are marked. A late commit
    // with an earlier event timestamp must still arrive unread afterwards.
    for (;;) {
      const rows = await db.crmNotificationEvent.findMany({ where: { AND: [ctx.unread, { occurredAt: { lte: cutoff } }] }, select: { id: true }, take: 1000 });
      if (!rows.length) break;
      await db.crmNotificationRead.createMany({ data: rows.map(row => ({ userId: actor, eventId: row.id })), skipDuplicates: true });
      if (rows.length < 1000) break;
    }
    return { success: true };
  }); }
  preferences(actor: string, dto: NotificationPreferencesDto) { return this.run(async db => {
    await this.context(db, actor);
    return db.crmNotificationPreference.upsert({ where: { userId: actor }, create: { userId: actor, popupsEnabled: dto.popupsEnabled }, update: { popupsEnabled: dto.popupsEnabled }, select: { popupsEnabled: true } });
  }); }
}
