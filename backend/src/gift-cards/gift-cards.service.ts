import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { IssueGiftCardDto, ListGiftCardsDto, SaveGiftCardProductDto, UpdateGiftCardDto } from './gift-cards.dto';
import { generateGiftCode, giftAmountMinor, giftCardView, giftCodeHash, giftMoney, giftMoneyMinor, giftNominal, giftValidityDays, maskGiftCode, normalizeGiftCode } from './gift-cards.helpers';

type Tx = Prisma.TransactionClient;
export interface GiftCardPreview { cardId: string; availableMinor: number; expiresAt: Date; maskedCode: string; }
export interface GiftCardReservation { cardId: string; amountMinor: number; status: string; }

@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService, private readonly config: ConfigService) {}

  private requireKey() {
    // Match the helper's precedence exactly: an explicitly weak primary key cannot fall back to JWT.
    const key = this.config.get<string>('INTEGRATION_ENCRYPTION_KEY') || this.config.get<string>('JWT_SECRET');
    if (typeof key !== 'string' || key.trim().length < 32 || /^(.)\1+$/.test(key.trim()) || key === 'local-development-only') {
      throw new ServiceUnavailableException('Ключ шифрования сертификатов недоступен');
    }
  }

  private encrypted(code: string): string {
    this.requireKey();
    try {
      const payload = this.secrets.encrypt({ code });
      if (!payload) throw new Error('invalid');
      return payload;
    } catch { throw new ServiceUnavailableException('Ключ шифрования сертификатов недоступен'); }
  }

  private decrypted(card: any): string {
    this.requireKey();
    try {
      const code = this.secrets.decrypt(card.encryptedCode).code;
      if (!code || giftCodeHash(code) !== card.codeHash) throw new Error('invalid');
      return code;
    } catch { throw new ServiceUnavailableException('Ключ шифрования сертификатов недоступен'); }
  }

  private async lockOrder(tx: Tx, orderId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Заказ не найден');
  }

  private async lockCard(tx: Tx, id: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "GiftCard" WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Сертификат не найден');
  }

  private available(card: any, now = new Date()): number {
    if (!card || !card.isActive || card.currency !== 'RUB' || new Date(card.expiresAt).getTime() <= now.getTime() || new Date(card.issuedAt).getTime() > now.getTime()) {
      throw new BadRequestException('Сертификат недоступен или срок его действия истёк');
    }
    const balance = giftMoneyMinor(card.balance), reserved = giftMoneyMinor(card.reserved);
    if (reserved > balance) throw new ConflictException('Некорректный баланс сертификата');
    return balance - reserved;
  }

  private reservation(row: any): GiftCardReservation {
    return { cardId: row.cardId, amountMinor: giftMoneyMinor(row.amount), status: row.status };
  }

  async preview(code: string, tx?: Tx): Promise<GiftCardPreview> {
    const card = await (tx || this.prisma).giftCard.findUnique({ where: { codeHash: giftCodeHash(code) } });
    return { cardId: card?.id || '', availableMinor: this.available(card), expiresAt: card!.expiresAt, maskedCode: card!.maskedCode };
  }

  async reserve(tx: Tx, orderId: string, code: string, amountMinor: number): Promise<GiftCardReservation> {
    giftAmountMinor(amountMinor);
    const hash = giftCodeHash(code);
    await this.lockOrder(tx, orderId);
    const previous = await tx.giftCardRedemption.findUnique({ where: { orderId } });
    const found = await tx.giftCard.findUnique({ where: { codeHash: hash } });
    if (!found) throw new BadRequestException('Сертификат недоступен или срок его действия истёк');
    await this.lockCard(tx, found.id);
    const card = await tx.giftCard.findUnique({ where: { id: found.id } });
    if (previous) {
      if (previous.cardId !== found.id || giftMoneyMinor(previous.amount) !== amountMinor || previous.status === 'RELEASED') {
        throw new ConflictException('Резерв сертификата для этого заказа уже существует');
      }
      return this.reservation(previous);
    }
    if (this.available(card) < amountMinor) throw new ConflictException('Недостаточно средств на сертификате');
    await tx.giftCard.update({ where: { id: found.id }, data: { reserved: { increment: giftMoney(amountMinor) }, revision: { increment: 1 } } });
    return this.reservation(await tx.giftCardRedemption.create({ data: { orderId, cardId: found.id, amount: giftMoney(amountMinor), status: 'RESERVED' } }));
  }

  private async transition(tx: Tx, orderId: string, target: 'APPLIED' | 'RELEASED'): Promise<GiftCardReservation | null> {
    await this.lockOrder(tx, orderId);
    const found = await tx.giftCardRedemption.findUnique({ where: { orderId } });
    if (!found) return null;
    await this.lockCard(tx, found.cardId);
    const row = await tx.giftCardRedemption.findUnique({ where: { orderId } });
    if (!row) throw new ConflictException('Резерв сертификата изменился');
    if (row.status === target) return this.reservation(row);
    if (row.status !== 'RESERVED') throw new ConflictException('Операция с сертификатом уже завершена');
    const card = await tx.giftCard.findUnique({ where: { id: row.cardId } });
    const amountMinor = giftMoneyMinor(row.amount);
    if (!card || amountMinor <= 0 || giftMoneyMinor(card.reserved) < amountMinor || giftMoneyMinor(card.balance) < amountMinor) {
      throw new ConflictException('Некорректный резерв сертификата');
    }
    const changed = await tx.giftCardRedemption.updateMany({ where: { id: row.id, status: 'RESERVED' }, data: {
      status: target, ...(target === 'APPLIED' ? { appliedAt: new Date() } : { releasedAt: new Date() }),
    } });
    if (changed.count !== 1) throw new ConflictException('Резерв сертификата изменился');
    // A previously valid reserved payment can settle after expiry/deactivation. Release never revives spent funds.
    await tx.giftCard.update({ where: { id: row.cardId }, data: {
      reserved: { decrement: giftMoney(amountMinor) }, ...(target === 'APPLIED' ? { balance: { decrement: giftMoney(amountMinor) } } : {}), revision: { increment: 1 },
    } });
    return this.reservation({ ...row, status: target });
  }

  release(tx: Tx, orderId: string) { return this.transition(tx, orderId, 'RELEASED'); }
  apply(tx: Tx, orderId: string) { return this.transition(tx, orderId, 'APPLIED'); }

  private cardData(nominalMinor: number, validityDays: number, code: string, now: Date) {
    giftAmountMinor(nominalMinor); giftValidityDays(validityDays);
    return { codeHash: giftCodeHash(code), encryptedCode: this.encrypted(code), maskedCode: maskGiftCode(code), faceValue: giftMoney(nominalMinor),
      balance: giftMoney(nominalMinor), reserved: '0.00', currency: 'RUB' as const, validityDays, issuedAt: now,
      expiresAt: new Date(now.getTime() + validityDays * 86_400_000), isActive: true };
  }

  async issueForPaidOrder(tx: Tx, order: any): Promise<ReturnType<typeof giftCardView>[]> {
    if (!order?.id || order.paymentStatus !== 'SUCCEEDED' || order.currency !== 'RUB' || !Array.isArray(order.items)) {
      throw new BadRequestException('Сертификаты выпускаются только по подтверждённому оплаченному заказу');
    }
    await this.lockOrder(tx, order.id);
    const persisted = await tx.order.findUnique({ where: { id: order.id }, include: { items: true, payments: true } });
    if (!persisted || persisted.paymentStatus !== 'SUCCEEDED' || persisted.currency !== 'RUB') throw new ConflictException('Оплата заказа не подтверждена');
    const snapshot = persisted.priceSnapshot as Prisma.JsonObject | null;
    if (persisted.source !== 'WEB' || snapshot?.digitalDelivery !== true || !persisted.items.length || persisted.items.some(item => item.productType !== 'GIFT_CARD') ||
      giftMoneyMinor(persisted.discountAmount) !== 0 || persisted.bonusAmount !== 0 || giftMoneyMinor(persisted.giftCardAmount) !== 0 || giftMoneyMinor(persisted.shippingCost) !== 0 || persisted.promoCode) {
      throw new ConflictException('Выпуск требует отдельного заказа подарочных карт без скидок и доставки');
    }
    const faceTotal = persisted.items.reduce((sum, item) => sum + giftMoneyMinor(item.price) * item.quantity, 0);
    if (!Number.isSafeInteger(faceTotal) || faceTotal <= 0 || giftMoneyMinor(persisted.finalAmount) !== faceTotal || giftMoneyMinor(persisted.totalAmount) !== faceTotal ||
      !persisted.payments.some(payment => payment.orderId === persisted.id && payment.provider === 'YOOKASSA' && payment.status === 'SUCCEEDED' && payment.currency === 'RUB' &&
        !!payment.transactionId && giftMoneyMinor(payment.amount) === faceTotal)) {
      throw new ConflictException('Нет подтверждённого платежа на точную сумму подарочных карт');
    }
    // Re-read immutable database item snapshots, never trust variant/options or caller-modified item prices.
    const items = persisted.items.filter(item => item.productType === 'GIFT_CARD');
    for (const item of items) {
      if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new BadRequestException('Количество сертификатов должно быть от 1 до 99');
      giftValidityDays(item.giftCardValidityDays);
      const nominal = giftMoneyMinor(item.price);
      if (nominal < 100 || nominal > 100_000_000 || nominal % 100 !== 0 || giftMoneyMinor(item.total) !== nominal * item.quantity) throw new BadRequestException('Некорректный снимок номинала сертификата');
    }
    if (items.length) this.requireKey();
    const now = new Date(), result: ReturnType<typeof giftCardView>[] = [];
    for (const item of items) {
      for (let ordinal = 1; ordinal <= item.quantity; ordinal++) {
        const existing = await tx.giftCard.findUnique({ where: { sourceItemId_ordinal: { sourceItemId: item.id, ordinal } } });
        if (existing) {
          if (existing.sourceOrderId !== order.id || giftMoneyMinor(existing.faceValue) !== giftMoneyMinor(item.price)) throw new ConflictException('Снимок выпуска сертификата изменился');
          result.push(giftCardView(existing)); continue;
        }
        const card = await tx.giftCard.create({ data: { ...this.cardData(giftMoneyMinor(item.price), item.giftCardValidityDays!, generateGiftCode(), now),
          sourceOrderId: order.id, sourceItemId: item.id, ordinal, purchaserUserId: persisted.userId, reason: 'Выпуск по оплаченному заказу' } });
        await this.audit(tx, null, 'gift_card.issue_paid', card.id, { sourceOrderId: order.id, sourceItemId: item.id, ordinal });
        result.push(giftCardView(card));
      }
    }
    return result;
  }

  // INTERNAL ONLY. Parent must verify order owner or guest access before invoking this method.
  async revealForOrder(tx: Tx, orderId: string) {
    this.requireKey();
    const cards = await tx.giftCard.findMany({ where: { sourceOrderId: orderId }, orderBy: [{ sourceItemId: 'asc' }, { ordinal: 'asc' }] });
    return cards.map(card => ({ id: card.id, code: this.decrypted(card), maskedCode: card.maskedCode,
      faceValue: giftMoney(giftMoneyMinor(card.faceValue)), balance: giftMoney(giftMoneyMinor(card.balance)), expiresAt: card.expiresAt, isActive: card.isActive }));
  }

  generate() { return { code: generateGiftCode() }; }

  private async audit(tx: Tx, actorId: string | null, action: string, resourceId: string, payload: Prisma.InputJsonObject) {
    await tx.auditLog.create({ data: { actorId, action, resource: 'gift-card', resourceId, payload } });
  }

  async issue(dto: IssueGiftCardDto, actorId: string) {
    const nominal = giftNominal(dto.nominal), days = giftValidityDays(dto.validityDays ?? 365);
    if (typeof dto.reason !== 'string' || !dto.reason.trim() || dto.reason.trim().length > 500) throw new BadRequestException('Укажите причину выпуска сертификата');
    const code = dto.code !== undefined ? normalizeGiftCode(dto.code).match(/.{8}/g)!.join('-') : generateGiftCode();
    const data = { ...this.cardData(nominal * 100, days, code, new Date()), label: dto.label?.trim() || null, reason: dto.reason.trim() };
    try {
      return await this.prisma.$transaction(async tx => {
        const card = await tx.giftCard.create({ data });
        await this.audit(tx, actorId, 'gift_card.issue_manual', card.id, { nominal, validityDays: days });
        return giftCardView(card);
      });
    } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('Такой код сертификата уже существует'); throw error; }
  }

  async update(id: string, dto: UpdateGiftCardDto, actorId: string) {
    if (!Number.isInteger(dto.revision) || dto.revision < 1 || dto.revision > 2_147_483_646) throw new BadRequestException('Укажите текущую версию сертификата');
    if (dto.isActive !== undefined && typeof dto.isActive !== 'boolean') throw new BadRequestException('Некорректный статус сертификата');
    return this.prisma.$transaction(async tx => {
      await this.lockCard(tx, id);
      const card = await tx.giftCard.findUnique({ where: { id } });
      if (!card) throw new NotFoundException('Сертификат не найден');
      if (card.revision !== dto.revision) throw new ConflictException('Сертификат уже изменён. Обновите страницу');
      const expiry = dto.expiresAt === undefined ? card.expiresAt : new Date(dto.expiresAt);
      if (!Number.isFinite(expiry.getTime()) || expiry <= card.issuedAt) throw new BadRequestException('Срок действия должен быть позже даты выпуска');
      if ((dto.isActive ?? card.isActive) && expiry.getTime() <= Date.now()) throw new BadRequestException('Нельзя активировать сертификат с истёкшим сроком действия');
      const changed = await tx.giftCard.updateMany({ where: { id, revision: dto.revision }, data: { revision: { increment: 1 },
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}), ...(dto.expiresAt !== undefined ? { expiresAt: expiry } : {}),
        ...(dto.label !== undefined ? { label: dto.label?.trim() || null } : {}) } });
      if (changed.count !== 1) throw new ConflictException('Сертификат уже изменён. Обновите страницу');
      await this.audit(tx, actorId, 'gift_card.update', id, { revision: dto.revision + 1, isActive: dto.isActive ?? card.isActive, expiryChanged: dto.expiresAt !== undefined, labelChanged: dto.label !== undefined });
      return giftCardView(await tx.giftCard.findUniqueOrThrow({ where: { id } }));
    });
  }

  async reveal(id: string, actorId: string) {
    this.requireKey();
    return this.prisma.$transaction(async tx => {
      const card = await tx.giftCard.findUnique({ where: { id } });
      if (!card) throw new NotFoundException('Сертификат не найден');
      const code = this.decrypted(card);
      await this.audit(tx, actorId, 'gift_card.reveal', id, { revealed: true });
      return { id, code, maskedCode: card.maskedCode };
    });
  }

  async list(query: ListGiftCardsDto = {}) {
    const page = query.page ?? 1, limit = query.limit ?? 30, now = new Date();
    const where: Prisma.GiftCardWhereInput = query.status === 'active' ? { isActive: true, expiresAt: { gt: now } }
      : query.status === 'inactive' ? { isActive: false } : query.status === 'expired' ? { expiresAt: { lte: now } } : {};
    if (query.search?.trim()) where.OR = [{ maskedCode: { contains: query.search.trim(), mode: 'insensitive' } }, { label: { contains: query.search.trim(), mode: 'insensitive' } }];
    return this.prisma.$transaction(async tx => {
      const cards = await tx.giftCard.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
      return { items: cards.map(giftCardView), total: await tx.giftCard.count({ where }), page, limit };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private productView(product: any) {
    if (!product) return { id: null, slug: 'gift-card', productType: 'GIFT_CARD', nameRu: 'Подарочная карта',
      descriptionRu: 'Подарите возможность выбрать профессиональные материалы SARKISIAN BRAND.', denominations: [1000, 3000, 5000], validityDays: 365, isActive: false, imageUrl: null, variants: [] };
    if (product.productType !== 'GIFT_CARD') throw new ConflictException('Адрес gift-card занят другим товаром');
    const variants = product.variants.filter((v: any) => v.isActive);
    return { id: product.id, slug: product.slug, productType: product.productType, nameRu: product.nameRu, descriptionRu: product.descriptionRu ?? '',
      denominations: variants.map((v: any) => giftMoneyMinor(v.price) / 100).sort((a: number, b: number) => a - b),
      validityDays: product.giftCardValidityDays ?? 365, isActive: product.isActive, imageUrl: product.images[0]?.url ?? null,
      variants: variants.map((v: any) => ({ id: v.id, name: v.name, sku: v.sku, price: giftMoney(giftMoneyMinor(v.price)), options: v.options, isActive: v.isActive })) };
  }

  async getProduct() {
    return this.productView(await this.prisma.product.findUnique({ where: { slug: 'gift-card' }, include: { variants: true, images: { orderBy: { sortOrder: 'asc' } } } }));
  }

  async detail(id: string) {
    return this.prisma.$transaction(async tx => {
      const card = await tx.giftCard.findUnique({ where: { id }, include: { redemptions: { orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true } } } } } });
      if (!card) throw new NotFoundException('Подарочная карта не найдена');
      return { ...giftCardView(card), redemptions: card.redemptions.map(row => ({ id: row.id, orderId: row.orderId,
        orderNumber: row.order.orderNumber, amount: giftMoney(giftMoneyMinor(row.amount)), status: row.status,
        createdAt: row.createdAt, appliedAt: row.appliedAt, releasedAt: row.releasedAt })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async saveProduct(dto: SaveGiftCardProductDto, actorId: string) {
    if (typeof dto.nameRu !== 'string' || !dto.nameRu.trim() || dto.nameRu.length > 160 || typeof dto.descriptionRu !== 'string' || dto.descriptionRu.length > 20_000 || typeof dto.isActive !== 'boolean') throw new BadRequestException('Некорректные настройки товара');
    if (!Array.isArray(dto.denominations) || !dto.denominations.length || dto.denominations.length > 30 || new Set(dto.denominations).size !== dto.denominations.length) throw new BadRequestException('Укажите от 1 до 30 уникальных номиналов');
    const denominations = dto.denominations.map(giftNominal).sort((a, b) => a - b), validityDays = giftValidityDays(dto.validityDays ?? 365);
    if (dto.imageUrl != null && (typeof dto.imageUrl !== 'string' || dto.imageUrl.length > 2048 || !/^(?:\/(?!\/)|https:\/\/)/.test(dto.imageUrl) || /[\x00-\x20]/.test(dto.imageUrl))) throw new BadRequestException('Укажите безопасный URL изображения');
    try {
      return await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('gift-card-product'))`;
        let product = await tx.product.findUnique({ where: { slug: 'gift-card' }, include: { variants: true } });
        if (product && product.productType !== 'GIFT_CARD') throw new ConflictException('Адрес gift-card занят другим товаром');
        if (product) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${product.id} FOR UPDATE`;
        const data = { nameRu: dto.nameRu.trim(), descriptionRu: dto.descriptionRu, productType: 'GIFT_CARD', giftCardValidityDays: validityDays,
          basePrice: giftMoney(denominations[0] * 100), currency: 'RUB' as const, isActive: dto.isActive };
        product = product ? await tx.product.update({ where: { id: product.id }, data, include: { variants: true } })
          : await tx.product.create({ data: { ...data, sku: 'GIFT-CARD', slug: 'gift-card' }, include: { variants: true } });
        const retained: string[] = [];
        for (const nominal of denominations) {
          const sku = `GIFT-CARD-${nominal}`, previous = product.variants.find(v => v.sku === sku);
          const variantData = { name: `${nominal} ₽`, price: giftMoney(nominal * 100), options: { giftCard: true, nominal, validityDays }, isActive: true };
          const variant = previous ? await tx.productVariant.update({ where: { id: previous.id }, data: variantData })
            : await tx.productVariant.create({ data: { ...variantData, sku, productId: product.id, stock: 0, reserved: 0 } });
          retained.push(variant.id);
        }
        await tx.productVariant.updateMany({ where: { productId: product.id, id: { notIn: retained } }, data: { isActive: false } });
        if (dto.imageUrl !== undefined) {
          const image = await tx.productImage.findFirst({ where: { productId: product.id }, orderBy: { sortOrder: 'asc' } });
          if (dto.imageUrl) {
            if (image) await tx.productImage.update({ where: { id: image.id }, data: { url: dto.imageUrl, alt: dto.nameRu } });
            else await tx.productImage.create({ data: { productId: product.id, url: dto.imageUrl, alt: dto.nameRu, sortOrder: 0 } });
          } else if (image) await tx.productImage.delete({ where: { id: image.id } });
        }
        await this.audit(tx, actorId, 'gift_card.product_update', product.id, { denominations, validityDays, isActive: dto.isActive });
        return this.productView(await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true, images: { orderBy: { sortOrder: 'asc' } } } }));
      });
    } catch (error) { if ((error as any)?.code === 'P2002') throw new ConflictException('Артикул сертификата занят другим товаром'); throw error; }
  }
}
