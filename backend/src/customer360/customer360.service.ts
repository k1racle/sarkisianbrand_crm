import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, OrganizationStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess, CrmReadPolicy } from '../crm/read-access';
import { partnerBusinessActivated } from '../partners/partner-lifecycle';
import { customerVisibility } from './customer-access';
import { AddOrganizationMemberDto, CreateOrganizationDto, UpdateCustomerDto, UpdateOrganizationDto } from './dto/customer360.dto';

const person = { id: true, firstName: true, lastName: true, email: true } as const;
const customerSelect = { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, segment: true, source: true, accountManagerId: true, createdById: true, accountManager: { select: person }, createdAt: true, updatedAt: true } as const;
const organizationSelect = { id: true, name: true, legalName: true, inn: true, kpp: true, legalAddress: true, status: true, discountTier: true, creditLimit: true, accountManagerId: true, createdById: true, accountManager: { select: person }, createdAt: true, updatedAt: true } as const;
const orderSelect = { id: true, orderNumber: true, externalOrderId: true, source: true, status: true, finalAmount: true, createdAt: true } as const;
const leadSelect = { id: true, title: true, contactName: true, status: true, amount: true, createdAt: true, manager: { select: person } } as const;
const ticketSelect = { id: true, number: true, subject: true, status: true, priority: true, createdAt: true } as const;
type Visibility = Awaited<ReturnType<typeof customerVisibility>>;
type Context = { db: Prisma.TransactionClient; read: CrmReadPolicy; write?: CrmReadPolicy; visible: Visibility };
const externalRoles = [UserRole.CUSTOMER_B2C, UserRole.CUSTOMER_B2B];

@Injectable()
export class Customer360Service {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  private async run<T>(actor: string, mutation: boolean, fn: (ctx: Context) => Promise<T>) {
    try {
      return await this.prisma.$transaction(async db => {
        if (mutation) {
          await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
          await db.$executeRaw`SELECT pg_advisory_xact_lock(73422113)`;
        }
        const read = await this.access.resolve(db, actor, 'customers.read');
        const write = mutation ? await this.access.resolve(db, actor, 'customers.write') : undefined;
        return fn({ db, read, write, visible: await customerVisibility(db, read, write) });
      }, { isolationLevel: mutation ? Prisma.TransactionIsolationLevel.Serializable : Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('Не удалось сохранить: уникальные реквизиты уже используются. Проверьте данные.');
      if (error.code === 'P2034') throw new ConflictException('Данные изменились во время сохранения. Обновите карточку и повторите действие.');
      throw error;
    }
  }
  private links(ctx: Context) {
    const { visible, read } = ctx;
    return {
      orders: { AND: [visible.orders, { OR: [{ customerId: null }, { customer: { is: visible.customers } }] }, { OR: [{ organizationId: null }, { organization: { is: visible.organizations } }] }] } satisfies Prisma.OrderWhereInput,
      interactions: { OR: [{ lead: { is: visible.leads } }, ...(read.company('crm.read') ? [{ leadId: null }] : [])] } satisfies Prisma.InteractionWhereInput,
      memberships: { isActive: true, organization: { is: visible.organizations } } satisfies Prisma.OrganizationMemberWhereInput,
      members: { isActive: true, user: { role: { in: externalRoles } }, OR: [{ customer: { is: visible.customers } }, ...(read.company('customers.read') ? [{ customerId: null }] : [])] } satisfies Prisma.OrganizationMemberWhereInput,
    };
  }
  private customerFields(ctx: Context) {
    const links = this.links(ctx);
    return { ...customerSelect,
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      organizationMemberships: { where: links.memberships, select: { id: true, role: true, organization: { select: { id: true, name: true, status: true, inn: true } } } },
      _count: { select: { orders: { where: links.orders }, leads: { where: ctx.visible.leads }, interactions: { where: links.interactions }, tasks: { where: ctx.visible.tasks }, helpdeskTickets: { where: ctx.visible.tickets } } },
    } satisfies Prisma.CustomerSelect;
  }
  private organizationFields(ctx: Context) {
    const links = this.links(ctx);
    return { ...organizationSelect,
      members: { where: links.members, select: { id: true, role: true, jobTitle: true, canOrder: true, canSeeFinance: true, user: { select: person } } },
      _count: { select: { members: { where: links.members }, orders: { where: links.orders }, leads: { where: ctx.visible.leads }, helpdeskTickets: { where: ctx.visible.tickets } } },
    } satisfies Prisma.OrganizationSelect;
  }
  private async editable(ctx: Context, kind: 'customer' | 'organization', ids: string[]) {
    if (!ids.length || !ctx.read.allowed('customers.write')) return new Set<string>();
    const write = ctx.write || await this.access.resolve(ctx.db, ctx.read.actorId, 'customers.write');
    const rows = kind === 'customer'
      ? await ctx.db.customer.findMany({ where: { AND: [{ id: { in: ids } }, ctx.visible.customers, write.customers('customers.write')] }, select: { id: true } })
      : await ctx.db.organization.findMany({ where: { AND: [{ id: { in: ids } }, ctx.visible.organizations, write.organizations('customers.write')] }, select: { id: true } });
    return new Set(rows.map(row => row.id));
  }
  private relatedAccess(ctx: Context) { return { orders: ctx.read.allowed('oms.read'), helpdesk: ctx.read.allowed('helpdesk.read'), leads: ctx.read.allowed('crm.read') }; }

  dashboard(actor: string) { return this.run(actor, false, async ctx => {
    const { db, visible } = ctx, since = new Date(Date.now() - 30 * 86400000), links = this.links(ctx);
    const [customers, active, b2bCustomers, newCustomers, organizations, revenue] = await Promise.all([
      db.customer.count({ where: visible.customers }),
      db.customer.count({ where: { AND: [visible.customers, { status: 'ACTIVE' }] } }),
      db.customer.count({ where: { AND: [visible.customers, { organizationMemberships: { some: links.memberships } }] } }),
      db.customer.count({ where: { AND: [visible.customers, { createdAt: { gte: since } }] } }),
      db.organization.count({ where: { AND: [visible.organizations, { status: { not: 'ARCHIVED' } }] } }),
      ctx.read.allowed('oms.read') ? db.order.aggregate({ where: { AND: [links.orders, { status: { notIn: ['CANCELLED', 'REFUNDED'] } }, { customer: { is: visible.customers } }] }, _sum: { finalAmount: true } }) : null,
    ]);
    return { customers, active, b2bCustomers, b2cCustomers: Math.max(customers - b2bCustomers, 0), newCustomers, organizations, revenue: revenue ? Number(revenue._sum.finalAmount || 0) : null, relatedAccess: this.relatedAccess(ctx) };
  }); }

  customers(actor: string, search?: string, status?: CustomerStatus, segment?: string) { return this.run(actor, false, async ctx => {
    const query = search?.trim(), links = this.links(ctx);
    const rows = await ctx.db.customer.findMany({ where: { AND: [ctx.visible.customers, { ...(status ? { status } : {}), ...(segment ? { segment } : {}), ...(query ? { OR: [
      { firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query } },
      { organizationMemberships: { some: { AND: [links.memberships, { organization: { name: { contains: query, mode: 'insensitive' } } }] } } },
    ] } : {}) }] }, select: this.customerFields(ctx), orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
    const editable = await this.editable(ctx, 'customer', rows.map(row => row.id));
    return rows.map(row => ({ ...row, canWrite: editable.has(row.id) }));
  }); }
  private async customerCard(ctx: Context, id: string) {
    const row = await ctx.db.customer.findFirst({ where: { AND: [{ id }, ctx.visible.customers] }, select: this.customerFields(ctx) });
    if (!row) throw new NotFoundException('Клиент не найден или недоступен');
    const links = this.links(ctx);
    const [orders, leads, interactions, helpdeskTickets, editable] = await Promise.all([
      ctx.db.order.findMany({ where: { AND: [{ customerId: id }, links.orders] }, select: orderSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20 }),
      ctx.db.lead.findMany({ where: { AND: [{ customerId: id }, ctx.visible.leads] }, select: leadSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20 }),
      ctx.db.interaction.findMany({ where: { AND: [{ customerId: id }, links.interactions] }, select: { id: true, type: true, content: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 30 }),
      ctx.db.helpdeskTicket.findMany({ where: { AND: [{ customerId: id }, ctx.visible.tickets] }, select: ticketSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20 }),
      this.editable(ctx, 'customer', [id]),
    ]);
    return { ...row, orders, leads, interactions, helpdeskTickets, canWrite: editable.has(id), relatedAccess: this.relatedAccess(ctx) };
  }
  customer(actor: string, id: string) { return this.run(actor, false, ctx => this.customerCard(ctx, id)); }

  organizations(actor: string, search?: string, status?: OrganizationStatus) { return this.run(actor, false, async ctx => {
    const query = search?.trim();
    const rows = await ctx.db.organization.findMany({ where: { AND: [ctx.visible.organizations, { ...(status ? { status } : {}), ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { legalName: { contains: query, mode: 'insensitive' } }, { inn: { contains: query } }] } : {}) }] }, select: this.organizationFields(ctx), orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
    const editable = await this.editable(ctx, 'organization', rows.map(row => row.id));
    return rows.map(row => ({ ...row, canWrite: editable.has(row.id) }));
  }); }
  private async organizationCard(ctx: Context, id: string) {
    const row = await ctx.db.organization.findFirst({ where: { AND: [{ id }, ctx.visible.organizations] }, select: this.organizationFields(ctx) });
    if (!row) throw new NotFoundException('Организация не найдена или недоступна');
    const [orders, leads, helpdeskTickets, editable] = await Promise.all([
      ctx.db.order.findMany({ where: { AND: [{ organizationId: id }, this.links(ctx).orders] }, select: orderSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 30 }),
      ctx.db.lead.findMany({ where: { AND: [{ organizationId: id }, ctx.visible.leads] }, select: leadSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20 }),
      ctx.db.helpdeskTicket.findMany({ where: { AND: [{ organizationId: id }, ctx.visible.tickets] }, select: ticketSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20 }),
      this.editable(ctx, 'organization', [id]),
    ]);
    return { ...row, orders, leads, helpdeskTickets, canWrite: editable.has(id), relatedAccess: this.relatedAccess(ctx) };
  }
  organization(actor: string, id: string) { return this.run(actor, false, ctx => this.organizationCard(ctx, id)); }

  team(actor: string) { return this.run(actor, false, async ctx => {
    const write = ctx.read.allowed('customers.write') ? await this.access.resolve(ctx.db, actor, 'customers.write') : null;
    return ctx.db.user.findMany({ where: { AND: [ctx.read.assignees(), ...(write ? [write.assignees()] : [])] }, select: person, orderBy: [{ firstName: 'asc' }, { id: 'asc' }] });
  }); }
  private async manager(ctx: Context, id: string | null) {
    if (id === null) {
      if (!ctx.read.company('customers.read') || !ctx.write?.company('customers.write')) throw new ForbiddenException('Снять ответственного можно только с доступом ко всей клиентской базе');
    } else if (!await ctx.db.user.findFirst({ where: { AND: [{ id }, ctx.read.assignees(), ctx.write!.assignees()] }, select: { id: true } })) throw new ForbiddenException('Ответственный недоступен для назначения');
  }
  private async audit(ctx: Context, kind: string, id: string, action: string, before?: string | null, after?: string | null) {
    await ctx.db.auditLog.create({ data: { actorId: ctx.read.actorId, resource: 'customer360.' + kind, resourceId: id, action, payload: { accountManagerBefore: before ?? null, accountManagerAfter: after ?? null } } });
  }
  updateCustomer(actor: string, id: string, dto: UpdateCustomerDto) { return this.run(actor, true, async ctx => {
    const before = await this.customerCard(ctx, id);
    if (dto.status === null) throw new BadRequestException('Укажите статус клиента');
    if (dto.accountManagerId !== undefined) await this.manager(ctx, dto.accountManagerId);
    await ctx.db.customer.update({ where: { id }, data: { ...dto, ...(dto.email !== undefined ? { normalizedEmail: this.email(dto.email) } : {}), ...(dto.phone !== undefined ? { normalizedPhone: this.phone(dto.phone) } : {}) } });
    const row = await this.customerCard(ctx, id); // Resulting read AND write scope, or full rollback.
    await this.audit(ctx, 'customer', id, 'Изменена карточка клиента', before.accountManagerId, row.accountManagerId);
    return row;
  }); }
  createOrganization(actor: string, dto: CreateOrganizationDto) { return this.run(actor, true, async ctx => {
    if (!dto.name?.trim()) throw new BadRequestException('Укажите название организации');
    for (const key of ['status', 'discountTier', 'creditLimit']) if (dto[key] === null) throw new BadRequestException('Обязательные поля организации нельзя очистить');
    const accountManagerId = dto.accountManagerId === undefined ? actor : dto.accountManagerId;
    await this.manager(ctx, accountManagerId);
    const { ownerUserId, ...data } = dto;
    const row = await ctx.db.organization.create({ data: { ...data, name: dto.name.trim(), accountManagerId, createdById: actor }, select: { id: true } });
    if (ownerUserId) await this.member(ctx, row.id, { userId: ownerUserId, role: 'OWNER', canSeeFinance: true });
    const result = await this.organizationCard(ctx, row.id);
    await this.audit(ctx, 'organization', row.id, 'Создана организация', null, accountManagerId);
    return result;
  }); }
  updateOrganization(actor: string, id: string, dto: UpdateOrganizationDto) { return this.run(actor, true, async ctx => {
    const before = await this.organizationCard(ctx, id);
    for (const key of ['name', 'status', 'discountTier', 'creditLimit']) if (dto[key] === null) throw new BadRequestException('Обязательные поля организации нельзя очистить');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Укажите название организации');
    if (dto.accountManagerId !== undefined) await this.manager(ctx, dto.accountManagerId);
    await ctx.db.$queryRaw`SELECT id FROM "Organization" WHERE id=${id} FOR UPDATE`;
    const organization = await ctx.db.organization.update({ where: { id }, data: dto });
    const result = await this.organizationCard(ctx, id);
    if (dto.status === 'ACTIVE') await partnerBusinessActivated(ctx.db, organization);
    await this.audit(ctx, 'organization', id, 'Изменена организация', before.accountManagerId, result.accountManagerId);
    return result;
  }); }
  private async member(ctx: Context, organizationId: string, dto: AddOrganizationMemberDto) {
    for (const key of ['role', 'canOrder', 'canSeeFinance']) if (dto[key] === null) throw new BadRequestException('Укажите роль и права представителя');
    // Never demote an internal staff/service account through customer membership.
    const user = await ctx.db.user.findFirst({ where: { id: dto.userId, isActive: true, role: { in: externalRoles } }, select: { ...person, phone: true, customer: { select: { id: true } } } });
    if (!user) throw new NotFoundException('Представитель не найден или недоступен');
    let customerId = user.customer?.id;
    if (customerId) {
      if (!await ctx.db.customer.findFirst({ where: { AND: [{ id: customerId }, ctx.visible.customers] }, select: { id: true } })) throw new NotFoundException('Представитель не найден или недоступен');
    } else {
      if (!ctx.read.company('customers.read') || !ctx.write!.company('customers.write')) throw new NotFoundException('Представитель не найден или недоступен');
      customerId = (await ctx.db.customer.create({ data: { userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, normalizedEmail: this.email(user.email), normalizedPhone: this.phone(user.phone), segment: 'B2B', source: 'WEB', accountManagerId: ctx.read.actorId, createdById: ctx.read.actorId }, select: { id: true } })).id;
    }
    const member = await ctx.db.organizationMember.upsert({ where: { organizationId_userId: { organizationId, userId: user.id } }, create: { ...dto, organizationId, customerId }, update: { customerId, role: dto.role, jobTitle: dto.jobTitle, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance, isActive: true } });
    // Re-check role in the UPDATE too: never overwrite a concurrent staff promotion.
    const changed = await ctx.db.user.updateMany({ where: { id: user.id, isActive: true, role: { in: externalRoles } }, data: { role: UserRole.CUSTOMER_B2B } });
    if (changed.count !== 1) throw new ConflictException('Учётная запись изменилась. Обновите карточку.');
    await this.audit(ctx, 'organization', organizationId, 'Изменён представитель организации');
    return { id: member.id, organizationId, userId: user.id, customerId, role: member.role, jobTitle: member.jobTitle, canOrder: member.canOrder, canSeeFinance: member.canSeeFinance, isActive: member.isActive };
  }
  addMember(actor: string, id: string, dto: AddOrganizationMemberDto) { return this.run(actor, true, async ctx => {
    await this.organizationCard(ctx, id);
    return this.member(ctx, id, dto);
  }); }
  private email(value?: string | null) { return value?.trim().toLowerCase() || null; }
  private phone(value?: string | null) { return value?.replace(/\D/g, '') || null; }
}
