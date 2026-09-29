import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { CrmReadService } from './crm-read.service';
import { CrmService } from './crm.service';
import { CreateInteractionDto, CreateLeadDto, UpdateLeadDto } from './dto/crm.dto';
import { customerVisibility } from '../customer360/customer-access';

type Context = { db: Prisma.TransactionClient; read: CrmReadPolicy; write: CrmReadPolicy; core: CrmService; reader: CrmReadService };

/** HTTP deal mutation boundary. Draft scope assignments are still disabled at runtime. */
@Injectable()
export class CrmLeadWriteService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  private async run<T>(actorId: string, operation: (ctx: Context) => Promise<T>) {
    try {
      return await this.prisma.$transaction(async db => {
        // Department edits and other CRM mutations take this lock first, in the same order.
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73422111)`;
        const read = await this.access.resolve(db, actorId, 'crm.read');
        const write = await this.access.resolve(db, actorId, 'crm.write');
        const bound = new Proxy(db, { get(target, key) {
          if (key === '$transaction') return (action: any) => typeof action === 'function' ? action(db) : Promise.all(action);
          const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
        } }) as unknown as PrismaService;
        return operation({ db, read, write, core: new CrmService(bound), reader: new CrmReadService(bound, this.access) });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error) {
      if ((error as any)?.code === 'P2034') throw new ConflictException('Данные изменились во время сохранения. Обновите карточку и повторите действие.');
      throw error;
    }
  }

  private async lead(ctx: Context, id: string) {
    const lead = await ctx.db.lead.findFirst({ where: { AND: [{ id }, ctx.read.leads(), ctx.write.leads('crm.write')] } });
    if (!lead) throw new NotFoundException('Сделка не найдена или недоступна для изменения');
    return lead;
  }

  private async manager(ctx: Context, id: string) {
    if (!await ctx.db.user.findFirst({ where: { AND: [{ id }, ctx.write.assignees()] }, select: { id: true } })) {
      throw new ForbiddenException('Нельзя назначить сделку этому сотруднику в вашей области доступа');
    }
  }

  private validate(dto: CreateLeadDto | UpdateLeadDto) {
    // IsOptional permits null: do not let it clear ownership/stage or reach non-null DB columns.
    const nullable = new Set(['title', 'customerId', 'organizationId', 'contactEmail', 'message', 'expectedCloseAt', 'nextContactAt', 'lostReason']);
    for (const [key, value] of Object.entries(dto)) {
      if (value === null && !nullable.has(key)) throw new BadRequestException('Обязательные поля сделки нельзя очистить');
    }
    for (const field of ['source', 'contactName'] as const) {
      if (dto[field] !== undefined && !dto[field]?.trim()) throw new BadRequestException('Источник и имя контакта не могут быть пустыми');
    }
  }

  private async references(ctx: Context, dto: CreateLeadDto | UpdateLeadDto) {
    if (dto.customerId === undefined && dto.organizationId === undefined) return;
    if (!ctx.read.allowed('customers.read')) throw new ForbiddenException('Связанная запись недоступна');
    const visible = await customerVisibility(ctx.db, ctx.read);
    // Explicit selection and automatic matching use the same domain boundary.
    for (const [field, model] of [['customerId', 'customer'], ['organizationId', 'organization']] as const) {
      if (dto[field] === undefined) continue;
      const id = dto[field];
      if (!id) continue;
      const reference = model === 'customer'
        ? await ctx.db.customer.findFirst({ where: { AND: [{ id }, visible.customers] }, select: { id: true } })
        : await ctx.db.organization.findFirst({ where: { AND: [{ id }, visible.organizations] }, select: { id: true } });
      if (!reference) throw new ForbiddenException('Связанная запись недоступна');
    }
  }

  private async customer(ctx: Context, dto: CreateLeadDto): Promise<string | null> {
    if (dto.customerId !== undefined) return dto.customerId || null; // Explicit selection/clear already validated.
    // A deal can contain its own contact details without searching or changing the customer master.
    if (!ctx.read.company('customers.read')) return null;
    const normalizedEmail = dto.contactEmail?.trim().toLowerCase() || null;
    const normalizedPhone = dto.contactPhone?.replace(/\D/g, '') || null;
    const conditions: Prisma.CustomerWhereInput[] = [];
    if (normalizedEmail) conditions.push({ normalizedEmail });
    if (normalizedPhone) conditions.push({ normalizedPhone });
    if (conditions.length) {
      const visible = await customerVisibility(ctx.db, ctx.read);
      const matches = await ctx.db.customer.findMany({ where: { AND: [visible.customers, { OR: conditions }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true }, take: 10, orderBy: { id: 'asc' } });
      if (matches.length > 1) throw new ConflictException({ code: 'CRM_CUSTOMER_MATCH_AMBIGUOUS', message: 'Контактные данные совпадают с несколькими клиентами. Выберите клиента или уточните контакты.', candidates: matches });
      if (matches.length === 1) return matches[0].id;
    }
    if (!ctx.write.company('customers.write')) return null;
    const names = dto.contactName.trim().split(/\s+/);
    const customer = await ctx.db.customer.create({ data: {
      firstName: names.shift(), lastName: names.join(' ') || null, email: dto.contactEmail, phone: dto.contactPhone,
      normalizedEmail, normalizedPhone, segment: 'Лид', source: dto.source,
      accountManagerId: dto.managerId || ctx.write.actorId, createdById: ctx.write.actorId,
    }, select: { id: true } });
    return customer.id;
  }

  create(actorId: string, dto: CreateLeadDto) {
    // The create form may leave the optional title blank: the core supplies a contact-based title.
    dto = { ...dto, title: dto.title?.trim() || undefined };
    return this.run(actorId, async ctx => {
      this.validate(dto);
      await this.manager(ctx, dto.managerId || actorId);
      await this.references(ctx, dto);
      const customerId = await this.customer(ctx, dto);
      const lead = await ctx.core.createLead({ ...dto, managerId: dto.managerId || actorId }, actorId, {
        customerId, compact: true, initializePipeline: ctx.write.company('crm.write'),
      });
      await this.lead(ctx, lead.id); // Includes resulting ownership, not just the requested manager.
      return ctx.reader.lead(actorId, lead.id);
    });
  }

  update(actorId: string, id: string, dto: UpdateLeadDto) {
    return this.run(actorId, async ctx => {
      await this.lead(ctx, id);
      this.validate(dto);
      if (dto.managerId !== undefined) await this.manager(ctx, dto.managerId);
      await this.references(ctx, dto);
      await ctx.core.updateLead(id, dto, actorId, true);
      await this.lead(ctx, id);
      return ctx.reader.lead(actorId, id);
    });
  }

  interaction(actorId: string, id: string, dto: CreateInteractionDto) {
    return this.run(actorId, async ctx => {
      const lead = await this.lead(ctx, id);
      if (!dto.type?.trim() || !dto.content?.trim()) throw new BadRequestException('Укажите тип и текст взаимодействия');
      if (['CREATED', 'STAGE_CHANGED'].includes(dto.type.trim().toUpperCase())) throw new BadRequestException('Системные события сделки создаются автоматически');
      if (dto.customerId != null) {
        if (!ctx.read.allowed('customers.read') || dto.customerId !== lead.customerId) throw new ForbiddenException('Взаимодействие можно связать только с доступным клиентом этой сделки');
        const visible = await customerVisibility(ctx.db, ctx.read);
        if (!await ctx.db.customer.findFirst({ where: { AND: [{ id: dto.customerId }, visible.customers] }, select: { id: true } })) throw new ForbiddenException('Связанная запись недоступна');
      }
      // Caller cannot redirect the note to an unrelated customer's timeline.
      const result = await ctx.core.addInteraction(id, { type: dto.type.trim(), content: dto.content.trim() }, actorId);
      return { id: result.id, type: result.type, content: result.content, createdAt: result.createdAt, user: result.user };
    });
  }
}
