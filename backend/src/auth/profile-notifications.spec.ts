import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('Настройки уведомлений: независимое частичное сохранение', () => {
  function fixture() {
    const state: any = { id: 'owned-user', role: 'CUSTOMER_B2C', city: 'Прежний город', notificationPreferences: { email: true, push: false, chat: false, futureBot: false } };
    const tx: any = { $queryRaw: jest.fn().mockResolvedValue([{ id: state.id }]), user: {
      findUnique: jest.fn(async () => ({ notificationPreferences: { ...state.notificationPreferences } })),
      update: jest.fn(async ({ data }: any) => { for (const [key, value] of Object.entries(data)) if (value !== undefined) state[key] = value; return { ...state }; }),
    } };
    let queue = Promise.resolve();
    const db: any = { user: tx.user, $transaction: jest.fn((callback: any) => { const result = queue.then(() => callback(tx)); queue = result.then(() => undefined, () => undefined); return result; }) };
    return { state, tx, db, service: new AuthService(db, {} as any, {} as any) };
  }
  it('меняет только email, сохраняет прочие каналы и не трогает город', async () => {
    const { service, state, tx } = fixture();
    const result = await service.updateProfile(state.id, { notificationPreferences: { email: false } });
    expect(result.notificationPreferences).toEqual({ email: false, push: false, chat: false, futureBot: false });
    expect(state.city).toBe('Прежний город');
    expect(tx.user.update.mock.calls[0][0].where).toEqual({ id: state.id });
    expect(tx.$queryRaw).toHaveBeenCalled();
  });
  it('два независимых переключения не затирают друг друга', async () => {
    const { service, state } = fixture();
    await Promise.all([service.updateProfile(state.id, { notificationPreferences: { email: false } }), service.updateProfile(state.id, { notificationPreferences: { push: true } })]);
    expect(state.notificationPreferences).toEqual({ email: false, push: true, chat: false, futureBot: false });
  });
  it.each([null, [], 'false', { email: 'false' }, { email: 0 }, { sms: true }, { email: null }])('отклоняет неподдерживаемые или неboolean настройки %j', async preferences => {
    const { service, db, state } = fixture();
    await expect(service.updateProfile(state.id, { notificationPreferences: preferences } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(state.notificationPreferences.email).toBe(true);
  });
  it('пустой PATCH не сбрасывает уведомления', async () => {
    const { service, state } = fixture();
    await service.updateProfile(state.id, {});
    expect(state.notificationPreferences.push).toBe(false);
  });
  it('исчезнувший профиль не создаётся и не изменяется', async () => {
    const { service, tx, state } = fixture();
    tx.user.findUnique.mockResolvedValue(null);
    await expect(service.updateProfile(state.id, { notificationPreferences: { email: false } })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
