import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { B2BBookingStatus, B2BClientStatus, OrderSource, OrderStatus, OrganizationMemberRole, Prisma, TicketPriority, TicketSource, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { CreateB2BBookingDto, CreateB2BClientDto, CreateB2BOrderDto, CreateB2BProfileDto, CreateB2BServiceDto, CreateB2BSupportDto, UpdateB2BBookingDto, UpdateB2BClientDto, UpdateB2BServiceDto } from './dto/b2b.dto';

@Injectable()
export class B2BService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService) {}

  private async context(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({ where: { userId, isActive: true }, include: { organization: true, user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } } } });
    if (!membership) throw new NotFoundException('B2B-организация не найдена или доступ отключён');
    return membership;
  }

  async createProfile(userId: string, dto: CreateB2BProfileDto) {
    if (await this.prisma.b2BProfile.findUnique({ where: { userId } })) throw new ConflictException('B2B-профиль уже существует');
    if (dto.inn && await this.prisma.organization.findUnique({ where: { inn: dto.inn } })) throw new ConflictException('Организация с таким ИНН уже существует');
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { customer: true } });
      if (!user) throw new NotFoundException('Пользователь не найден');
      const profile = await tx.b2BProfile.create({ data: { userId, companyName: dto.companyName, inn: dto.inn, kpp: dto.kpp, legalAddress: dto.legalAddress } });
      const customer = user.customer || await tx.customer.create({ data: { userId, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, normalizedEmail: user.email.toLowerCase(), normalizedPhone: user.phone?.replace(/\D/g, '') || null, segment: 'B2B', source: 'WEB' } });
      const organization = await tx.organization.create({ data: { name: dto.companyName, legalName: dto.companyName, inn: dto.inn, kpp: dto.kpp, legalAddress: dto.legalAddress } });
      await tx.organizationMember.create({ data: { organizationId: organization.id, userId, customerId: customer.id, role: OrganizationMemberRole.OWNER, canOrder: true, canSeeFinance: true } });
      await tx.user.update({ where: { id: userId }, data: { role: UserRole.CUSTOMER_B2B } });
      await tx.customer.update({ where: { id: customer.id }, data: { segment: 'B2B' } });
      return { ...organization, legacyProfileId: profile.id };
    });
  }

  async profile(userId: string) {
    const member = await this.context(userId);
    const members = await this.prisma.organizationMember.findMany({ where: { organizationId: member.organizationId, isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } }, orderBy: { createdAt: 'asc' } });
    return { ...member.organization, membership: { id: member.id, role: member.role, jobTitle: member.jobTitle, canOrder: member.canOrder, canSeeFinance: member.canSeeFinance }, user: member.user, members };
  }

  async dashboard(userId: string) {
    const member = await this.context(userId); const now = new Date(); const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [clients, bookingsToday, upcoming, completedMonth, orders, recentOrders, nextBookings, lowStock] = await Promise.all([
      this.prisma.b2BClient.count({ where: { organizationId: member.organizationId, status: B2BClientStatus.ACTIVE } }),
      this.prisma.b2BBooking.count({ where: { organizationId: member.organizationId, startTime: { gte: dayStart, lt: dayEnd }, status: { not: B2BBookingStatus.CANCELLED } } }),
      this.prisma.b2BBooking.count({ where: { organizationId: member.organizationId, startTime: { gte: now }, status: { in: [B2BBookingStatus.NEW, B2BBookingStatus.CONFIRMED] } } }),
      this.prisma.b2BBooking.findMany({ where: { organizationId: member.organizationId, startTime: { gte: monthStart }, status: B2BBookingStatus.COMPLETED }, include: { service: { select: { price: true } } } }),
      this.prisma.order.aggregate({ where: { organizationId: member.organizationId, source: OrderSource.B2B, createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { finalAmount: true } }),
      this.prisma.order.findMany({ where: { organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.b2BBooking.findMany({ where: { organizationId: member.organizationId, startTime: { gte: now }, status: { in: [B2BBookingStatus.NEW, B2BBookingStatus.CONFIRMED] } }, include: { client: true, service: true, masterMember: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { startTime: 'asc' }, take: 6 }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);
    return { clients, bookingsToday, upcoming, serviceRevenueMonth: completedMonth.reduce((sum, item) => sum + Number(item.service.price), 0), purchaseOrdersMonth: orders._count._all, purchasesMonth: Number(orders._sum.finalAmount || 0), lowStock, recentOrders, nextBookings };
  }

  async catalog(userId: string) {
    const member = await this.context(userId); const discount = member.organization.discountTier || 0;
    const products = await this.prisma.product.findMany({ where: { isActive: true }, include: { variants: { where: { isActive: true } }, images: true }, orderBy: { updatedAt: 'desc' } });
    return products.map(product => ({ ...product, variants: product.variants.map(variant => ({ ...variant, retailPrice: Number(variant.price), b2bPrice: Math.round(Number(variant.price) * (1 - discount / 100) * 100) / 100, available: Math.max(0, variant.stock - variant.reserved) })) }));
  }

  async clients(userId: string, search?: string) { const member = await this.context(userId); return this.prisma.b2BClient.findMany({ where: { organizationId: member.organizationId, status: B2BClientStatus.ACTIVE, ...(search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] } : {}) }, orderBy: [{ lastVisitAt: 'desc' }, { createdAt: 'desc' }] }); }
  async createClient(userId: string, dto: CreateB2BClientDto) { const member = await this.context(userId); if (dto.phone && await this.prisma.b2BClient.findFirst({ where: { organizationId: member.organizationId, phone: dto.phone, status: B2BClientStatus.ACTIVE } })) throw new ConflictException('Клиент с таким телефоном уже есть в вашей базе'); return this.prisma.b2BClient.create({ data: { organizationId: member.organizationId, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, email: dto.email?.toLowerCase(), birthday: dto.birthday ? new Date(dto.birthday) : undefined, notes: dto.notes, tags: dto.tags || [], consentPersonalDataAt: dto.personalDataConsent ? new Date() : undefined } }); }
  async updateClient(userId: string, id: string, dto: UpdateB2BClientDto) { const member = await this.context(userId); await this.ownedClient(member.organizationId, id); return this.prisma.b2BClient.update({ where: { id }, data: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, email: dto.email?.toLowerCase(), birthday: dto.birthday ? new Date(dto.birthday) : undefined, notes: dto.notes, tags: dto.tags, status: dto.status, ...(dto.personalDataConsent !== undefined ? { consentPersonalDataAt: dto.personalDataConsent ? new Date() : null } : {}) } }); }

  async services(userId: string) { const member = await this.context(userId); return this.prisma.b2BService.findMany({ where: { organizationId: member.organizationId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }); }
  async createService(userId: string, dto: CreateB2BServiceDto) { const member = await this.context(userId); return this.prisma.b2BService.create({ data: { organizationId: member.organizationId, ...dto } }); }
  async updateService(userId: string, id: string, dto: UpdateB2BServiceDto) { const member = await this.context(userId); await this.ownedService(member.organizationId, id); return this.prisma.b2BService.update({ where: { id }, data: dto }); }

  async bookings(userId: string, from?: string, to?: string) { const member = await this.context(userId); return this.prisma.b2BBooking.findMany({ where: { organizationId: member.organizationId, ...(from || to ? { startTime: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}) }, include: { client: true, service: true, masterMember: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { startTime: 'asc' }, take: 500 }); }

  async createBooking(userId: string, dto: CreateB2BBookingDto) {
    const member = await this.context(userId); const [client, service] = await Promise.all([this.ownedClient(member.organizationId, dto.clientId), this.ownedService(member.organizationId, dto.serviceId)]);
    if (!service.isActive) throw new BadRequestException('Услуга выключена'); if (dto.masterMemberId) await this.ownedMember(member.organizationId, dto.masterMemberId);
    const start = new Date(dto.startTime); const end = new Date(start.getTime() + service.duration * 60000); if (start < new Date(Date.now() - 60000)) throw new BadRequestException('Нельзя создать запись в прошлом');
    if (dto.masterMemberId && await this.prisma.b2BBooking.findFirst({ where: { organizationId: member.organizationId, masterMemberId: dto.masterMemberId, status: { not: B2BBookingStatus.CANCELLED }, startTime: { lt: end }, endTime: { gt: start } } })) throw new ConflictException('У выбранного мастера это время уже занято');
    return this.prisma.b2BBooking.create({ data: { organizationId: member.organizationId, clientId: client.id, serviceId: service.id, masterMemberId: dto.masterMemberId, startTime: start, endTime: end, notes: dto.notes }, include: { client: true, service: true } });
  }

  async updateBooking(userId: string, id: string, dto: UpdateB2BBookingDto) {
    const member = await this.context(userId); const booking = await this.prisma.b2BBooking.findFirst({ where: { id, organizationId: member.organizationId }, include: { service: true } }); if (!booking) throw new NotFoundException('Запись не найдена'); if (dto.masterMemberId) await this.ownedMember(member.organizationId, dto.masterMemberId);
    const start = dto.startTime ? new Date(dto.startTime) : booking.startTime; const end = new Date(start.getTime() + booking.service.duration * 60000); const masterId = dto.masterMemberId ?? booking.masterMemberId;
    if (masterId && await this.prisma.b2BBooking.findFirst({ where: { id: { not: id }, organizationId: member.organizationId, masterMemberId: masterId, status: { not: B2BBookingStatus.CANCELLED }, startTime: { lt: end }, endTime: { gt: start } } })) throw new ConflictException('У выбранного мастера это время уже занято');
    return this.prisma.$transaction(async tx => { const updated = await tx.b2BBooking.update({ where: { id }, data: { status: dto.status, masterMemberId: dto.masterMemberId, startTime: dto.startTime ? start : undefined, endTime: dto.startTime ? end : undefined, notes: dto.notes }, include: { client: true, service: true } }); if (dto.status === B2BBookingStatus.COMPLETED && booking.status !== B2BBookingStatus.COMPLETED) await tx.b2BClient.update({ where: { id: booking.clientId }, data: { lastVisitAt: booking.startTime, totalVisits: { increment: 1 }, totalSpent: { increment: booking.service.price } } }); return updated; });
  }

  async orders(userId: string) { const member = await this.context(userId); return this.prisma.order.findMany({ where: { organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true, history: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async createOrder(userId: string, dto: CreateB2BOrderDto) {
    const member = await this.context(userId); if (!member.canOrder) throw new ForbiddenException('У вас нет права оформлять закупки'); if (!dto.items.length) throw new BadRequestException('Добавьте товары в заказ');
    const ids = [...new Set(dto.items.map(item => item.variantId))]; const variants = await this.prisma.productVariant.findMany({ where: { id: { in: ids }, isActive: true }, include: { product: true } }); if (variants.length !== ids.length) throw new NotFoundException('Один из товаров не найден или выключен');
    const map = new Map(variants.map(item => [item.id, item])); const discount = member.organization.discountTier || 0; const lines = dto.items.map(item => { const variant = map.get(item.variantId)!; const price = Math.round(Number(variant.price) * (1 - discount / 100) * 100) / 100; return { item, variant, price, total: price * item.quantity }; }); const total = lines.reduce((sum, line) => sum + Number(line.variant.price) * line.item.quantity, 0); const final = lines.reduce((sum, line) => sum + line.total, 0);
    const order = await this.prisma.$transaction(async tx => { for (const line of lines) { const result = await tx.productVariant.updateMany({ where: { id: line.variant.id, stock: { gte: line.item.quantity } }, data: { stock: { decrement: line.item.quantity }, reserved: { increment: line.item.quantity } } }); if (result.count !== 1) throw new BadRequestException(`Недостаточно товара: ${line.variant.product.nameRu}`); } const orderNumber = `SB-B2B-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`; return tx.order.create({ data: { orderNumber, userId, customerId: member.customerId, organizationId: member.organizationId, source: OrderSource.B2B, sourceChannel: 'B2B', status: OrderStatus.NEW, buyerName: [member.user.firstName, member.user.lastName].filter(Boolean).join(' '), buyerEmail: member.user.email, buyerPhone: member.user.phone, totalAmount: total, discountAmount: total - final, finalAmount: final, shippingAddress: (dto.shippingAddress || { address: member.organization.legalAddress || '' }) as Prisma.InputJsonValue, comments: dto.comments, items: { create: lines.map(line => ({ variantId: line.variant.id, externalSku: line.variant.sku, productName: line.variant.product.nameRu, variantName: line.variant.name, price: line.price, quantity: line.item.quantity, total: line.total })) }, history: { create: { toStatus: OrderStatus.NEW, changedBy: userId, comment: 'B2B-заказ создан в кабинете организации' } } }, include: { items: true } }); });
    await this.oneC.enqueueOrder(order.id, userId);
    return order;
  }
  async repeatOrder(userId: string, orderId: string) { const member = await this.context(userId); const order = await this.prisma.order.findFirst({ where: { id: orderId, organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true } }); if (!order) throw new NotFoundException('Заказ не найден'); return this.createOrder(userId, { items: order.items.filter(item => item.variantId).map(item => ({ variantId: item.variantId!, quantity: item.quantity })), shippingAddress: order.shippingAddress as Record<string, unknown>, comments: `Повтор заказа ${order.orderNumber}` }); }

  async supportTickets(userId: string) { const member = await this.context(userId); return this.prisma.helpdeskTicket.findMany({ where: { organizationId: member.organizationId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async createSupportTicket(userId: string, dto: CreateB2BSupportDto) { const member = await this.context(userId); const priority = dto.priority || TicketPriority.MEDIUM; const hours = priority === TicketPriority.CRITICAL ? 1 : priority === TicketPriority.HIGH ? 4 : priority === TicketPriority.MEDIUM ? 8 : 24; return this.prisma.helpdeskTicket.create({ data: { number: `HD-B2B-${Date.now().toString().slice(-9)}`, subject: dto.subject, description: dto.description, priority, source: TicketSource.B2B, requesterUserId: userId, customerId: member.customerId, organizationId: member.organizationId, requesterName: [member.user.firstName, member.user.lastName].filter(Boolean).join(' '), requesterEmail: member.user.email, queue: 'B2B-клиенты', affectedService: 'B2B-кабинет', firstResponseDueAt: new Date(Date.now() + hours * 3600000), resolutionDueAt: new Date(Date.now() + hours * 4 * 3600000) } }); }

  private async ownedClient(organizationId: string, id: string) { const item = await this.prisma.b2BClient.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Клиент не найден'); return item; }
  private async ownedService(organizationId: string, id: string) { const item = await this.prisma.b2BService.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Услуга не найдена'); return item; }
  private async ownedMember(organizationId: string, id: string) { const item = await this.prisma.organizationMember.findFirst({ where: { id, organizationId, isActive: true } }); if (!item) throw new NotFoundException('Сотрудник организации не найден'); return item; }
}
