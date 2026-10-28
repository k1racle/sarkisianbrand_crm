import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, TicketPriority, TicketSource, TicketStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { OperationalContext, withOperationalAccess } from '../common/operational-access';
import { CreateHelpdeskCommentDto, CreateHelpdeskTicketDto, PublicHelpdeskTicketDto, UpdateHelpdeskTicketDto } from './dto/helpdesk.dto';
import { NotificationsService } from '../notifications/notifications.service';

const person = { id: true, firstName: true, lastName: true, email: true } as const;
const mailKey = (commentId: string) => createHash('sha256').update(`helpdesk-reply:${commentId}`).digest('hex');
function commentIdFor(actor: string, ticketId: string, requestKey: string) {
  const hash = createHash('sha256').update(JSON.stringify(['helpdesk-reply:v1', actor, ticketId, requestKey.toLowerCase()])).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
const ticketSelect = {
  id: true, number: true, subject: true, description: true, source: true, status: true, priority: true, queue: true,
  requesterUserId: true, requesterUser: { select: person }, requesterName: true, requesterEmail: true,
  assignedToId: true, assignedTo: { select: person }, customerId: true, organizationId: true, orderId: true,
  organizationRef: true, affectedService: true, firstResponseDueAt: true, resolutionDueAt: true,
  resolvedAt: true, closedAt: true, createdAt: true, updatedAt: true,
  comments: { select: { id: true, body: true, isInternal: true, createdAt: true, author: { select: person } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.HelpdeskTicketSelect;

@Injectable()
export class HelpdeskService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess, @Optional() private readonly notifications?: NotificationsService) {}
  private run<T>(actor: string, write: boolean, action: (ctx: OperationalContext) => Promise<T>) {
    return withOperationalAccess(this.prisma, this.access, actor, 'helpdesk', write, action);
  }
  private where(ctx: OperationalContext): Prisma.HelpdeskTicketWhereInput {
    return { AND: [ctx.visible.tickets, ...(ctx.write ? [ctx.write.tickets('helpdesk.write')] : [])] };
  }
  private async views(ctx: OperationalContext, rows: any[]) {
    if (!rows.length) return [];
    const ids = (field: string) => [...new Set<string>(rows.map(row => row[field]).filter(Boolean))];
    const commentIds = [...new Set<string>(rows.flatMap(row => (row.comments || []).map((comment: any) => comment.id)))];
    const [customers, organizations, orders, writable, delivery] = await Promise.all([
      ctx.db.customer.findMany({ where: { AND: [ctx.visible.customers, { id: { in: ids('customerId') } }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, segment: true } }),
      ctx.db.organization.findMany({ where: { AND: [ctx.visible.organizations, { id: { in: ids('organizationId') } }] }, select: { id: true, name: true, inn: true } }),
      ctx.db.order.findMany({ where: { AND: [ctx.visible.orders, { id: { in: ids('orderId') } }] }, select: { id: true, orderNumber: true } }),
      ctx.read.allowed('helpdesk.write') ? (async () => {
        const write = ctx.write || await this.access.resolve(ctx.db, ctx.read.actorId, 'helpdesk.write');
        return ctx.db.helpdeskTicket.findMany({ where: { AND: [ctx.visible.tickets, write.tickets('helpdesk.write'), { id: { in: ids('id') } }] }, select: { id: true } });
      })() : [] as { id: string }[],
      commentIds.length ? ctx.db.mailOutbox.findMany({ where: { dedupeKey: { in: commentIds.map(mailKey) }, kind: 'HELPDESK_REPLY' }, select: { dedupeKey: true, status: true, sentAt: true } }) : [],
    ]);
    const deliveries = delivery as { dedupeKey: string; status: string; sentAt: Date | null }[];
    const byId = (items: any[], id: string) => items.find(item => item.id === id) || null;
    return rows.map(row => {
      const customer = byId(customers, row.customerId), organization = byId(organizations, row.organizationId), order = byId(orders, row.orderId);
      return { ...row, comments: (row.comments || []).map((comment: any) => { const mail = deliveries.find(item => item.dedupeKey === mailKey(comment.id)); return { ...comment, emailDelivery: mail ? { status: mail.status, sentAt: mail.sentAt } : null }; }), customer, organization, order, customerId: customer?.id || null, organizationId: organization?.id || null, orderId: order?.id || null,
        organizationRef: row.organizationId && !organization ? null : row.organizationRef, canWrite: writable.some(item => item.id === row.id) };
    });
  }
  private async card(ctx: OperationalContext, id: string) {
    const row = await ctx.db.helpdeskTicket.findFirst({ where: { AND: [this.where(ctx), { id }] }, select: ticketSelect });
    if (!row) throw new NotFoundException('Заявка не найдена или недоступна');
    return (await this.views(ctx, [row]))[0];
  }
  ticket(actor: string, id: string) { return this.run(actor, false, ctx => this.card(ctx, id)); }
  dashboard(actor: string) { return this.run(actor, false, async ctx => {
    const count = (filter: Prisma.HelpdeskTicketWhereInput = {}) => ctx.db.helpdeskTicket.count({ where: { AND: [ctx.visible.tickets, filter] } });
    const [total, fresh, inWork, waiting, overdue, resolved] = await Promise.all([
      count(), count({ status: 'NEW' }), count({ status: 'OPEN' }), count({ status: { in: ['WAITING_INTERNAL', 'WAITING_REQUESTER'] } }),
      count({ resolutionDueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } }), count({ status: { in: ['RESOLVED', 'CLOSED'] } }),
    ]);
    return { total, new: fresh, inWork, waiting, overdue, resolved };
  }); }
  tickets(actor: string, status?: TicketStatus, source?: TicketSource) { return this.run(actor, false, async ctx => {
    const rows = await ctx.db.helpdeskTicket.findMany({ where: { AND: [ctx.visible.tickets, { ...(status ? { status } : {}), ...(source ? { source } : {}) }] }, select: ticketSelect, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }] });
    return this.views(ctx, rows);
  }); }
  private dates(priority: TicketPriority = 'MEDIUM') {
    const now = new Date(), hours = priority === 'CRITICAL' ? [1, 4] : priority === 'HIGH' ? [2, 8] : priority === 'LOW' ? [8, 72] : [4, 24];
    return { number: 'HD-' + now.getFullYear() + '-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase(),
      firstResponseDueAt: new Date(now.getTime() + hours[0] * 3600000), resolutionDueAt: new Date(now.getTime() + hours[1] * 3600000) };
  }
  create(actor: string, dto: CreateHelpdeskTicketDto) { return this.run(actor, true, async ctx => {
    if (!dto.subject.trim() || !dto.description.trim() || dto.priority === null) throw new BadRequestException('Заполните тему, описание и приоритет');
    let customerId: string | undefined, organizationId: string | undefined;
    if (dto.orderId && !await ctx.db.order.findFirst({ where: { AND: [ctx.visible.orders, { id: dto.orderId }] }, select: { id: true } })) throw new NotFoundException('Заказ не найден или недоступен');
    if (dto.organizationRef) {
      const organization = await ctx.db.organization.findFirst({ where: { AND: [ctx.visible.organizations, { OR: [{ id: dto.organizationRef }, { inn: dto.organizationRef }] }] }, select: { id: true } });
      if (!organization) throw new NotFoundException('Организация не найдена или недоступна');
      organizationId = organization.id;
    }
    const normalizedEmail = dto.requesterEmail?.trim().toLowerCase();
    // Caller-supplied email is not proof of a customer identity. Only staff with
    // company customer read/write may use the existing automatic matching path.
    if (normalizedEmail && dto.source !== 'EMPLOYEE' && ctx.read.company('customers.read') && ctx.read.company('customers.write')) {
      const found = await ctx.db.customer.findFirst({ where: { AND: [ctx.visible.customers, { normalizedEmail }] }, select: { id: true } });
      if (found) customerId = found.id;
      else {
        const names = dto.requesterName?.trim().split(/\s+/) || [];
        customerId = (await ctx.db.customer.create({ data: { firstName: names.shift() || null, lastName: names.join(' ') || null, email: normalizedEmail, normalizedEmail, source: 'HELPDESK', segment: dto.source === 'B2B' ? 'B2B' : 'B2C', accountManagerId: actor, createdById: actor }, select: { id: true } })).id;
      }
    }
    const created = await ctx.db.helpdeskTicket.create({ data: { ...dto, subject: dto.subject.trim(), description: dto.description.trim(), ...this.dates(dto.priority), assignedToId: actor, requesterUserId: actor, customerId, organizationId }, select: { id: true } });
    const result = await this.card(ctx, created.id);
    await this.audit(ctx, created.id, 'Создана заявка');
    return result;
  }); }
  // Anonymous intake never resolves emails/IDs against private master data and
  // never accepts a staff source, assignment, priority or relation IDs.
  async createPublic(dto: PublicHelpdeskTicketDto) {
    if (!dto.subject.trim() || !dto.description.trim() || !dto.requesterEmail.trim()) throw new BadRequestException('Заполните тему, описание и email');
    if (dto.source && !['B2C', 'B2B'].includes(dto.source)) throw new BadRequestException('Недопустимый источник');
    const ticket = await this.prisma.helpdeskTicket.create({ data: { subject: dto.subject.trim(), description: dto.description.trim(), requesterName: dto.requesterName?.trim(), requesterEmail: dto.requesterEmail.trim().toLowerCase(), source: dto.source || 'B2C', priority: 'MEDIUM', ...this.dates() }, select: { number: true } });
    return { accepted: true, number: ticket.number };
  }
  update(actor: string, id: string, dto: UpdateHelpdeskTicketDto) { return this.run(actor, true, async ctx => {
    const before = await this.card(ctx, id);
    for (const key of ['status', 'priority', 'queue']) if (dto[key] === null) throw new BadRequestException('Обязательные поля нельзя очистить');
    if (dto.queue !== undefined && !dto.queue.trim()) throw new BadRequestException('Укажите очередь');
    if (dto.assignedToId === null) {
      if (!ctx.read.company('helpdesk.read') || !ctx.write!.company('helpdesk.write')) throw new ForbiddenException('Снять ответственного можно только с доступом ко всем заявкам');
    } else if (dto.assignedToId !== undefined) {
      const target = await ctx.db.user.findFirst({ where: { AND: [ctx.read.assignees(), ctx.write!.assignees(), { id: dto.assignedToId, role: { in: ['ADMIN', 'IT_SUPPORT', 'SUPERVISOR'] } }] }, select: { id: true } });
      if (!target) throw new ForbiddenException('Ответственный недоступен');
      await this.access.resolve(ctx.db, target.id, 'helpdesk.read');
      await this.access.resolve(ctx.db, target.id, 'helpdesk.write');
    }
    await ctx.db.$queryRaw`SELECT id FROM "HelpdeskTicket" WHERE id = ${id} FOR UPDATE`;
    await ctx.db.helpdeskTicket.update({ where: { id }, data: { ...dto, ...(dto.queue !== undefined ? { queue: dto.queue.trim() } : {}), ...(dto.status !== undefined ? { resolvedAt: ['RESOLVED', 'CLOSED'].includes(dto.status) ? before.resolvedAt || new Date() : null, closedAt: dto.status === 'CLOSED' ? new Date() : null } : {}) } });
    const result = await this.card(ctx, id); // Transfer beyond resulting read/write scope rolls back.
    await this.audit(ctx, id, 'Изменена заявка');
    return result;
  }); }
  addComment(actor: string, id: string, dto: CreateHelpdeskCommentDto) { return this.run(actor, true, async ctx => {
    await ctx.db.$queryRaw`SELECT id FROM "HelpdeskTicket" WHERE id = ${id} FOR UPDATE`;
    const ticket = await this.card(ctx, id);
    if (!dto.body.trim()) throw new BadRequestException('Введите комментарий');
    if (dto.sendEmail && (dto.isInternal || !dto.requestKey)) throw new BadRequestException('Для письма клиенту нужен отдельный запрос; внутренний комментарий отправить нельзя');
    const recipient = ticket.requesterEmail?.trim().toLowerCase();
    if (dto.sendEmail && (!recipient || !isEmail(recipient))) throw new BadRequestException('В заявке нет корректного email получателя');
    const commentId = dto.requestKey ? commentIdFor(actor, id, dto.requestKey) : randomUUID();
    if (dto.requestKey) {
      const previous = await ctx.db.helpdeskComment.findUnique({ where: { id: commentId }, select: { id: true, ticketId: true, authorId: true, body: true, isInternal: true, createdAt: true, author: { select: person } } });
      if (previous) {
        const mail = await ctx.db.mailOutbox.findUnique({ where: { dedupeKey: mailKey(commentId) }, select: { status: true, sentAt: true } });
        if (previous.ticketId !== id || previous.authorId !== actor || previous.body !== dto.body.trim() || previous.isInternal !== Boolean(dto.isInternal) || Boolean(mail) !== Boolean(dto.sendEmail)) throw new ConflictException('Этот запрос уже использован с другим содержимым');
        const { ticketId: _ticketId, authorId: _authorId, ...safe } = previous;
        return { ...safe, emailDelivery: mail || null };
      }
    }
    const comment = await ctx.db.helpdeskComment.create({ data: { id: commentId, ticketId: id, authorId: actor, body: dto.body.trim(), isInternal: dto.isInternal || false }, select: { id: true, body: true, isInternal: true, createdAt: true, author: { select: person } } });
    let emailDelivery: { status: string; sentAt: Date | null } | null = null;
    if (dto.sendEmail) {
      if (!this.notifications) throw new BadRequestException('Очередь писем недоступна');
      const data = this.notifications.prepare({ kind: 'HELPDESK_REPLY', recipient, subject: `Ответ на обращение ${ticket.number}`, text: dto.body.trim(), dedupeKey: `helpdesk-reply:${comment.id}`, helpdeskCommentId: comment.id, helpdeskTicketId: id });
      const mail = await ctx.db.mailOutbox.create({ data, select: { status: true, sentAt: true } });
      emailDelivery = mail;
    }
    await this.audit(ctx, id, 'Добавлен комментарий');
    return { ...comment, emailDelivery };
  }); }
  agents(actor: string) { return this.run(actor, false, async ctx => {
    if (!ctx.read.allowed('helpdesk.write')) return [];
    const write = await this.access.resolve(ctx.db, actor, 'helpdesk.write');
    return ctx.db.user.findMany({ where: { AND: [ctx.read.assignees(), write.assignees(), { role: { in: ['ADMIN', 'IT_SUPPORT', 'SUPERVISOR'] } }] }, select: person, orderBy: [{ firstName: 'asc' }, { id: 'asc' }] });
  }); }
  private audit(ctx: OperationalContext, id: string, action: string) {
    return ctx.db.auditLog.create({ data: { actorId: ctx.read.actorId, resource: 'helpdesk', resourceId: id, action } });
  }
}
