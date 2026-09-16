import { BadRequestException, ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentGateway, PaymentSession, VerifiedPayment } from './payment-gateway';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';

const PAYABLE = [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_WAITING];
const ACTIVE = ['PENDING', 'CREATING', 'SUCCEEDED'];

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private timer?: NodeJS.Timeout;
  private recoveryInFlight = false;
  private recoveryCursor?: string;
  private readonly providerRequests = new Map<string, Promise<VerifiedPayment>>();

  constructor(private readonly prisma: PrismaService, private readonly gateway: PaymentGateway, private readonly orders: OrdersService, private readonly config: ConfigService) {}

  private externalCallsEnabled() { return String(this.config.get('STOREFRONT_EXTERNAL_CALLS_ENABLED', 'false')) === 'true'; }

  onModuleInit() {
    if (!this.externalCallsEnabled() || this.timer) return;
    this.timer = setInterval(() => { void this.recoverPendingPayments(); }, 60000);
    this.timer.unref();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  // Internal lifecycle hook only; never exposed as an unauthenticated HTTP endpoint.
  async recoverPendingPayments() {
    if (!this.externalCallsEnabled() || this.recoveryInFlight) return;
    this.recoveryInFlight = true;
    try {
      await this.gateway.assertAvailable();
      const candidates = await this.prisma.payment.findMany({
        where: { provider: 'YOOKASSA', status: { in: ['CREATING', 'PENDING'] }, createdAt: { lt: new Date(Date.now() - 60000) } },
        include: { order: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20,
        ...(this.recoveryCursor ? { cursor: { id: this.recoveryCursor }, skip: 1 } : {}),
      });
      this.recoveryCursor = candidates.length ? candidates[candidates.length - 1].id : undefined;
      for (const candidate of candidates) {
        if (!this.externalCallsEnabled()) break;
        try { await this.reconcilePayment(candidate, candidate.order.orderNumber); }
        catch { this.logger.warn(`Платёж ${candidate.id}: результат пока не подтверждён; резерв автоматически не освобождается.`); }
      }
    } catch { this.recoveryCursor = undefined; this.logger.warn('Сверка платежей отложена: ЮKassa отключена, не настроена или недоступна.'); }
    finally { this.recoveryInFlight = false; }
  }

  capabilities() { return this.gateway.capabilities(); }

  async create(orderNumber: string, dto: CreatePaymentDto, actor?: { sub: string; role?: string }, accessToken?: string): Promise<PaymentSession> {
    const authorized = await this.orders.getAccessible(orderNumber, actor, accessToken);
    if (new Prisma.Decimal(authorized.finalAmount).equals(0)) throw new BadRequestException('Этот заказ не требует онлайн-оплаты. Обновите страницу заказа.');
    await this.gateway.assertAvailable();
    const returnUrl = this.gateway.validateReturnUrl(dto.returnUrl || `/orders/${encodeURIComponent(orderNumber)}`);
    const payment = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${authorized.id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: authorized.id } });
      if (!PAYABLE.includes(order.status as any) || ['PAID', 'SUCCEEDED'].includes(order.paymentStatus || '')) throw new BadRequestException('Этот заказ нельзя оплатить: он уже оплачен, отменён или завершён.');
      if (order.reservationState === 'ACTIVE') {
        const snapshot = (order.priceSnapshot || {}) as Record<string, unknown>;
        if (snapshot.deliveryConfirmed !== true && snapshot.digitalDelivery !== true) throw new BadRequestException('Сначала подтвердите способ и стоимость доставки.');
        if (!order.reservationExpiresAt || order.reservationExpiresAt.getTime() <= Date.now()) throw new ConflictException('Срок резервирования товаров истёк. Оформите заказ заново.');
      } else if (order.source === 'WEB' || order.source === 'B2B') {
        throw new ConflictException('Заказ не содержит действующего резерва. Требуется проверка перед оплатой.');
      }
      if (order.currency !== 'RUB' || new Prisma.Decimal(order.finalAmount).lte(0)) throw new BadRequestException('Некорректная сумма или валюта заказа.');
      const current = await tx.payment.findFirst({ where: { orderId: order.id, status: { in: ACTIVE } }, orderBy: { createdAt: 'desc' } });
      if (current) {
        if (current.provider !== 'YOOKASSA') throw new ConflictException('В заказе найден старый платёж. Требуется проверка администратором.');
        if (!new Prisma.Decimal(current.amount).equals(order.finalAmount) || current.currency !== order.currency) throw new ConflictException('Сумма заказа изменилась. Сначала проверьте существующий платёж.');
        if (current.status === 'SUCCEEDED') throw new ConflictException('Платёж уже подтверждён. Обновите заказ.');
        return current;
      }
      const created = await tx.payment.create({ data: { orderId: order.id, amount: order.finalAmount, currency: order.currency, provider: 'YOOKASSA', status: 'CREATING', metadata: { idempotenceKey: randomUUID(), returnUrl } } });
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_WAITING, paymentStatus: 'PENDING' } });
      return created;
    });
    const verified = await this.fetchVerified(payment, orderNumber);
    this.verifyMatches(payment, orderNumber, verified);
    if (verified.status === 'pending' && (!verified.confirmation?.confirmation_url || verified.confirmation.type !== 'redirect')) throw new ServiceUnavailableException('ЮKassa не вернула ссылку для оплаты. Повторите попытку позже.');
    await this.persistAndSettle(payment, orderNumber, verified);
    return this.session(verified);
  }

  private fetchVerified(payment: { id: string; orderId: string; transactionId: string | null; amount: any; currency: string; metadata: any; createdAt: Date }, orderNumber: string): Promise<VerifiedPayment> {
    const existing = this.providerRequests.get(payment.id);
    if (existing) return existing;
    const operation = (async () => {
      if (payment.transactionId) return await this.gateway.getPayment(payment.transactionId);
      const metadata = (payment.metadata || {}) as Record<string, unknown>;
      if (typeof metadata.idempotenceKey !== 'string' || typeof metadata.returnUrl !== 'string') throw new ConflictException('Платёж не содержит безопасного ключа повторной попытки. Требуется проверка администратором.');
      if (Date.now() - payment.createdAt.getTime() >= 23 * 60 * 60 * 1000) throw new ConflictException('Срок безопасной повторной попытки истёк. Проверьте платёж в ЮKassa перед новой оплатой.');
      this.gateway.validateReturnUrl(metadata.returnUrl);
      return await this.gateway.createPayment({ orderId: payment.orderId, orderNumber, localPaymentId: payment.id, idempotenceKey: metadata.idempotenceKey, amount: new Prisma.Decimal(payment.amount).toFixed(2), currency: payment.currency, returnUrl: metadata.returnUrl });
    })();
    this.providerRequests.set(payment.id, operation);
    const clear = () => { if (this.providerRequests.get(payment.id) === operation) this.providerRequests.delete(payment.id); };
    void operation.then(clear, clear);
    return operation;
  }

  private async reconcilePayment(payment: any, orderNumber: string) {
    const verified = await this.fetchVerified(payment, orderNumber);
    this.verifyMatches(payment, orderNumber, verified);
    await this.persistAndSettle(payment, orderNumber, verified);
  }

  private async persistAndSettle(payment: { id: string; orderId: string }, orderNumber: string, verified: VerifiedPayment) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
      const latest = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (latest.transactionId && latest.transactionId !== verified.id) throw new ConflictException('Обнаружено несоответствие платежа. Требуется проверка администратором.');
      this.verifyMatches(latest, orderNumber, verified);
      await tx.payment.update({ where: { id: payment.id }, data: { transactionId: verified.id, ...(latest.status === 'CREATING' ? { status: 'PENDING' } : {}) } });
    });
    await this.orders.settleVerifiedPayment(verified.id, this.status(verified), this.settlementMetadata(payment, verified));
  }

  async webhook(dto: PaymentWebhookDto) {
    const paymentId = dto.object?.id;
    if (dto.type !== 'notification' || !['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture'].includes(dto.event) || typeof paymentId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(paymentId)) throw new BadRequestException('Некорректное уведомление ЮKassa.');
    const payment = await this.prisma.payment.findUnique({ where: { transactionId: paymentId }, include: { order: true } });
    if (!payment || payment.provider !== 'YOOKASSA') throw new ServiceUnavailableException('Платёж пока не зарегистрирован. Повторите уведомление позже.');
    const verified = await this.fetchVerified(payment, payment.order.orderNumber);
    this.verifyMatches(payment, payment.order.orderNumber, verified);
    const status = this.status(verified);
    return this.orders.settleVerifiedPayment(verified.id, status, this.settlementMetadata(payment, verified));
  }

  private verifyMatches(payment: { id: string; orderId: string; transactionId: string | null; amount: any; currency: string }, orderNumber: string, verified: VerifiedPayment) {
    if ((payment.transactionId && payment.transactionId !== verified.id) || !/^\d{1,13}\.\d{2}$/.test(verified.amount?.value || '')
      || !new Prisma.Decimal(payment.amount).equals(verified.amount.value) || payment.currency !== verified.amount.currency
      || verified.metadata?.order_id !== payment.orderId || verified.metadata?.order_number !== orderNumber || verified.metadata?.payment_id !== payment.id
      || (verified.status === 'succeeded' && verified.paid !== true)) throw new BadRequestException('Данные подтверждённого платежа не соответствуют заказу.');
  }

  private status(payment: VerifiedPayment): 'SUCCEEDED' | 'CANCELED' | 'PENDING' {
    if (payment.status === 'succeeded') return 'SUCCEEDED';
    if (payment.status === 'canceled') return 'CANCELED';
    if (['pending', 'waiting_for_capture'].includes(payment.status)) return 'PENDING';
    throw new BadRequestException('Неизвестный статус платежа ЮKassa.');
  }

  private settlementMetadata(payment: { id: string; orderId: string }, verified: VerifiedPayment) {
    return { provider: 'YOOKASSA', orderId: payment.orderId, localPaymentId: payment.id, amount: verified.amount.value, currency: verified.amount.currency, providerStatus: verified.status, paid: verified.paid, test: verified.test, metadata: verified.metadata };
  }

  private session(payment: VerifiedPayment): PaymentSession {
    return { provider: 'YOOKASSA', paymentId: payment.id, status: this.status(payment), confirmationUrl: payment.status === 'pending' ? payment.confirmation?.confirmation_url || null : null };
  }
}
