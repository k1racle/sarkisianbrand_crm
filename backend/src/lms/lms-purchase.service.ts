import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoursePurchaseDto } from './lms.dto';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function courseSalesEnabled(config: ConfigService) {
  return config.get('LMS_COURSE_SALES_ENABLED', 'false') === 'true' && config.get('STOREFRONT_EXTERNAL_CALLS_ENABLED', 'false') === 'true';
}

/** Called with the order row locked. Existing purchases stay viewable but cannot
 * start a new payment when the course/tariff has been removed from sale. */
export async function assertCoursePurchasable(tx: Prisma.TransactionClient, order: { id: string; sourceChannel: string; userId: string | null; finalAmount: Prisma.Decimal; currency: string; priceSnapshot: Prisma.JsonValue | null }, enabled: boolean) {
  if (order.sourceChannel !== 'COURSE') return;
  if (!enabled) throw new ServiceUnavailableException('Покупка курсов пока не подключена');
  const identity = await tx.coursePurchase.findUnique({ where: { orderId: order.id }, select: { courseId: true, userId: true } });
  if (!identity) throw new ConflictException('Заказ курса требует проверки перед оплатой');
  // Consistent with purchase creation and confirmed-payment review:
  // order row (when present) → user → course.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${identity.userId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${identity.courseId} FOR UPDATE`;
  const purchase = await tx.coursePurchase.findUnique({ where: { orderId: order.id }, include: { course: true, tariff: true } });
  const snapshot = order.priceSnapshot && typeof order.priceSnapshot === 'object' && !Array.isArray(order.priceSnapshot) ? order.priceSnapshot as Record<string, unknown> : {};
  if (!purchase || purchase.status !== 'PENDING' || purchase.userId !== order.userId || purchase.courseId !== purchase.tariff.courseId || purchase.id !== snapshot.coursePurchaseId || purchase.currency !== order.currency || !purchase.amount.equals(order.finalAmount))
    throw new ConflictException('Заказ курса требует проверки перед оплатой');
  const [otherReview, orphanReview] = await Promise.all([
    tx.coursePurchase.findFirst({ where: { userId: purchase.userId, courseId: purchase.courseId, status: 'PAYMENT_REVIEW', id: { not: purchase.id } }, select: { id: true } }),
    tx.order.findFirst({ where: { userId: purchase.userId, sourceChannel: 'COURSE', paymentStatus: 'SUCCEEDED', coursePurchase: { is: null }, priceSnapshot: { path: ['coursePaymentReview'], equals: true } }, select: { id: true } }),
  ]);
  if (otherReview || orphanReview) throw new ConflictException('Оплата курса подтверждена, заказ на проверке; обратитесь в поддержку, повторная оплата не нужна.');
  if (purchase.course.status !== 'PUBLISHED' || !purchase.course.isActive || !purchase.tariff.isActive) throw new ConflictException('Курс или тариф больше не доступны для покупки');
  // Price and duration are snapshots: an already-created order must never be
  // silently charged at a new price or give a different period of access.
  if (!purchase.amount.equals(purchase.tariff.price) || purchase.accessDays !== purchase.tariff.accessDays) throw new ConflictException('Условия тарифа изменились. Оформите курс заново');
  const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: purchase.userId, courseId: purchase.courseId } } });
  if (enrollment && (['REVOKED','SUSPENDED'].includes(enrollment.accessStatus) || (enrollment.accessStatus === 'ACTIVE' && (!enrollment.accessExpiresAt || enrollment.accessExpiresAt > new Date())))) throw new ConflictException('Доступ к курсу уже предоставлен или требует проверки');
}

@Injectable()
export class LmsPurchaseService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}
  async create(userId: string, dto: CreateCoursePurchaseDto, key?: string) {
    if (!courseSalesEnabled(this.config)) throw new ServiceUnavailableException('Покупка курсов пока не подключена');
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new BadRequestException('Обновите страницу и повторите оформление');
    if (dto.acceptedTerms !== true || !Number.isFinite(dto.expectedPrice) || dto.expectedPrice <= 0 || new Prisma.Decimal(dto.expectedPrice).decimalPlaces() > 2) throw new BadRequestException('Подтвердите условия и проверьте стоимость курса');
    const keyHash = hash(`${userId}\0${key}`), requestHash = hash(JSON.stringify({ courseId: dto.courseId, tariffId: dto.tariffId, expectedPrice: new Prisma.Decimal(dto.expectedPrice).toFixed(2) }));
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`course-purchase-key:${keyHash}`}, 0))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`course-purchase:${userId}:${dto.courseId}`}, 0))`;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const account = await tx.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true, email: true, firstName: true, lastName: true, role: true } });
      if (!account?.isActive || !['CUSTOMER_B2C','CUSTOMER_B2B'].includes(account.role)) throw new NotFoundException('Учётная запись недоступна');
      const existing = await tx.coursePurchase.findUnique({ where: { userId_requestKeyHash: { userId, requestKeyHash: keyHash } }, include: { order: true } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new ConflictException('Условия заказа изменились. Начните оформление заново');
        return { id: existing.id, orderNumber: existing.order.orderNumber, amount: existing.amount, currency: existing.currency, status: existing.status, expiresAt: existing.order.reservationExpiresAt };
      }
      const [course] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Course" WHERE id = ${dto.courseId} FOR UPDATE`;
      if (!course) throw new NotFoundException('Курс не найден');
      const tariff = await tx.courseTariff.findFirst({ where: { id: dto.tariffId, courseId: dto.courseId, isActive: true, course: { status: 'PUBLISHED', isActive: true } }, include: { course: true } });
      if (!tariff) throw new NotFoundException('Курс или тариф недоступны');
      if (tariff.price.lte(0)) throw new BadRequestException('Этот тариф пока нельзя оформить онлайн');
      if (!tariff.price.equals(dto.expectedPrice)) throw new ConflictException('Стоимость изменилась. Проверьте новый тариф перед оплатой');
      const current = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: dto.courseId } } });
      if (current && ['REVOKED','SUSPENDED'].includes(current.accessStatus)) throw new ConflictException('Доступ к курсу ограничен. Свяжитесь с поддержкой перед покупкой');
      if (current?.accessStatus === 'ACTIVE' && (!current.accessExpiresAt || current.accessExpiresAt > new Date())) throw new ConflictException('У вас уже есть доступ к этому курсу');
      const orphanReview = await tx.order.findFirst({ where: { userId, sourceChannel: 'COURSE', paymentStatus: 'SUCCEEDED', coursePurchase: { is: null }, priceSnapshot: { path: ['coursePaymentReview'], equals: true } }, select: { id: true } });
      if (orphanReview) throw new ConflictException('Оплаченный заказ курса требует проверки. Обратитесь в поддержку до новой покупки.');
      const review = await tx.coursePurchase.findFirst({ where: { userId, courseId: dto.courseId, status: 'PAYMENT_REVIEW' }, select: { id: true } });
      if (review) throw new ConflictException('Оплата курса подтверждена, заказ на проверке; обратитесь в поддержку, повторная оплата не нужна.');
      const pending = await tx.coursePurchase.findFirst({ where: { userId, courseId: dto.courseId, status: 'PENDING', order: { OR: [{ reservationState: 'ACTIVE', reservationExpiresAt: { gt: new Date() } }, { payments: { some: { status: { in: ['CREATING','PENDING','SUCCEEDED'] } } } }] } }, select: { id: true } });
      if (pending) throw new ConflictException('У вас уже есть ожидающий оплаты заказ на этот курс');
      const purchaseId = randomUUID(), expiresAt = new Date(Date.now() + 30 * 60_000);
      const order = await tx.order.create({ data: { orderNumber: `SB-C-${randomUUID().toUpperCase()}`, userId, source: 'WEB', sourceChannel: 'COURSE', buyerEmail: account.email, buyerName: [account.firstName,account.lastName].filter(Boolean).join(' ') || 'Покупатель',
        status: 'NEW', totalAmount: tariff.price, finalAmount: tariff.price, currency: 'RUB', shippingCost: 0, shippingAddress: { deliveryMethod: 'DIGITAL' }, reservationState: 'ACTIVE', reservationExpiresAt: expiresAt,
        oneCSyncError: 'Услуга обучения требует отдельного учёта и сверки в 1С', priceSnapshot: { digitalDelivery: true, deliveryConfirmed: true, kind: 'COURSE', coursePurchaseId: purchaseId, acceptedTermsAt: new Date().toISOString() },
        items: { create: { productName: tariff.course.titleRu, productType: 'COURSE', variantName: tariff.title, price: tariff.price, quantity: 1, total: tariff.price } }, history: { create: { toStatus: 'NEW', comment: 'Создан заказ на обучение; оплата не подтверждена' } } } });
      const purchase = await tx.coursePurchase.create({ data: { id: purchaseId, userId, courseId: dto.courseId, tariffId: tariff.id, orderId: order.id, requestKeyHash: keyHash, requestHash, courseTitle: tariff.course.titleRu, tariffTitle: tariff.title, amount: tariff.price, currency: 'RUB', accessDays: tariff.accessDays, status: 'PENDING' } });
      return { id: purchase.id, orderNumber: order.orderNumber, amount: purchase.amount, currency: purchase.currency, status: purchase.status, expiresAt };
    }, { timeout: 30000 });
  }
}
