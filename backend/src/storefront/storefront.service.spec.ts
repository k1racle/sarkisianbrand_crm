import { NotFoundException } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { executionSnapshot } from '../oms/execution-snapshot';

describe('Storefront dashboard role eligibility (isolated mocks)', () => {
  function fixture(role = 'CUSTOMER_B2C', isActive = true) {
    const settings = { programName: 'SARKISIAN CLUB', isEnabled: true, proThreshold: 1000, premiumThreshold: 5000, earnPercent: 5, maxWriteOffPercent: 20 };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role, isActive }) },
      order: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(42), aggregate: jest.fn().mockResolvedValue({ _sum: { finalAmount: 198000 } }) },
      storefrontAddress: { findMany: jest.fn().mockResolvedValue([]) },
      productFavorite: { count: jest.fn().mockResolvedValue(2) },
      loyaltyProgramSetting: { upsert: jest.fn().mockResolvedValue(settings) },
      giftCard: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const loyalty = { account: jest.fn().mockResolvedValue({ balance: 1250, level: 'PREMIUM', entries: [] }) };
    return { prisma, loyalty, service: new StorefrontService(prisma as any, loyalty as any) };
  }

  it('keeps B2C loyalty and computes its level from current settings', async () => {
    const { service, loyalty } = fixture();
    const result = await service.dashboard('isolated-b2c');
    expect(loyalty.account).toHaveBeenCalledWith('isolated-b2c');
    expect(result.loyalty).toMatchObject({ isEligible: true, balance: 1250, level: 'PRO', earnPercent: 5, maxWriteOffPercent: 20 });
    expect(result.summary).toMatchObject({ orders: 42, spent: 198000 });
    expect(result.giftCards).toEqual([]);
  });

  it.each(['ADMIN', 'CUSTOMER_B2B', 'MANAGER'])('does not create or query a loyalty account for %s', async role => {
    const { service, loyalty, prisma } = fixture(role);
    const result = await service.dashboard('isolated-other');
    expect(loyalty.account).not.toHaveBeenCalled();
    expect(result.loyalty).toEqual({ isEligible: false, isEnabled: false, programName: 'SARKISIAN CLUB', balance: 0, entries: [] });
    expect(result.orders).toEqual([]);
    expect(result.addresses).toEqual([]);
    expect(result.summary.orders).toBe(42);
    expect(result.giftCards).toEqual([]);
    expect(prisma.giftCard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sourceOrder: { userId: 'isolated-other' } } }));
  });

  it('rejects a missing user without invoking account or order queries', async () => {
    const { service, prisma, loyalty } = fixture();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.dashboard('isolated-missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(loyalty.account).not.toHaveBeenCalled();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
    expect(prisma.giftCard.findMany).not.toHaveBeenCalled();
  });

  it('rejects an inactive user before loading private dashboard data', async () => {
    const { service, prisma, loyalty } = fixture('ADMIN', false);
    await expect(service.dashboard('isolated-inactive')).rejects.toBeInstanceOf(NotFoundException);
    expect(loyalty.account).not.toHaveBeenCalled();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
    expect(prisma.giftCard.findMany).not.toHaveBeenCalled();
  });

  it('does not swallow B2C loyalty errors or silently downgrade eligibility', async () => {
    const { service, loyalty } = fixture();
    const failure = new Error('Isolated loyalty failure');
    loyalty.account.mockRejectedValue(failure);
    await expect(service.dashboard('isolated-b2c-error')).rejects.toBe(failure);
  });

  it('shows only safe warehouse progress in the customer dashboard', async () => {
    const { service, prisma } = fixture();
    const order: any = {
      id: 'order', orderNumber: 'TEST-1', status: 'PAID', createdAt: new Date(), source: 'WEB',
      totalAmount: '100', discountAmount: '0', finalAmount: '100', currency: 'RUB', shippingAddress: {}, shippingCost: '0', shippingProvider: 'pickup', paymentMethod: 'CARD',
      items: [{ id: 'line', variantId: 'variant', productName: 'Товар', variantName: 'Вариант', quantity: 1, price: '100', total: '100', productType: 'PHYSICAL' }],
    };
    order.warehouseExecution = { status: 'PICKING', basisHash: executionSnapshot(order), asOf: new Date(), validUntil: new Date(Date.now() + 60000), documentId: 'PRIVATE', executorName: 'PRIVATE' };
    prisma.order.findMany.mockResolvedValue([order]);
    const result = await service.dashboard('customer');
    expect(result.orders[0].warehouseStatus).toMatchObject({ stage: 'PICKING', isCurrent: true });
    expect(result.orders[0]).not.toHaveProperty('warehouseExecution');
    expect(JSON.stringify(result.orders)).not.toContain('PRIVATE');
    expect(result.orders[0]).not.toHaveProperty('shippingAddress');
  });

  it('labels courses and excludes their amounts from product spending', async () => {
    const { service, prisma } = fixture();
    prisma.order.findMany.mockResolvedValue([{ id: 'course', orderNumber: 'COURSE-1', source: 'WEB', sourceChannel: 'COURSE', createdAt: new Date(),
      status: 'DELIVERED', finalAmount: '4500', items: [{ id: 'line', productType: 'COURSE', productName: 'Курс' }], warehouseExecution: null }]);
    const result = await service.dashboard('customer');
    expect(result.orders[0]).toMatchObject({ sourceChannel: 'COURSE', requiresWarehouse: false, warehouseStatus: null, items: [{ productType: 'COURSE' }] });
    expect(prisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sourceChannel: { not: 'COURSE' } }) }));
  });

  it.each(['CUSTOMER_B2C', 'CUSTOMER_B2B', 'ADMIN'])('returns only masked own-purchase summaries for %s', async role => {
    const { service, prisma } = fixture(role);
    prisma.giftCard.findMany.mockResolvedValue([{
      id: 'isolated-gift', maskedCode: '•••• 1234', faceValue: 5000, balance: 4000, reserved: 500,
      expiresAt: null, isActive: true, sourceOrder: { orderNumber: 'OWN-ORDER', userId: 'isolated-owner' },
      encryptedCode: 'NEVER-EXPOSE', code: 'NEVER-EXPOSE', codeHash: 'NEVER-EXPOSE',
    }]);
    const result = await service.dashboard('isolated-owner');
    expect(prisma.giftCard.findMany).toHaveBeenCalledWith({
      where: { sourceOrder: { userId: 'isolated-owner' } },
      select: { id: true, maskedCode: true, faceValue: true, balance: true, reserved: true, expiresAt: true, isActive: true, sourceOrder: { select: { orderNumber: true } } },
      orderBy: { id: 'desc' },
    });
    expect(result.giftCards).toEqual([{
      id: 'isolated-gift', maskedCode: '•••• 1234', faceValue: 5000, balance: 4000, reserved: 500,
      expiresAt: null, isActive: true, orderNumber: 'OWN-ORDER',
    }]);
    expect(JSON.stringify(result.giftCards)).not.toContain('NEVER-EXPOSE');
  });

  it('excludes manual cards without a source order from customer summaries', async () => {
    const { service, prisma } = fixture('ADMIN');
    prisma.giftCard.findMany.mockResolvedValue([
      { id: 'manual-card', maskedCode: '•••• 9999', sourceOrder: null, encryptedCode: 'NEVER-EXPOSE' },
      { id: 'missing-order-number', maskedCode: '•••• 8888', sourceOrder: { orderNumber: '' } },
    ]);
    const result = await service.dashboard('isolated-admin');
    expect(result.giftCards).toEqual([]);
    expect(prisma.giftCard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sourceOrder: { userId: 'isolated-admin' } } }));
  });
});
