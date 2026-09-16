import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

describe('Корзина: владение, доступные остатки и стабильный итог', () => {
  let service: CartService;
  let prisma: any;
  let tx: any;
  let cart: any;
  let variant: any;
  let items: any[];
  beforeEach(() => {
    variant = { id: 'variant-1', stock: 5, reserved: 2, isActive: true, price: '173.99', product: { isActive: true } };
    items = [];
    const state = () => ({ ...cart, items: items.map(item => ({ ...item, variant })) });
    cart = { id: 'cart-1', userId: null, sessionId: 'mock-session-12345' };
    tx = { $queryRaw: jest.fn(async () => []), cart: { upsert: jest.fn(async () => state()), findUniqueOrThrow: jest.fn(async () => state()), update: jest.fn(async ({ data }) => ({ ...state(), ...data })) },
      productVariant: { findUnique: jest.fn(async () => variant) },
      cartItem: { findUnique: jest.fn(async () => items[0] || null), findFirst: jest.fn(async ({ where }) => items.find(item => item.id === where.id && item.cartId === where.cartId) ? { ...items.find(item => item.id === where.id), variant } : null),
        upsert: jest.fn(async ({ create, update }) => { const existing = items.find(item => item.variantId === create.variantId); if (existing) existing.quantity = update.quantity; else items.push({ ...create, id: 'item-1' }); }),
        update: jest.fn(async ({ where, data }) => { const found = items.find(item => item.id === where.id); found.quantity = data.quantity; }),
        deleteMany: jest.fn(async ({ where }) => { items = items.filter(item => item.id !== where.id || item.cartId !== where.cartId); }) } };
    let queue = Promise.resolve();
    prisma = { cart: tx.cart, $transaction: jest.fn(action => { const result = queue.then(() => action(tx)); queue = result.then(() => undefined, () => undefined); return result; }) };
    service = new CartService(prisma);
  });
  it('гостевая корзина доступна, чужая привязанная корзина закрыта', async () => {
    await expect(service.get(cart.sessionId)).resolves.toMatchObject({ id: cart.id });
    cart.userId = 'owner';
    await expect(service.get(cart.sessionId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.get(cart.sessionId, 'other')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.get(cart.sessionId, 'owner')).resolves.toMatchObject({ id: cart.id });
  });
  it.each(['add', 'update', 'remove'])('чужая корзина запрещена перед изменением %s', async operation => {
    cart.userId = 'owner';
    const actions = { add: () => service.add(cart.sessionId, { variantId: variant.id, quantity: 1 }, 'other'), update: () => service.update(cart.sessionId, 'item-1', { quantity: 1 }, 'other'), remove: () => service.remove(cart.sessionId, 'item-1', 'other') };
    await expect(actions[operation]()).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.cartItem.upsert).not.toHaveBeenCalled(); expect(tx.cartItem.update).not.toHaveBeenCalled(); expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });
  it('использует stock-reserved и цену БД, не уменьшает физический остаток', async () => {
    const result = await service.add(cart.sessionId, { variantId: variant.id, quantity: 2 });
    expect(result.total).toBe(347.98); expect(variant.stock).toBe(5); expect(variant.reserved).toBe(2);
    await expect(service.add(cart.sessionId, { variantId: variant.id, quantity: 2 })).rejects.toBeInstanceOf(BadRequestException);
    expect(items[0].quantity).toBe(2);
  });
  it.each(['variant', 'product', 'missing'])('неактивный/удалённый товар %s не добавляется', async kind => {
    if (kind === 'variant') variant.isActive = false;
    if (kind === 'product') variant.product.isActive = false;
    if (kind === 'missing') tx.productVariant.findUnique.mockResolvedValue(null);
    await expect(service.add(cart.sessionId, { variantId: 'variant-1', quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.cartItem.upsert).not.toHaveBeenCalled();
  });
  it('два одновременных добавления учитывают уже добавленное количество под блокировкой', async () => {
    const results = await Promise.allSettled([service.add(cart.sessionId, { variantId: variant.id, quantity: 2 }), service.add(cart.sessionId, { variantId: variant.id, quantity: 2 })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(items[0].quantity).toBe(2); expect(tx.$queryRaw).toHaveBeenCalled();
  });
  it('update проверяет принадлежность item и новый доступный остаток', async () => {
    await service.add(cart.sessionId, { variantId: variant.id, quantity: 1 });
    await expect(service.update(cart.sessionId, 'foreign-item', { quantity: 1 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(cart.sessionId, 'item-1', { quantity: 4 })).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.update(cart.sessionId, 'item-1', { quantity: 2 })).total).toBe(347.98);
  });
  it('удаление чужого item ограничено cartId; повторное удаление безопасно', async () => {
    await service.add(cart.sessionId, { variantId: variant.id, quantity: 1 });
    await service.remove(cart.sessionId, 'foreign-item'); expect(items).toHaveLength(1);
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: 'foreign-item', cartId: 'cart-1' } });
    expect((await service.remove(cart.sessionId, 'item-1')).total).toBe(0);
    expect((await service.remove(cart.sessionId, 'item-1')).total).toBe(0);
  });
  it('DTO отклоняет отрицательное, нулевое, дробное и слишком большое количество', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    for (const quantity of [-1, 0, 1.5, 100]) {
      await expect(pipe.transform({ variantId: 'variant-1', quantity }, { type: 'body', metatype: AddCartItemDto })).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ quantity }, { type: 'body', metatype: UpdateCartItemDto })).rejects.toBeInstanceOf(BadRequestException);
    }
  });
  it('электронная карта доступна без складского остатка; количество всё ещё ограничено', async () => {
    variant.product.productType = 'GIFT_CARD'; variant.stock = 0; variant.reserved = 0;
    expect((await service.add(cart.sessionId, { variantId: variant.id, quantity: 2 })).items[0].quantity).toBe(2);
    expect((await service.update(cart.sessionId, 'item-1', { quantity: 3 })).items[0].quantity).toBe(3);
    await expect(service.add(cart.sessionId, { variantId: variant.id, quantity: 99 })).rejects.toBeInstanceOf(BadRequestException);
    expect(variant.stock).toBe(0); expect(variant.reserved).toBe(0);
  });
  it('не смешивает подарочную карту с обычными товарами', async () => {
    items.push({ id: 'physical-item', cartId: cart.id, variantId: 'physical-variant', quantity: 1 });
    const physical = { ...variant, product: { isActive: true, productType: 'PHYSICAL' } };
    tx.cart.upsert.mockResolvedValue({ ...cart, items: [{ ...items[0], variant: physical }] });
    variant.product.productType = 'GIFT_CARD';
    await expect(service.add(cart.sessionId, { variantId: variant.id, quantity: 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.cartItem.upsert).not.toHaveBeenCalled();
  });
});
