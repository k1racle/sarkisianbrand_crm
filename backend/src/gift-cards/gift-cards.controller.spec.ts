import 'reflect-metadata';
import { GiftCardProductController, GiftCardsController } from './gift-cards.controller';

describe('gift card admin route isolation', () => {
  it('financial routes never grant CONTENT_MANAGER access', () => {
    expect(Reflect.getMetadata('roles', GiftCardsController)).toEqual(['ADMIN', 'MANAGER_SALES', 'SUPERVISOR']);
    expect(Reflect.getMetadata('roles', GiftCardProductController)).toContain('CONTENT_MANAGER');
    expect(Reflect.getMetadata('__guards__', GiftCardsController)).toHaveLength(2);
    expect(Reflect.getMetadata('__guards__', GiftCardProductController)).toHaveLength(2);
  });
  it('forwards verified actor id for issue/update/reveal/product audit', async () => {
    const service = { issue: jest.fn(), update: jest.fn(), reveal: jest.fn(), saveProduct: jest.fn(), detail: jest.fn() };
    const controller = new GiftCardsController(service as any), product = new GiftCardProductController(service as any);
    const req = { user: { sub: 'trusted-actor' } }, dto: any = {};
    await controller.issue(dto, req); await controller.update({ id: 'card' }, dto, req); await controller.reveal({ id: 'card' }, req); await product.save(dto, req);
    expect(service.issue).toHaveBeenCalledWith(dto, 'trusted-actor'); expect(service.update).toHaveBeenCalledWith('card', dto, 'trusted-actor');
    expect(service.reveal).toHaveBeenCalledWith('card', 'trusted-actor'); expect(service.saveProduct).toHaveBeenCalledWith(dto, 'trusted-actor');
  });
});
