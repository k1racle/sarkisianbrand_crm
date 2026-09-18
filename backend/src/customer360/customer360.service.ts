import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, DataEntityType, OrganizationMemberRole, OrganizationStatus, Prisma, TrashEntryStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { partnerBusinessActivated } from '../partners/partner-lifecycle';
import { AddOrganizationMemberDto, CreateOrganizationDto, UpdateCustomerDto, UpdateOrganizationDto } from './dto/customer360.dto';

@Injectable()
export class Customer360Service {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const [trashedCustomers, trashedOrganizations] = await Promise.all([
      this.trashedIds(DataEntityType.CUSTOMER),
      this.trashedIds(DataEntityType.ORGANIZATION),
    ]);
    const visibleCustomers: Prisma.CustomerWhereInput = { id: { notIn: trashedCustomers } };
    const visibleOrganizations: Prisma.OrganizationWhereInput = { id: { notIn: trashedOrganizations } };
    const [customers, active, b2bCustomers, newCustomers, organizations, revenue] = await this.prisma.$transaction([
      this.prisma.customer.count({ where: visibleCustomers }),
      this.prisma.customer.count({ where: { ...visibleCustomers, status: CustomerStatus.ACTIVE } }),
      this.prisma.customer.count({ where: { ...visibleCustomers, organizationMemberships: { some: { isActive: true } } } }),
      this.prisma.customer.count({ where: { ...visibleCustomers, createdAt: { gte: monthAgo } } }),
      this.prisma.organization.count({ where: { ...visibleOrganizations, status: { not: OrganizationStatus.ARCHIVED } } }),
      this.prisma.order.aggregate({ where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } }, _sum: { finalAmount: true } }),
    ]);
    return { customers, active, b2bCustomers, b2cCustomers: Math.max(customers - b2bCustomers, 0), newCustomers, organizations, revenue: Number(revenue._sum.finalAmount || 0) };
  }

  async customers(search?: string, status?: CustomerStatus, segment?: string) {
    const query = search?.trim();
    const trashedIds = await this.trashedIds(DataEntityType.CUSTOMER);
    const where: Prisma.CustomerWhereInput = {
      id: { notIn: trashedIds },
      ...(status ? { status } : {}),
      ...(segment ? { segment } : {}),
      ...(query ? { OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { organizationMemberships: { some: { organization: { name: { contains: query, mode: 'insensitive' } } } } },
      ] } : {}),
    };
    return this.prisma.customer.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, role: true, createdAt: true } },
        organizationMemberships: { where: { isActive: true }, include: { organization: { select: { id: true, name: true, status: true } } } },
        _count: { select: { orders: true, leads: true, interactions: true, helpdeskTickets: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async customer(id: string) {
    if (await this.isTrashed(DataEntityType.CUSTOMER, id)) throw new NotFoundException('Клиент находится в корзине');
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true, locale: true, country: true, city: true, createdAt: true } },
        externalIdentities: { orderBy: { createdAt: 'asc' } },
        organizationMemberships: { include: { organization: { include: { accountManager: { select: { id: true, firstName: true, lastName: true, email: true } } } } } },
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } },
        leads: { orderBy: { createdAt: 'desc' }, take: 20, include: { manager: { select: { id: true, firstName: true, lastName: true } } } },
        interactions: { orderBy: { createdAt: 'desc' }, take: 30 },
        helpdeskTickets: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, number: true, subject: true, status: true, priority: true, createdAt: true } },
      },
    });
    if (!customer) throw new NotFoundException('Клиент не найден');
    return customer;
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    await this.customerExists(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.email !== undefined ? { normalizedEmail: this.email(dto.email) } : {}),
        ...(dto.phone !== undefined ? { normalizedPhone: this.phone(dto.phone) } : {}),
      },
    });
  }

  async organizations(search?: string, status?: OrganizationStatus) {
    const query = search?.trim();
    const trashedIds = await this.trashedIds(DataEntityType.ORGANIZATION);
    return this.prisma.organization.findMany({
      where: {
        id: { notIn: trashedIds },
        ...(status ? { status } : {}),
        ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' as const } }, { legalName: { contains: query, mode: 'insensitive' as const } }, { inn: { contains: query } }] } : {}),
      },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { where: { isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { members: true, orders: true, leads: true, helpdeskTickets: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async organization(id: string) {
    if (await this.isTrashed(DataEntityType.ORGANIZATION, id)) throw new NotFoundException('Организация находится в корзине');
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } }, customer: true }, orderBy: { createdAt: 'asc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 30 },
        leads: { orderBy: { createdAt: 'desc' }, take: 20 },
        helpdeskTickets: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!organization) throw new NotFoundException('Организация не найдена');
    return organization;
  }

  async createOrganization(dto: CreateOrganizationDto) {
    if (dto.inn && await this.prisma.organization.findUnique({ where: { inn: dto.inn } })) throw new ConflictException('Организация с таким ИНН уже существует');
    const { ownerUserId, ...organization } = dto;
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({ data: organization });
      if (ownerUserId) {
        const user = await tx.user.findUnique({ where: { id: ownerUserId }, include: { customer: true } });
        if (!user) throw new NotFoundException('Пользователь не найден');
        const customer = user.customer || await tx.customer.create({ data: this.customerFromUser(user, 'B2B') });
        await tx.organizationMember.create({ data: { organizationId: created.id, userId: user.id, customerId: customer.id, role: OrganizationMemberRole.OWNER, canSeeFinance: true } });
        await tx.user.update({ where: { id: user.id }, data: { role: UserRole.CUSTOMER_B2B } });
      }
      return created;
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    await this.organizationExists(id);
    return this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${id} FOR UPDATE`;
      const organization=await tx.organization.update({where:{id},data:dto});
      if(dto.status==='ACTIVE')await partnerBusinessActivated(tx,organization);
      return organization;
    });
  }

  async addMember(organizationId: string, dto: AddOrganizationMemberDto) {
    await this.organizationExists(organizationId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, include: { customer: true } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const customer = user.customer || await this.prisma.customer.create({ data: this.customerFromUser(user, 'B2B') });
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        create: { organizationId, userId: user.id, customerId: customer.id, role: dto.role, jobTitle: dto.jobTitle, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance },
        update: { customerId: customer.id, role: dto.role, jobTitle: dto.jobTitle, canOrder: dto.canOrder, canSeeFinance: dto.canSeeFinance, isActive: true },
      });
      await tx.user.update({ where: { id: user.id }, data: { role: UserRole.CUSTOMER_B2B } });
      return member;
    });
  }

  private customerFromUser(user: { id: string; firstName: string | null; lastName: string | null; email: string; phone: string | null }, segment: string) {
    return { userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, normalizedEmail: this.email(user.email), normalizedPhone: this.phone(user.phone), segment, source: 'WEB' };
  }

  private email(value?: string | null) { return value?.trim().toLowerCase() || null; }
  private phone(value?: string | null) { return value?.replace(/\D/g, '') || null; }
  private async trashedIds(type: DataEntityType) {
    const rows = await this.prisma.dataTrashEntry.findMany({ where: { entityType: type, status: TrashEntryStatus.TRASHED }, select: { entityId: true } });
    return rows.map((row) => row.entityId);
  }
  private async isTrashed(type: DataEntityType, id: string) {
    return Boolean(await this.prisma.dataTrashEntry.findFirst({ where: { entityType: type, entityId: id, status: TrashEntryStatus.TRASHED }, select: { id: true } }));
  }
  private async customerExists(id: string) { if (!await this.prisma.customer.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Клиент не найден'); }
  private async organizationExists(id: string) { if (!await this.prisma.organization.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundException('Организация не найдена'); }
}
