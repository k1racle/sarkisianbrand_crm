import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { B2BBookingStatus, B2BClientStatus, OrderSource, OrderStatus, OrganizationMemberRole, OrganizationStatus, Prisma, TicketPriority, TicketSource, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { holdVerifiedOneCStock, oneCStockAvailability } from '../common/one-c-sale-stock';
import { customerWarehouseView } from '../oms/warehouse-execution-view';
import { salesVariant, salesQuantity, salesStockInclude } from '../common/sales-stock';
import { createHash, randomUUID } from 'crypto';
import { attachPartnerRegistration } from '../partners/partner-lifecycle';
import { protectB2BFinance } from './b2b-finance';
import { SalonBookingService } from './salon-booking.service';
import { dateKey, localInstant } from './salon-booking-time';
import { presentationSelect, publicPresentation } from './salon-presentation';
import { BusinessCompanySettingDto } from './dto/salon-presentation.dto';
import { businessMembership, businessSalonRole } from './business-context';
import { businessCompanyDetails } from './business-registration.validation';
import { BusinessRequestContext, recordBusinessConsent } from './business-consent';
import { B2BOrderListDto, CreateB2BBookingDto, CreateB2BClientDto, CreateB2BOrderDto, CreateB2BProfileDto, CreateB2BServiceDto, CreateB2BSupportDto, RepeatB2BOrderDto, UpdateB2BBookingDto, UpdateB2BClientDto, UpdateB2BServiceDto } from './dto/b2b.dto';

function customerOrderWarehouseView(order: any) {
  const warehouseStatus = customerWarehouseView(order.warehouseExecution, order);
  return {
    id: order.id, orderNumber: order.orderNumber, status: order.status,
    createdAt: order.createdAt, updatedAt: order.updatedAt, currency: order.currency,
    totalAmount: order.totalAmount, discountAmount: order.discountAmount, finalAmount: order.finalAmount,
    trackingNumber: order.trackingNumber, comments: order.comments,
    items: (order.items || []).map((line: any) => ({ id: line.id, variantId: line.variantId, productName: line.productName, variantName: line.variantName, productType: line.productType, externalSku: line.externalSku, quantity: line.quantity, price: line.price, total: line.total })),
    requiresWarehouse: order.items?.some((item: any) => item.productType === 'PHYSICAL') === true,
    warehouseStatus, needsAttention: Boolean(order.oneCSyncError) || (warehouseStatus?.isCurrent === true && warehouseStatus.stage === 'NEEDS_ATTENTION'),
  };
}

@Injectable()
export class B2BService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService, private readonly salon: SalonBookingService) {}

  private async context(userId: string, salon = false) {
    const membership = await businessMembership(this.prisma, userId);
    if (salon && ![OrganizationMemberRole.OWNER, OrganizationMemberRole.EMPLOYEE].includes(membership.role as any)) throw new ForbiddenException('Для вашей роли недоступны данные салона');
    return membership;
  }

  async organizations(userId: string) {
    const rows = await this.prisma.organizationMember.findMany({ where: { userId, isActive: true, user: { isActive: true, role: UserRole.CUSTOMER_B2B } },
      select: { role: true, canOrder: true, canSeeFinance: true, organization: { select: { id: true, name: true, status: true } } },
      orderBy: [{ organization: { name: 'asc' } }, { organizationId: 'asc' }] });
    return rows.map(member => ({ ...member.organization, role: member.role,
      canOrder: member.canOrder && member.organization.status === OrganizationStatus.ACTIVE,
      canSeeFinance: member.canSeeFinance, canUseSalon: businessSalonRole(member.role) }));
  }

  private purchaseRestriction(status: OrganizationStatus): string | null {
    if (status === OrganizationStatus.ACTIVE) return null;
    if (status === OrganizationStatus.PROSPECT) return 'Заявка компании находится на проверке. Закупки станут доступны после активации организации.';
    if (status === OrganizationStatus.ON_HOLD) return 'Закупки для организации приостановлены. Обратитесь в поддержку.';
    return 'Организация находится в архиве. Для возобновления закупок обратитесь в поддержку.';
  }

  async createProfile(userId: string, dto: CreateB2BProfileDto, context: BusinessRequestContext = {}) {
    if (dto.acceptedTerms !== true) throw new BadRequestException('Подтвердите согласие с условиями регистрации');
    const details = businessCompanyDetails(dto);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId }, include: { customer: true } });
      if (!user) throw new NotFoundException('Пользователь не найден');
      if (!user.isActive || user.role !== UserRole.CUSTOMER_B2B) throw new ForbiddenException('Для регистрации компании нужен отдельный бизнес-аккаунт');
      if (details.inn && await tx.organization.findUnique({ where: { inn: details.inn } })) throw new ConflictException('Организация с таким ИНН уже существует');
      const profile = await tx.b2BProfile.upsert({ where: { userId }, update: {}, create: { userId, ...details } });
      const customer = user.customer || await tx.customer.create({ data: { userId, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, normalizedEmail: user.email.toLowerCase(), normalizedPhone: user.phone?.replace(/\D/g, '') || null, segment: 'B2B', source: 'WEB' } });
      const organization = await tx.organization.create({ data: { name: details.companyName, legalName: details.companyName, inn: details.inn, kpp: details.kpp, legalAddress: details.legalAddress, status: 'PROSPECT', createdById: userId } });
      await tx.organizationMember.create({ data: { organizationId: organization.id, userId, customerId: customer.id, role: OrganizationMemberRole.OWNER, canOrder: true, canSeeFinance: true } });
      await recordBusinessConsent(tx, userId, organization.id, context, 'EXISTING_BUSINESS_ADD_ORGANIZATION', dto.termsVersion);
      await tx.auditLog.create({ data: { actorId: userId, action: 'REGISTER', resource: 'business-registration', resourceId: organization.id, payload: { organizationId: organization.id, profileId: profile.id, status: organization.status, role: 'OWNER' } } });
      if(dto.partnerToken)await attachPartnerRegistration(tx,organization,user,dto.partnerToken);
      return { ...organization, legacyProfileId: profile.id };
    }).catch(error=>{if(error?.code==='P2002')throw new ConflictException('Организация с такими данными уже зарегистрирована');throw error;});
  }

  async profile(userId: string) {
    const member = await this.context(userId);
    const presentation=publicPresentation(await this.prisma.salonPresentation.findUnique({where:{organizationId:member.organizationId},select:presentationSelect}),member.organizationId);
    const members = await this.prisma.organizationMember.findMany({ where: { organizationId: member.organizationId, isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, role: true } } }, orderBy: { createdAt: 'asc' } });
    const purchaseRestriction = this.purchaseRestriction(member.organization.status);
    return protectB2BFinance({ ...member.organization, presentation, membership: { id: member.id, role: member.role, jobTitle: member.jobTitle, canOrder: member.canOrder && !purchaseRestriction, canSeeFinance: member.canSeeFinance }, capabilities: { salon: member.role === OrganizationMemberRole.OWNER || member.role === OrganizationMemberRole.EMPLOYEE, purchasing: member.canOrder && !purchaseRestriction, purchaseRestriction }, user: member.user, members },member.canSeeFinance);
  }
  async saveCompanySettings(userId:string,dto:BusinessCompanySettingDto) {
    const member=await this.context(userId);
    if(member.role!==OrganizationMemberRole.OWNER)throw new ForbiddenException('Данные компании может изменить владелец');
    if(!dto.name.trim())throw new BadRequestException('Укажите название компании');
    const data={name:dto.name.trim(),legalName:dto.legalName.trim(),legalAddress:dto.legalAddress.trim()};
    return this.prisma.organization.update({where:{id:member.organizationId},data,select:{name:true,legalName:true,legalAddress:true}});
  }

  async dashboard(userId: string) {
    const member = await this.context(userId); const now = new Date();
    const timeZone=(await this.prisma.salonBookingSetting.findUnique({where:{organizationId:member.organizationId}}))?.timeZone||'Europe/Moscow';
    const today=dateKey(now,timeZone),nextDay=new Date(Date.parse(`${today}T00:00:00Z`)+86400000).toISOString().slice(0,10);
    const dayStart=localInstant(today,0,timeZone)||localInstant(today,60,timeZone)!;
    const dayEnd=localInstant(nextDay,0,timeZone)||localInstant(nextDay,60,timeZone)!;
    const monthDay=today.slice(0,7)+'-01',monthStart=localInstant(monthDay,0,timeZone)||localInstant(monthDay,60,timeZone)!;
    if (![OrganizationMemberRole.OWNER, OrganizationMemberRole.EMPLOYEE].includes(member.role as any)) {
      const [orders, recentOrders] = await Promise.all([
        this.prisma.order.aggregate({ where: { organizationId: member.organizationId, source: OrderSource.B2B, createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { finalAmount: true } }),
        this.prisma.order.findMany({ where: { organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true, execution: { select: { version: true } }, warehouseExecution: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);
      return protectB2BFinance({ purchaseOrdersMonth: orders._count._all, purchasesMonth: Number(orders._sum.finalAmount || 0), recentOrders: recentOrders.map(customerOrderWarehouseView) }, member.canSeeFinance);
    }
    const [clients, bookingsToday, upcoming, completedMonth, orders, recentOrders, nextBookings, lowStock] = await Promise.all([
      this.prisma.b2BClient.count({ where: { organizationId: member.organizationId, status: B2BClientStatus.ACTIVE } }),
      this.prisma.b2BBooking.count({ where: { organizationId: member.organizationId, startTime: { gte: dayStart, lt: dayEnd }, status: { not: B2BBookingStatus.CANCELLED } } }),
      this.prisma.b2BBooking.count({ where: { organizationId: member.organizationId, startTime: { gte: now }, status: { in: [B2BBookingStatus.NEW, B2BBookingStatus.CONFIRMED] } } }),
      this.prisma.b2BBooking.findMany({ where: { organizationId: member.organizationId, startTime: { gte: monthStart }, status: B2BBookingStatus.COMPLETED }, select: { priceSnapshot: true } }),
      this.prisma.order.aggregate({ where: { organizationId: member.organizationId, source: OrderSource.B2B, createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { finalAmount: true } }),
      this.prisma.order.findMany({ where: { organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true, execution: { select: { version: true } }, warehouseExecution: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.b2BBooking.findMany({ where: { organizationId: member.organizationId, startTime: { gte: now }, status: { in: [B2BBookingStatus.NEW, B2BBookingStatus.CONFIRMED] } }, include: { client: true, service: true, masterMember: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { startTime: 'asc' }, take: 6 }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);
    return protectB2BFinance({ timeZone, clients, bookingsToday, upcoming, serviceRevenueMonth: Number(completedMonth.reduce((sum, item) => sum.add(item.priceSnapshot), new Prisma.Decimal(0))), purchaseOrdersMonth: orders._count._all, purchasesMonth: Number(orders._sum.finalAmount || 0), lowStock, recentOrders: recentOrders.map(customerOrderWarehouseView), nextBookings },member.canSeeFinance);
  }

  async catalog(userId: string) {
    const member = await this.context(userId); const discount = member.organization.discountTier || 0;
    const [products, integration] = await Promise.all([
      this.prisma.product.findMany({ where: { isActive: true, productType:'PHYSICAL' }, include: { variants: { where: { isActive: true }, include: { channelStocks: salesStockInclude, oneCWarehouseStock: true } }, images: true,categories:{include:{category:true}} }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { isEnabled: true, configuredSecretKeys: true, config: true } }),
    ]);
    return products.map(product => ({ ...product, variants: product.variants.map(variant => {
      const availability = oneCStockAvailability({ ...variant, product }, variant.oneCWarehouseStock, integration);
      const { oneCWarehouseStock, ...safeVariant } = variant;
      const projected = salesVariant(safeVariant, 'B2B');
      return { ...projected, stock: availability.available === null ? null : projected.stock, reserved: availability.available === null ? null : projected.reserved, ...availability,
        available: availability.available === null ? null : Math.min(availability.available, salesQuantity(variant, 'B2B')),
        retailPrice: Number(variant.price), b2bPrice: new Prisma.Decimal(variant.price).mul(new Prisma.Decimal(100).minus(discount)).div(100).toDecimalPlaces(2).toNumber() };
    }) }));
  }

  async clients(userId: string, search?: string) { const member = await this.context(userId, true); return protectB2BFinance(await this.prisma.b2BClient.findMany({ where: { organizationId: member.organizationId, status: B2BClientStatus.ACTIVE, ...(search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] } : {}) }, orderBy: [{ lastVisitAt: 'desc' }, { createdAt: 'desc' }] }),member.canSeeFinance); }
  async createClient(userId: string, dto: CreateB2BClientDto) { const member = await this.context(userId, true); if (dto.phone && await this.prisma.b2BClient.findFirst({ where: { organizationId: member.organizationId, phone: dto.phone, status: B2BClientStatus.ACTIVE } })) throw new ConflictException('Клиент с таким телефоном уже есть в вашей базе'); return protectB2BFinance(await this.prisma.b2BClient.create({ data: { organizationId: member.organizationId, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, email: dto.email?.toLowerCase(), birthday: dto.birthday ? new Date(dto.birthday) : undefined, notes: dto.notes, tags: dto.tags || [], consentPersonalDataAt: dto.personalDataConsent ? new Date() : undefined } }),member.canSeeFinance); }
  async updateClient(userId: string, id: string, dto: UpdateB2BClientDto) { const member = await this.context(userId, true); await this.ownedClient(member.organizationId, id); return protectB2BFinance(await this.prisma.b2BClient.update({ where: { id }, data: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, email: dto.email?.toLowerCase(), birthday: dto.birthday ? new Date(dto.birthday) : undefined, notes: dto.notes, tags: dto.tags, status: dto.status, ...(dto.personalDataConsent !== undefined ? { consentPersonalDataAt: dto.personalDataConsent ? new Date() : null } : {}) } }),member.canSeeFinance); }

  async services(userId: string) { const member = await this.context(userId, true); return this.prisma.b2BService.findMany({ where: { organizationId: member.organizationId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }); }
  async createService(userId: string, dto: CreateB2BServiceDto) { const member = await this.context(userId, true); return this.prisma.b2BService.create({ data: { organizationId: member.organizationId, ...dto } }); }
  async updateService(userId: string, id: string, dto: UpdateB2BServiceDto) { const member = await this.context(userId, true); await this.ownedService(member.organizationId, id); return this.prisma.b2BService.update({ where: { id }, data: dto }); }

  async bookings(userId: string, from?: string, to?: string) {
    const member=await this.context(userId,true);
    const start=from?new Date(from):undefined,end=to?new Date(to):undefined;
    if((start&&!Number.isFinite(start.getTime()))||(end&&!Number.isFinite(end.getTime())))throw new BadRequestException('Некорректный период календаря');
    if(Boolean(start)!==Boolean(end))throw new BadRequestException('Укажите обе границы периода календаря');
    if(start&&end&&(end<=start||end.getTime()-start.getTime()>93*86400000))throw new BadRequestException('Выберите период от одного дня до трёх месяцев');
    const rows=await this.prisma.b2BBooking.findMany({where:{organizationId:member.organizationId,...(start&&end?{startTime:{lt:end},endTime:{gt:start}}:{})},include:{client:true,service:true,masterMember:{include:{user:{select:{firstName:true,lastName:true}}}}},orderBy:{startTime:'asc'},...(start&&end?{}:{take:500})});
    return protectB2BFinance(rows,member.canSeeFinance);
  }

  async createBooking(userId: string, dto: CreateB2BBookingDto) {
    const member = await this.context(userId, true);
    return protectB2BFinance(await this.salon.create(member.organizationId, dto, { id: userId, label: [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ') || 'Сотрудник' }), member.canSeeFinance);
  }

  async updateBooking(userId: string, id: string, dto: UpdateB2BBookingDto) {
    const member = await this.context(userId, true);
    return protectB2BFinance(await this.salon.update(member.organizationId, id, dto, { id: userId, label: [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ') || 'Сотрудник' }), member.canSeeFinance);
  }

  async bookingHistory(userId: string, id: string) {
    const member = await this.context(userId, true);
    return protectB2BFinance(await this.salon.history(member.organizationId, id), member.canSeeFinance);
  }

  async bookingDetail(userId: string, id: string) {
    const member = await this.context(userId, true);
    const booking = await this.prisma.b2BBooking.findFirst({ where: { id, organizationId: member.organizationId }, include: { client: true, service: true, masterMember: { include: { user: { select: { firstName: true, lastName: true } } } } } });
    if (!booking) throw new NotFoundException('Запись не найдена');
    return protectB2BFinance(booking, member.canSeeFinance);
  }

  async orders(userId: string) { const member = await this.context(userId); const orders = await this.prisma.order.findMany({ where: { organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true, execution: { select: { version: true } }, warehouseExecution: true, history: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 100 }); return protectB2BFinance(orders.map(customerOrderWarehouseView),member.canSeeFinance); }
  async orderHistory(userId: string, query: B2BOrderListDto) {
    const member = await this.context(userId);
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      organizationId: member.organizationId, source: OrderSource.B2B,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { items: { some: { OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { variantName: { contains: search, mode: 'insensitive' } },
          { externalSku: { contains: search, mode: 'insensitive' } },
        ] } } },
      ] } : {}),
    };
    const direction = query.sort === 'oldest' ? 'asc' : 'desc';
    const limit = 20;
    return this.prisma.$transaction(async tx => {
      const total = await tx.order.count({ where });
      const pages = Math.max(1, Math.ceil(total / limit));
      const page = Math.min(query.page || 1, pages);
      const rows = await tx.order.findMany({ where, include: { items: true, execution: { select: { version: true } }, warehouseExecution: true, history: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: [{ createdAt: direction }, { id: direction }], skip: (page - 1) * limit, take: limit });
      return { items: protectB2BFinance(rows.map(customerOrderWarehouseView), member.canSeeFinance), total, page, pages, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async createOrder(userId: string, dto: CreateB2BOrderDto, repeatSource?: string) {
    const member = await this.context(userId);
    if (!member.canOrder) throw new ForbiddenException('У вас нет права оформлять закупки');
    const purchaseRestriction = this.purchaseRestriction(member.organization.status);
    if (purchaseRestriction) throw new ForbiddenException(purchaseRestriction);
    if (!dto.requestKey || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(dto.requestKey)) throw new BadRequestException('Обновите страницу оформления заказа');
    if (!dto.items?.length || dto.items.length > 200) throw new BadRequestException('Добавьте от 1 до 200 позиций в заказ');
    const grouped = new Map<string, number>();
    for (const item of dto.items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new BadRequestException('Некорректное количество товара');
      const quantity = (grouped.get(item.variantId) || 0) + item.quantity;
      if (quantity > 10000) throw new BadRequestException('Слишком большое количество товара');
      grouped.set(item.variantId, quantity);
    }
    const items = [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity }));
    const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const checkoutKey = hash(['b2b-order:v1', member.organizationId, userId, dto.requestKey.toLowerCase()]);
    const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    const comments = dto.comments?.trim() || '';
    const checkoutRequestHash = hash(canonical({ items, shippingAddress: dto.shippingAddress || null, comments, repeatSource: repeatSource || null }));
    const result = await this.prisma.$transaction(async tx => {
      // Team changes and procurement serialize on the organization before member/user/SKU locks.
      // Current access and commercial terms are read only after these locks are acquired.
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE "organizationId"=${member.organizationId} AND "userId"=${userId} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR SHARE`;
      const currentMember = await businessMembership(tx, userId);
      if (currentMember.organizationId !== member.organizationId || currentMember.id !== member.id) throw new ConflictException('Доступ к организации изменился. Обновите кабинет');
      if (!currentMember.canOrder) throw new ForbiddenException('У вас нет права оформлять закупки');
      const restriction = this.purchaseRestriction(currentMember.organization.status);
      if (restriction) throw new ForbiddenException(restriction);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${checkoutKey}))`;
      const previous = await tx.order.findUnique({ where: { checkoutKey }, include: { items: true } });
      if (previous) {
        if (previous.userId !== userId || previous.organizationId !== member.organizationId || previous.source !== OrderSource.B2B) throw new NotFoundException('Заказ не найден');
        if (previous.checkoutRequestHash !== checkoutRequestHash) throw new ConflictException('Данные заказа изменились. Начните оформление заново');
        return { order: previous, canSeeFinance: currentMember.canSeeFinance };
      }
      // Stable lock order protects stock and the price snapshot against concurrent changes.
      for (const item of items) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${item.variantId} FOR UPDATE`;
      const variants = await tx.productVariant.findMany({ where: { id: { in: items.map(item => item.variantId) }, isActive: true,
        product: { isActive: true, productType: 'PHYSICAL' } }, include: { product: true } });
      if (variants.length !== items.length) throw new NotFoundException('Один из товаров не найден или выключен');
      const map = new Map(variants.map(item => [item.id, item]));
      const discount = new Prisma.Decimal(currentMember.organization.discountTier || 0);
      if (discount.lt(0) || discount.gt(100)) throw new BadRequestException('Условия закупки требуют проверки менеджером');
      const lines = items.map(item => {
        const variant = map.get(item.variantId)!;
        const price = new Prisma.Decimal(variant.price).mul(new Prisma.Decimal(100).minus(discount)).div(100).toDecimalPlaces(2);
        return { item, variant, price, total: price.mul(item.quantity) };
      });
      const total = lines.reduce((sum, line) => sum.plus(new Prisma.Decimal(line.variant.price).mul(line.item.quantity)), new Prisma.Decimal(0));
      const final = lines.reduce((sum, line) => sum.plus(line.total), new Prisma.Decimal(0));
      for (const line of lines) {
        await holdVerifiedOneCStock(tx, line.variant.id, line.item.quantity);
        const rows = await tx.$queryRaw<{ id: string }[]>`UPDATE "ProductVariant" SET reserved = reserved + ${line.item.quantity} WHERE id = ${line.variant.id} AND "isActive" = true AND stock - reserved >= ${line.item.quantity} AND inventory_sale_quantity(id,'B2B',stock,reserved) >= ${line.item.quantity} RETURNING id`;
        if (rows.length !== 1) throw new BadRequestException(`Недостаточно товара: ${line.variant.product.nameRu}`);
      }
      const created = await tx.order.create({ data: {
        orderNumber: `SB-B2B-${new Date().getFullYear()}-${randomUUID().slice(0, 12).toUpperCase()}`, checkoutKey, checkoutRequestHash,
        userId, customerId: currentMember.customerId, organizationId: currentMember.organizationId, source: OrderSource.B2B, sourceChannel: 'B2B', status: OrderStatus.NEW, reservationState: 'ACTIVE',
        buyerName: [currentMember.user.firstName, currentMember.user.lastName].filter(Boolean).join(' '), buyerEmail: currentMember.user.email, buyerPhone: currentMember.user.phone,
        totalAmount: total, discountAmount: total.minus(final), finalAmount: final,
        shippingAddress: (dto.shippingAddress || { address: currentMember.organization.legalAddress || '' }) as Prisma.InputJsonValue, comments,
        items: { create: lines.map(line => ({ variantId: line.variant.id, externalSku: line.variant.sku, productName: line.variant.product.nameRu, variantName: line.variant.name,
          price: line.price, quantity: line.item.quantity, total: line.total })) },
        history: { create: { toStatus: OrderStatus.NEW, changedBy: userId, comment: 'B2B-заказ создан в кабинете организации' } },
      }, include: { items: true } });
      await this.oneC.stageOrderExport(tx, created.id, userId);
      return { order: created, canSeeFinance: currentMember.canSeeFinance };
    }, { timeout: 30_000 });
    // Creation and idempotent replay use the same customer-safe projection as
    // the history endpoint; never expose checkout keys or internal 1C fields.
    return protectB2BFinance(customerOrderWarehouseView(result.order), result.canSeeFinance);
  }
  async repeatOrder(userId: string, orderId: string, dto: RepeatB2BOrderDto) {
    const member = await this.context(userId);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, organizationId: member.organizationId, source: OrderSource.B2B }, include: { items: true } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.items.some(item => !item.variantId)) throw new ConflictException('В заказе есть недоступные позиции. Соберите новую корзину из каталога');
    return this.createOrder(userId, { requestKey: dto.requestKey, items: order.items.map(item => ({ variantId: item.variantId!, quantity: item.quantity })),
      shippingAddress: order.shippingAddress as Record<string, unknown>, comments: `Повтор заказа ${order.orderNumber}` }, orderId);
  }

  async supportTickets(userId: string) { const member = await this.context(userId); return this.prisma.helpdeskTicket.findMany({ where: { organizationId: member.organizationId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async createSupportTicket(userId: string, dto: CreateB2BSupportDto) { const member = await this.context(userId); const priority = dto.priority || TicketPriority.MEDIUM; const hours = priority === TicketPriority.CRITICAL ? 1 : priority === TicketPriority.HIGH ? 4 : priority === TicketPriority.MEDIUM ? 8 : 24; return this.prisma.helpdeskTicket.create({ data: { number: `HD-B2B-${Date.now().toString().slice(-9)}`, subject: dto.subject, description: dto.description, priority, source: TicketSource.B2B, requesterUserId: userId, customerId: member.customerId, organizationId: member.organizationId, requesterName: [member.user.firstName, member.user.lastName].filter(Boolean).join(' '), requesterEmail: member.user.email, queue: 'B2B-клиенты', affectedService: 'B2B-кабинет', firstResponseDueAt: new Date(Date.now() + hours * 3600000), resolutionDueAt: new Date(Date.now() + hours * 4 * 3600000) } }); }

  private async ownedClient(organizationId: string, id: string) { const item = await this.prisma.b2BClient.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Клиент не найден'); return item; }
  private async ownedService(organizationId: string, id: string) { const item = await this.prisma.b2BService.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Услуга не найдена'); return item; }
  private async ownedMember(organizationId: string, id: string) { const item = await this.prisma.organizationMember.findFirst({ where: { id, organizationId, isActive: true } }); if (!item) throw new NotFoundException('Сотрудник организации не найден'); return item; }
}
