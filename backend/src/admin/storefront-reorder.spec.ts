import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminService } from './admin.service';
import { CreateStorefrontBannerDto, ReorderStorefrontDto } from './dto/admin.dto';
import { CatalogQueryDto } from '../products/dto/product.dto';

describe('Storefront appearance order and publication inputs', () => {
  const tx: any = { $executeRaw: jest.fn(), storefrontBanner: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() } };
  const prisma: any = { ...tx, $transaction: jest.fn() };
  const service = new AdminService(prisma, {} as any, {} as any);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((fn: any) => fn(tx)); tx.storefrontBanner.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]); });
  it('saves the complete order atomically without overwriting other banner fields', async () => {
    await expect(service.reorderStorefront({ collection: 'banners', ids: ['b', 'a'] })).resolves.toEqual({ collection: 'banners', ids: ['b', 'a'] });
    expect(tx.storefrontBanner.update.mock.calls).toEqual([[{ where: { id: 'b' }, data: { sortOrder: 0 } }], [{ where: { id: 'a' }, data: { sortOrder: 1 } }]]);
  });
  it.each([[['a']], [['a', 'unknown']], [['a', 'a']]])('rejects a changed/incomplete list %j without any update', async ids => {
    await expect(service.reorderStorefront({ collection: 'banners', ids })).rejects.toThrow();
    expect(tx.storefrontBanner.update).not.toHaveBeenCalled();
  });
  it.each([{ collection: 'unknown', ids: [] }, { collection: 'banners', ids: ['a', 'a'] }])('rejects invalid reorder DTO %j', input => {
    expect(validateSync(plainToInstance(ReorderStorefrontDto, input)).length).toBeGreaterThan(0);
  });
  it('rejects an inverted publication date range', () => {
    expect(() => service.createStorefrontBanner({ imageUrl: '/storefront/hero.jpg', startsAt: '2026-10-02T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' })).toThrow('Дата окончания');
  });
  it('rejects invalid banner date strings', () => {
    expect(validateSync(plainToInstance(CreateStorefrontBannerDto, { imageUrl: '/storefront/hero.jpg', startsAt: 'not-a-date' })).length).toBeGreaterThan(0);
  });
  it('accepts a bounded manual collection of product IDs', () => {
    expect(validateSync(plainToInstance(CatalogQueryDto, { ids: 'product-1,product-2' }))).toHaveLength(0);
  });
  it.each(['../private', 'a,,b', Array.from({ length: 9 }, (_, i) => `p-${i}`).join(',')])('rejects malformed/manual collections above eight: %s', ids => {
    expect(validateSync(plainToInstance(CatalogQueryDto, { ids })).length).toBeGreaterThan(0);
  });
});
