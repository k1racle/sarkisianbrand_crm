import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('Inline product prices (mock database only)', () => {
  function fixture(type = 'PHYSICAL') {
    const product = { id: 'product', productType: type, basePrice: 1000, variants: [{ id: 'variant', price: 1000, salePrice: 800, saleStartsAt: null, saleEndsAt: null }] };
    const db: any = { product: { findUnique: jest.fn().mockResolvedValue(product), update: jest.fn().mockResolvedValue(product) }, productVariant: { update: jest.fn() } };
    db.$transaction = jest.fn(async (action: any) => action(db));
    return { db, product, service: new AdminService(db, {} as any, {} as any) };
  }
  it('updates the requested variant and regular price together, without touching visibility or stock', async () => {
    const f = fixture();
    await f.service.updateProduct('product', { variantId: 'variant', price: 1200, salePrice: 900 });
    expect(f.db.product.findUnique.mock.calls[0][0].include.variants.where).toEqual({ id: 'variant' });
    expect(f.db.product.update.mock.calls[0][0].data).toEqual({ basePrice: 1200 });
    expect(f.db.productVariant.update.mock.calls[0][0]).toEqual({ where: { id: 'variant' }, data: { price: 1200, salePrice: 900, saleStartsAt: null, saleEndsAt: null } });
  });
  it('clears the discount and its schedule', async () => {
    const f = fixture();
    await f.service.updateProduct('product', { variantId: 'variant', price: 1000, salePrice: null });
    expect(f.db.productVariant.update.mock.calls[0][0].data).toMatchObject({ salePrice: null, saleStartsAt: null, saleEndsAt: null });
  });
  it('rejects invalid discounts before any writes', async () => {
    const f = fixture();
    await expect(f.service.updateProduct('product', { variantId: 'variant', price: 500, salePrice: 800 })).rejects.toThrow(BadRequestException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('does not silently update another variant when the requested one no longer exists', async () => {
    const f = fixture(); f.product.variants = [];
    await expect(f.service.updateProduct('product', { variantId: 'missing', price: 500 })).rejects.toThrow(NotFoundException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('keeps gift card denominations out of this editor', async () => {
    const f = fixture('GIFT_CARD');
    await expect(f.service.updateProduct('product', { variantId: 'variant', price: 500 })).rejects.toThrow(BadRequestException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
});
