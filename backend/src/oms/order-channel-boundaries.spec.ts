import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus, OrderSource, OrderStatus } from '@prisma/client';
import { OmsService } from './oms.service';
import { AdminService } from '../admin/admin.service';
import { MarketplacesController } from '../marketplaces/marketplaces.controller';
import { MarketplacesService } from '../marketplaces/marketplaces.service';

// No database, queue or provider calls: all dependencies are in-memory mocks.
describe('CRM order channel boundaries', () => {
  function fixture(source: OrderSource = 'OZON', status: OrderStatus = 'NEW') {
    const record: any = { id: 'order-1', orderNumber: 'MOCK-1', source, status, marketplaceStaging: { id: 'staging-1' }, items: [], finalAmount: 100 };
    const sequence: string[] = [];
    const tx = {
      $queryRaw: jest.fn(async () => { sequence.push('lock'); return []; }),
      order: {
        findFirst: jest.fn(async ({ where, select }: any) => {
          sequence.push(select ? 'candidate' : 'current');
          return where.source.in.includes(record.source) ? (select ? { id: record.id } : { ...record }) : null;
        }),
        findUnique: jest.fn(async () => ({ ...record })),
        update: jest.fn(async ({ data }: any) => { sequence.push('write'); return Object.assign(record, data); }),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      marketplaceOrder: { update: jest.fn().mockResolvedValue({}) },
    };
    const db = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const oneC = { enqueueOrder: jest.fn().mockResolvedValue({}) };
    const service = new OmsService(db as any, oneC as any);
    const admin = new AdminService(db as any, oneC as any, {} as any);
    function noWrites() {
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(tx.marketplaceOrder.update).not.toHaveBeenCalled();
      expect(oneC.enqueueOrder).not.toHaveBeenCalled();
    }
    return { record, sequence, tx, db, oneC, service, admin, noWrites };
  }

  it.each<OrderSource>(['WEB', 'B2B'])('marketplace endpoint rejects %s orders', async source => {
    const f = fixture(source);
    await expect(f.service.updateMarketplace('order-1', 'CONFIRMED', undefined, undefined, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    f.noWrites();
    expect(f.tx.$queryRaw).not.toHaveBeenCalled();
    expect(f.tx.order.findFirst.mock.calls[0][0].where.source.in).toEqual(['WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET']);
  });

  it.each<OrderSource>(['B2B', 'OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET'])('storefront endpoint rejects %s orders', async source => {
    const f = fixture(source);
    await expect(f.admin.updateOrderStatus('MOCK-1', { status: 'CONFIRMED' }, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    f.noWrites();
  });

  it('checks the current status after locking, not a pre-lock snapshot', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async () => { f.sequence.push('lock'); f.record.status = 'DELIVERED'; return []; });
    await expect(f.service.updateMarketplace('order-1', 'CONFIRMED')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.sequence).toEqual(['candidate', 'lock', 'current']);
    f.noWrites();
  });

  it.each<[OrderStatus, MarketplaceOrderStatus]>([
    ['NEW', 'DELIVERED'], ['NEW', 'RETURNED'], ['CANCELLED', 'NEW'], ['REFUNDED', 'CONFIRMED'], ['DELIVERED', 'CANCELLED'],
  ])('rejects transition %s → %s without writes', async (from, to) => {
    const f = fixture('OZON', from);
    await expect(f.service.updateMarketplace('order-1', to)).rejects.toBeInstanceOf(BadRequestException);
    f.noWrites();
  });

  it.each<OrderSource>(['OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET'])('updates %s, history and staging under the same lock', async source => {
    const f = fixture(source);
    const result = await f.service.updateMarketplace('staging-1', 'CONFIRMED', 'tracking', 'note', 'actor');
    expect(f.sequence).toEqual(['candidate', 'lock', 'current', 'write']);
    expect(f.tx.order.findFirst.mock.calls[0][0].where.OR).toEqual([{ id: 'staging-1' }, { marketplaceStaging: { id: 'staging-1' } }]);
    expect(result).toMatchObject({ id: 'order-1', channel: source, status: 'CONFIRMED' });
    expect(f.tx.orderStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fromStatus: 'NEW', toStatus: 'CONFIRMED', changedBy: 'actor' }) });
    expect(f.tx.marketplaceOrder.update).toHaveBeenCalledWith({ where: { id: 'staging-1' }, data: { status: 'CONFIRMED', trackingNumber: 'tracking', internalNote: 'note' } });
    expect(f.oneC.enqueueOrder).toHaveBeenCalledWith('order-1', 'actor');
    expect(f.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30000 });
  });

  it('does not add duplicate status history for the same status', async () => {
    const f = fixture('OZON', 'CONFIRMED');
    await f.service.updateMarketplace('order-1', 'CONFIRMED', 'new-tracking');
    expect(f.tx.orderStatusHistory.create).not.toHaveBeenCalled();
    expect(f.record.trackingNumber).toBe('new-tracking');
  });

  it('rejects an order no longer available after the lock', async () => {
    const f = fixture();
    f.tx.order.findFirst.mockResolvedValueOnce({ id: 'order-1' }).mockResolvedValueOnce(null);
    await expect(f.service.updateMarketplace('order-1', 'CONFIRMED')).rejects.toBeInstanceOf(NotFoundException);
    f.noWrites();
  });

  it('forwards the authenticated operator from controller through service to OMS', async () => {
    const oms = { updateMarketplace: jest.fn().mockResolvedValue({ id: 'order-1' }) };
    const service = new MarketplacesService({} as any, oms as any, {} as any);
    const controller = new MarketplacesController(service);
    await controller.update('order-1', { status: 'CONFIRMED', internalNote: 'note' }, { user: { sub: 'actor' } });
    expect(oms.updateMarketplace).toHaveBeenCalledWith('order-1', 'CONFIRMED', undefined, 'note', 'actor');
  });
});
