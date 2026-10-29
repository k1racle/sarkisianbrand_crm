import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentGateway, PaymentRequest, PaymentSession, VerifiedPayment } from './payment-gateway';
import { TBankGateway } from './tbank.gateway';
import { RobokassaGateway } from './robokassa.gateway';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { assertCoursePurchasable, courseSalesEnabled } from '../lms/lms-purchase.service';

type Provider = 'TBANK' | 'ROBOKASSA';
const payable = [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_WAITING];
const active = ['CREATING', 'PENDING', 'SUCCEEDED'];
const prefix = (provider: Provider, id: string) => `${provider}:${id}`;

@Injectable()
export class AlternativePaymentsService {
  private readonly inflight = new Map<string, Promise<VerifiedPayment>>();
  constructor(private readonly prisma: PrismaService, private readonly orders: OrdersService, private readonly config: ConfigService,
    private readonly yoo: PaymentsService, private readonly tbank: TBankGateway, private readonly robo: RobokassaGateway) {}

  private select(value: string): { provider: Provider; gateway: TBankGateway | RobokassaGateway } {
    if (value.toUpperCase() === 'TBANK') return { provider: 'TBANK', gateway: this.tbank };
    if (value.toUpperCase() === 'ROBOKASSA') return { provider: 'ROBOKASSA', gateway: this.robo };
    throw new BadRequestException('Неизвестный способ оплаты.');
  }
  async providers() {
    const providers = await Promise.all([this.yoo.capabilities(), this.tbank.capabilities(), this.robo.capabilities()]);
    return { providers: providers.map(item => item.provider !== 'YOOKASSA' && item.environment === 'TEST' && String(this.config.get('PAYMENT_TEST_SETTLEMENT_ENABLED', 'false')) !== 'true'
      ? { ...item, available: false, reason: 'Тестовые платежи отключены в этом окружении.' } : item) };
  }
  private assertTestAllowed(isTest: boolean) {
    if (isTest && String(this.config.get('PAYMENT_TEST_SETTLEMENT_ENABLED', 'false')) !== 'true') throw new ServiceUnavailableException('Тестовые платежи не могут изменить заказ в этом окружении.');
  }
  private request(payment: any, orderNumber: string): PaymentRequest {
    const meta = (payment.metadata || {}) as Record<string, unknown>;
    if (typeof meta.idempotenceKey !== 'string' || typeof meta.returnUrl !== 'string') throw new ConflictException('Не найдены параметры попытки оплаты. Нужна сверка.');
    return { orderId: payment.orderId, orderNumber, localPaymentId: payment.id, idempotenceKey: meta.idempotenceKey, amount: new Prisma.Decimal(payment.amount).toFixed(2), currency: payment.currency, returnUrl: meta.returnUrl, ...(payment.invoiceId ? { invoiceId: payment.invoiceId } : {}) };
  }
  async create(providerName: string, orderNumber: string, dto: CreatePaymentDto, actor?: { sub: string; role?: string }, accessToken?: string): Promise<PaymentSession> {
    const { provider, gateway } = this.select(providerName);
    if (dto.provider && dto.provider !== provider) throw new BadRequestException('Способ оплаты в запросе не совпадает с выбранным.');
    const authorized = await this.orders.getAccessible(orderNumber, actor, accessToken);
    if (new Prisma.Decimal(authorized.finalAmount).lte(0)) throw new BadRequestException('Этот заказ не требует онлайн-оплаты.');
    await gateway.assertAvailable();
    const capability = await gateway.capabilities();
    this.assertTestAllowed(capability.environment === 'TEST');
    const returnUrl = gateway.validateReturnUrl(dto.returnUrl || `/orders/${encodeURIComponent(orderNumber)}`);
    const payment = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${authorized.id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: authorized.id } });
      if (order.source === 'B2B' && await tx.orderFinanceEntry.count({ where: { orderId: order.id } })) throw new ConflictException('По заказу ведётся ручной журнал расчётов. Требуется сверка.');
      if (!payable.includes(order.status as any) || ['PAID', 'SUCCEEDED'].includes(order.paymentStatus || '')) throw new BadRequestException('Заказ уже оплачен, отменён или завершён.');
      if (order.reservationState !== 'ACTIVE' || !order.reservationExpiresAt || order.reservationExpiresAt.getTime() <= Date.now()) throw new ConflictException('Нет действующего резерва заказа.');
      const snapshot = (order.priceSnapshot || {}) as Record<string, unknown>;
      if (snapshot.deliveryConfirmed !== true && snapshot.digitalDelivery !== true) throw new BadRequestException('Сначала подтвердите стоимость доставки.');
      if (order.currency !== 'RUB' || new Prisma.Decimal(order.finalAmount).lte(0)) throw new BadRequestException('Некорректная сумма заказа.');
      const current = await tx.payment.findFirst({ where: { orderId: order.id, status: { in: active } }, orderBy: { createdAt: 'desc' } });
      if (current) {
        if (current.provider !== provider) throw new ConflictException('По заказу уже есть активная попытка оплаты. Завершите её или обратитесь в поддержку.');
        if (current.status === 'SUCCEEDED' || !new Prisma.Decimal(current.amount).equals(order.finalAmount) || current.currency !== order.currency) throw new ConflictException('Действующий платёж требует сверки.');
        const meta = (current.metadata || {}) as Record<string, unknown>;
        if (meta.environment !== capability.environment) throw new ConflictException('Окружение платежа изменилось. Требуется сверка.');
        return current;
      }
      await assertCoursePurchasable(tx, order, courseSalesEnabled(this.config));
      const created = await tx.payment.create({ data: { orderId: order.id, amount: order.finalAmount, currency: order.currency, provider, status: 'CREATING', metadata: { idempotenceKey: randomUUID(), returnUrl, environment: capability.environment, initStarted: false } } });
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_WAITING, paymentStatus: 'PENDING', paymentMethod: provider } });
      return created;
    });
    const verified = await this.initial(provider, gateway, payment, orderNumber);
    this.match(payment, provider, orderNumber, verified);
    await this.persist(payment, provider, orderNumber, verified);
    const oldUrl = ((payment.metadata || {}) as Record<string, unknown>).confirmationUrl;
    return { provider, paymentId: verified.id, status: this.status(verified), confirmationUrl: verified.status === 'pending' ? verified.confirmation?.confirmation_url || (typeof oldUrl === 'string' ? oldUrl : null) : null };
  }
  private initial(provider: Provider, gateway: TBankGateway | RobokassaGateway, payment: any, orderNumber: string): Promise<VerifiedPayment> {
    const previous = this.inflight.get(payment.id); if (previous) return previous;
    const work = (async () => {
      const request = this.request(payment, orderNumber);
      if (provider === 'ROBOKASSA') return gateway.createPayment(request); // deterministic signed URL, no external call
      if (payment.transactionId) return this.tbank.getPayment(payment.transactionId.slice('TBANK:'.length), request);
      const meta = (payment.metadata || {}) as Record<string, unknown>;
      if (meta.initStarted !== false) throw new ConflictException('Результат предыдущего запроса Т-Банка неизвестен. Проверьте платёж перед повтором.');
      // Cross-process claim before external POST. An uncertain Init is never resent.
      const claim = await this.prisma.payment.updateMany({ where: { id: payment.id, provider, status: 'CREATING', transactionId: null, metadata: { path: ['initStarted'], equals: false } }, data: { metadata: { ...meta, initStarted: true } as Prisma.InputJsonValue } });
      if (claim.count !== 1) throw new ConflictException('Попытка оплаты уже выполняется или требует сверки.');
      return this.tbank.createPayment(request);
    })();
    this.inflight.set(payment.id, work);
    void work.finally(() => { if (this.inflight.get(payment.id) === work) this.inflight.delete(payment.id); }).catch(() => undefined);
    return work;
  }
  private match(payment: any, provider: Provider, orderNumber: string, value: VerifiedPayment) {
    if (payment.provider !== provider || (payment.transactionId && payment.transactionId !== prefix(provider, value.id)) || !/^\d{1,13}\.\d{2}$/.test(value.amount?.value || '') || !new Prisma.Decimal(payment.amount).equals(value.amount.value) || payment.currency !== value.amount.currency || value.metadata?.order_id !== payment.orderId || value.metadata?.order_number !== orderNumber || value.metadata?.payment_id !== payment.id || (value.status === 'succeeded' && !value.paid)) throw new BadRequestException('Данные платежа не совпадают с заказом.');
    const environment = (payment.metadata || {}).environment;
    if (!['TEST', 'PRODUCTION'].includes(environment) || (environment === 'TEST') !== value.test) throw new ConflictException('Окружение платежа изменилось. Требуется сверка.');
    this.assertTestAllowed(value.test);
  }
  private status(value: VerifiedPayment): 'PENDING' | 'SUCCEEDED' | 'CANCELED' { return value.status === 'succeeded' ? 'SUCCEEDED' : value.status === 'canceled' ? 'CANCELED' : 'PENDING'; }
  private async persist(payment: any, provider: Provider, orderNumber: string, verified: VerifiedPayment) {
    const transactionId = prefix(provider, verified.id);
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
      const latest = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      this.match(latest, provider, orderNumber, verified);
      const old = (latest.metadata || {}) as Record<string, unknown>;
      await tx.payment.update({ where: { id: payment.id }, data: { transactionId, ...(latest.status === 'CREATING' ? { status: 'PENDING' } : {}), metadata: { ...old, ...(verified.confirmation?.confirmation_url ? { confirmationUrl: verified.confirmation.confirmation_url } : {}) } as Prisma.InputJsonValue } });
    });
    return this.orders.settleVerifiedPayment(transactionId, this.status(verified), { provider, orderId: payment.orderId, localPaymentId: payment.id, amount: verified.amount.value, currency: verified.amount.currency, providerStatus: verified.status, paid: verified.paid, test: verified.test, metadata: verified.metadata });
  }
  async roboResult(payload: Record<string, unknown>) {
    const result = await this.robo.verifyNotification(payload);
    const payment = await this.prisma.payment.findUnique({ where: { invoiceId: result.invoiceId }, include: { order: true } });
    if (!payment || payment.provider !== 'ROBOKASSA' || !payment.order) throw new ServiceUnavailableException('Платёж пока не зарегистрирован. Повторите уведомление позже.');
    const cap = await this.robo.capabilities(), meta = (payment.metadata || {}) as Record<string, unknown>;
    if (result.localPaymentId !== payment.id || meta.environment !== cap.environment || !new Prisma.Decimal(payment.amount).equals(result.amount)) throw new BadRequestException('Данные платежа не совпадают с заказом.');
    const verified: VerifiedPayment = { id: String(result.invoiceId), status: 'succeeded', paid: true, test: cap.environment === 'TEST', amount: { value: result.amount, currency: 'RUB' }, metadata: { order_id: payment.orderId, order_number: payment.order.orderNumber, payment_id: payment.id } };
    this.match(payment, 'ROBOKASSA', payment.order.orderNumber, verified);
    await this.persist(payment, 'ROBOKASSA', payment.order.orderNumber, verified);
    return `OK${result.invoiceId}`;
  }
  async tbankResult(payload: Record<string, unknown>) {
    const result = await this.tbank.verifyNotification(payload);
    const payment = await this.prisma.payment.findUnique({ where: { id: result.orderId }, include: { order: true } });
    if (!payment || payment.provider !== 'TBANK' || !payment.order) throw new ServiceUnavailableException('Платёж пока не зарегистрирован. Повторите уведомление позже.');
    const cap = await this.tbank.capabilities(), meta = (payment.metadata || {}) as Record<string, unknown>;
    if (meta.environment !== cap.environment) throw new ConflictException('Окружение платежа изменилось. Требуется сверка.');
    const verified = await this.tbank.getPayment(result.id, this.request(payment, payment.order.orderNumber));
    this.match(payment, 'TBANK', payment.order.orderNumber, verified);
    await this.persist(payment, 'TBANK', payment.order.orderNumber, verified);
    return 'OK';
  }
}
