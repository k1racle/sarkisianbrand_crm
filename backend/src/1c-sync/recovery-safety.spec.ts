import { OneCSyncService } from './1c-sync.service';
import { OneCSyncController } from './1c-sync.controller';
import { COMPANY_SCOPE } from '../common/guards/company-scope.guard';

describe('1C recovery boundary (no provider/network)', () => {
  it('never replaces a failed or uncertain export with a new job just because 15 minutes elapsed', async () => {
    const db: any = { order: { findMany: jest.fn().mockResolvedValue([{ id: 'attempted' }, { id: 'new' }]) },
      jobRun: { findFirst: jest.fn() } };
    db.jobRun.findFirst.mockImplementation(async ({ where }: any) => where.input.equals === 'attempted' ? { id: 'failed-run', status: 'FAILED' } : null);
    const service = new OneCSyncService(db, {} as any, { status: async () => ({ enabled: true, configured: true }) } as any);
    const enqueue = jest.spyOn(service, 'enqueueOrder').mockResolvedValue(null);
    await (service as any).recoverPendingOrders();
    expect(enqueue).toHaveBeenCalledTimes(1); expect(enqueue).toHaveBeenCalledWith('new');
    for (const [query] of db.jobRun.findFirst.mock.calls) {
      expect(query.where).not.toHaveProperty('status'); expect(query.where).not.toHaveProperty('createdAt');
    }
  });
  it('alternate log endpoint projects only safe metadata', async () => {
    const db: any = { syncLog: { findMany: jest.fn().mockResolvedValue([]) } };
    await new OneCSyncService(db, {} as any, {} as any).logs();
    expect(db.syncLog.findMany.mock.calls[0][0].select).toEqual({ id: true, system: true, action: true, status: true, createdAt: true });
  });
  it('continues past a page of failed orders and revisits the start after reaching the end', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const page = Array.from({ length: 100 }, (_, i) => ({ id: String(i).padStart(3, '0'), createdAt }));
    const db: any = {
      order: { findMany: jest.fn().mockResolvedValueOnce(page).mockResolvedValueOnce([{ id: '100', createdAt }]).mockResolvedValueOnce([]) },
      jobRun: { findFirst: jest.fn(async ({ where }: any) => where.input.equals === '100' ? null : { id: 'uncertain', status: 'FAILED' }) },
    };
    const service = new OneCSyncService(db, {} as any, { status: async () => ({ enabled: true, configured: true }) } as any);
    const enqueue = jest.spyOn(service, 'enqueueOrder').mockResolvedValue(null);
    await (service as any).recoverPendingOrders();
    await (service as any).recoverPendingOrders();
    expect(enqueue).toHaveBeenCalledTimes(1); expect(enqueue).toHaveBeenCalledWith('100');
    expect(db.order.findMany.mock.calls[1][0].where.AND[2]).toEqual({ OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: '099' } }] });
    await (service as any).recoverPendingOrders();
    expect(db.order.findMany.mock.calls[2][0].where.AND).toHaveLength(2);
  });
  it('alternate HTTP exchange cannot bypass source domain COMPANY permissions', () => {
    expect(Reflect.getMetadata(COMPANY_SCOPE, OneCSyncController)).toEqual(['integrations.read']);
    expect(Reflect.getMetadata(COMPANY_SCOPE, OneCSyncController.prototype.syncProducts)).toEqual(['integrations.write', 'catalog.read', 'catalog.write']);
    expect(Reflect.getMetadata(COMPANY_SCOPE, OneCSyncController.prototype.exchange)).toEqual(expect.arrayContaining(['customers.write', 'oms.write', 'web_orders.write', 'marketplace.write']));
  });
});
