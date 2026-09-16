import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_LOYALTY_SETTINGS, maintainAccount } from './loyalty-core.helpers';
import { LoyaltyService } from './loyalty.service';

const NOW = new Date('2026-09-16T12:00:00Z');
const settings = () => ({ ...DEFAULT_LOYALTY_SETTINGS });

/** In-memory transaction/row-lock simulation; never connects to a real database. */
function fixture(balance = 100) {
  let account: any = { id: 'account', userId: 'customer', balance, level: 'START' };
  let entries: any[] = balance ? [{ id: 'legacy', accountId: 'account', amount: balance, type: 'ACCRUAL', reason: 'Старое начисление', createdAt: new Date('2020-01-01T00:00:00Z'), metadata: null }] : [];
  let sequence = 0;
  let tail = Promise.resolve();
  const user: any = { id: 'customer', role: 'CUSTOMER_B2C', isActive: true, customer: { id: 'b2c-card', birthday: null } };
  const program: any = settings();
  const transactions: any[] = [];
  const configValues: Record<string, any> = {};
  const config = { get: (key: string, fallback: any) => configValues[key] ?? fallback } as unknown as ConfigService;
  const db: any = {
    user: { findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...user, loyaltyAccount: { ...account, entries: entries.slice() } })),
      findMany: jest.fn().mockResolvedValue([{ id: 'customer' }]) },
    loyaltyProgramSetting: { findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...program })), upsert: jest.fn() },
    loyaltyTransaction: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn().mockImplementation(async (callback: any) => {
      let release: (() => void) | undefined;
      let snapshot: { account: any; entries: any[] } | undefined;
      const tx: any = {
        user: { findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...user })) },
        customer: { findUnique: jest.fn().mockImplementation(() => Promise.resolve(user.customer)) },
        loyaltyProgramSetting: db.loyaltyProgramSetting,
        $queryRaw: jest.fn().mockImplementation(async () => {
          const predecessor = tail;
          tail = new Promise<void>(resolve => { release = resolve; });
          await predecessor;
          snapshot = { account: { ...account }, entries: entries.slice() };
          return [{ id: 'account' }];
        }),
        loyaltyAccount: {
          // This can return a stale snapshot BEFORE lock acquisition; helper must re-read.
          upsert: jest.fn().mockImplementation(() => Promise.resolve({ ...account })),
          findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve({ ...account })),
          update: jest.fn().mockImplementation(({ data, include }: any) => {
            if (data.balance?.increment) account.balance += data.balance.increment;
            if (data.balance?.decrement) account.balance -= data.balance.decrement;
            if (data.level) account.level = data.level;
            return Promise.resolve({ ...account, ...(include ? { entries: entries.slice().reverse().slice(0, 30) } : {}) });
          }),
        },
        loyaltyTransaction: {
          findMany: jest.fn().mockImplementation(() => Promise.resolve(entries.slice())),
          create: jest.fn().mockImplementation(({ data }: any) => {
            const row = { ...data, id: `new-${++sequence}`, createdAt: new Date() };
            entries.push(row);
            return Promise.resolve(row);
          }),
        },
      };
      transactions.push(tx);
      try { return await callback(tx); }
      catch (error) { if (snapshot) { account = snapshot.account; entries = snapshot.entries; } throw error; }
      finally { release?.(); }
    }),
  };
  const service = new LoyaltyService(db, config);
  return { db, service, user, program, transactions, configValues, balance: () => account.balance, entries: () => entries.slice() };
}

describe('Loyalty service atomic operations and maintenance (mock only)', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('re-reads locked balance and uses atomic decrement plus a ledger entry in one transaction', async () => {
    const f = fixture();
    const result = await f.service.operation('customer', { amount: 30, reason: '  Корректировка  ' }, 'WRITE_OFF');
    const tx = f.transactions[0];
    expect(tx.$queryRaw.mock.calls[0][0].join(' ')).toContain('FOR UPDATE');
    expect(tx.loyaltyAccount.findUniqueOrThrow.mock.invocationCallOrder[0]).toBeGreaterThan(tx.$queryRaw.mock.invocationCallOrder[0]);
    expect(tx.loyaltyAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { balance: { decrement: 30 }, level: 'START' } }));
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -30, type: 'WRITE_OFF', reason: 'Корректировка',
      metadata: { ledgerVersion: 1, consumedEntries: [{ entryId: 'legacy', amount: 30 }] } }) });
    expect(result.balance).toBe(70);
  });

  it('does not overspend when two write-offs race, and does not roll back the committed winner', async () => {
    const f = fixture(100);
    const results = await Promise.allSettled([
      f.service.operation('customer', { amount: 70, reason: 'Первое списание' }, 'WRITE_OFF'),
      f.service.operation('customer', { amount: 70, reason: 'Второе списание' }, 'WRITE_OFF'),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(f.balance()).toBe(30);
    expect(f.entries().filter(entry => entry.type === 'WRITE_OFF')).toHaveLength(1);
  });

  it('does not lose increments when two accruals race', async () => {
    const f = fixture(100);
    await Promise.all([
      f.service.operation('customer', { amount: 20, reason: 'Начисление 1' }, 'ACCRUAL'),
      f.service.operation('customer', { amount: 30, reason: 'Начисление 2' }, 'ACCRUAL'),
    ]);
    expect(f.balance()).toBe(150);
    expect(f.entries().filter(entry => entry.metadata?.source === 'MANUAL')).toHaveLength(2);
    expect(f.entries().filter(entry => entry.metadata?.source === 'MANUAL').every(entry => entry.metadata.expiresAt === '2027-09-16T12:00:00.000Z')).toBe(true);
  });

  it.each(['ADMIN', 'CUSTOMER_B2B', 'WAREHOUSE'])('rejects loyalty operations for role %s without creating an account', async role => {
    const f = fixture(); f.user.role = role;
    await expect(f.service.operation('customer', { amount: 1, reason: 'Причина' }, 'ACCRUAL')).rejects.toBeInstanceOf(NotFoundException);
    expect(f.transactions[0].loyaltyAccount.upsert).not.toHaveBeenCalled();
    expect(f.entries()).toHaveLength(1);
  });

  it('rejects inactive B2C and disabled program', async () => {
    const f = fixture(); f.user.isActive = false;
    await expect(f.service.account('customer')).rejects.toBeInstanceOf(NotFoundException);
    f.user.isActive = true; f.program.isEnabled = false;
    await expect(f.service.operation('customer', { amount: 1, reason: 'Причина' }, 'ACCRUAL')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.balance()).toBe(100);
  });

  it.each([{ amount: 0, reason: 'Причина' }, { amount: 1.5, reason: 'Причина' }, { amount: 1, reason: '   ' }, { amount: 1, reason: null }])('rejects invalid operations before transaction: %j', async dto => {
    const f = fixture();
    await expect(f.service.operation('customer', dto as any, 'ACCRUAL')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });

  it('does not overflow the Int balance', async () => {
    const f = fixture(2_147_483_647);
    await expect(f.service.operation('customer', { amount: 1, reason: 'Причина' }, 'ACCRUAL')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.balance()).toBe(2_147_483_647);
  });

  it('expires only the unspent remainder atomically and repeating maintenance does not expire twice', async () => {
    const f = fixture(100);
    const tx = async (callback: any) => f.db.$transaction(callback);
    await tx(async (db: any) => {
      const account = await maintainAccount(db, 'customer', f.program, NOW);
      await db.loyaltyTransaction.create({ data: { accountId: account.account.id, amount: 80, type: 'ACCRUAL', reason: 'Начисление', metadata: { expiresAt: '2026-09-01T00:00:00Z' } } });
      await db.loyaltyAccount.update({ where: { id: 'account' }, data: { balance: { increment: 80 } } });
    });
    const first = await f.service.account('customer');
    const second = await f.service.account('customer');
    expect(first.balance).toBe(100); expect(second.balance).toBe(100);
    const expiries = f.entries().filter(entry => entry.type === 'EXPIRY');
    expect(expiries).toHaveLength(1);
    expect(expiries[0].metadata.expiredEntries).toEqual([{ entryId: 'new-1', amount: 80 }]);
    expect(expiries[0].amount).toBe(-80);
  });

  it('rolls back expiry and ledger if subsequent manual write-off cannot be fulfilled', async () => {
    const f = fixture(0);
    await f.db.$transaction(async (db: any) => {
      await maintainAccount(db, 'customer', f.program, NOW);
      await db.loyaltyTransaction.create({ data: { accountId: 'account', amount: 100, type: 'ACCRUAL', reason: 'Кредит', metadata: { expiresAt: '2026-09-01T00:00:00Z' } } });
      await db.loyaltyAccount.update({ where: { id: 'account' }, data: { balance: { increment: 100 } } });
    });
    await expect(f.service.operation('customer', { amount: 1, reason: 'Причина' }, 'WRITE_OFF')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.balance()).toBe(100);
    expect(f.entries().filter(entry => entry.type === 'EXPIRY')).toHaveLength(0);
  });

  it('accrues birthday exactly once per UTC year even with concurrent requests and settings changes', async () => {
    const f = fixture(); f.user.customer.birthday = new Date('2000-09-16T00:00:00Z'); f.program.birthdayBonus = 50;
    await Promise.all([f.service.account('customer'), f.service.account('customer')]);
    f.program.birthdayBonus = 100;
    await f.service.account('customer');
    expect(f.balance()).toBe(150);
    const credits = f.entries().filter(entry => entry.metadata?.source === 'BIRTHDAY');
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({ amount: 50, metadata: { birthdayYear: 2026, expiresAt: '2027-09-16T12:00:00.000Z' } });
    expect(f.transactions[0].customer.findUnique).toHaveBeenCalledWith({ where: { userId: 'customer' }, select: { birthday: true } });
  });

  it('does not grant birthday for absent DOB, another UTC day, zero bonus or disabled program', async () => {
    const f = fixture(); f.program.birthdayBonus = 50;
    await f.service.account('customer');
    f.user.customer.birthday = new Date('2000-09-15T00:00:00Z'); await f.service.account('customer');
    f.user.customer.birthday = new Date('2000-09-16T00:00:00Z'); f.program.birthdayBonus = 0; await f.service.account('customer');
    f.program.birthdayBonus = 50; f.program.isEnabled = false; await f.service.account('customer');
    expect(f.balance()).toBe(100);
  });

  it('handles an absent canonical Customer card without inventing a birthday or duplicating fields', async () => {
    const f = fixture(); f.user.customer = null; f.program.birthdayBonus = 50;
    const result = await f.service.account('customer');
    expect(result.balance).toBe(100);
    expect(f.transactions[0].customer.findUnique).toHaveBeenCalledWith({ where: { userId: 'customer' }, select: { birthday: true } });
    expect(f.entries().filter(entry => entry.metadata?.source === 'BIRTHDAY')).toHaveLength(0);
  });

  it('reads settings and calculates accrual without creating accounts or maintaining customers', async () => {
    const f = fixture(); f.program.proThreshold = 50;
    expect((await f.service.settings()).programName).toBe('SARKISIAN CLUB');
    expect(await f.service.calculateAccrual('customer', 1000)).toBe(12);
    expect(f.db.$transaction).not.toHaveBeenCalled();
    expect(f.db.loyaltyProgramSetting.upsert).not.toHaveBeenCalled();
    f.user.role = 'ADMIN'; expect(await f.service.calculateAccrual('customer', 1000)).toBe(0);
  });

  it('overview computes level using current settings, excludes projected expiry, and remains read-only', async () => {
    const f = fixture(); f.program.proThreshold = 50;
    f.db.user.findMany.mockResolvedValue([{ ...f.user, loyaltyAccount: {
      id: 'account', balance: 100, level: 'PREMIUM', entries: [{ id: 'expired', amount: 40, type: 'ACCRUAL', createdAt: new Date('2026-01-01T00:00:00Z'),
        metadata: { expiresAt: '2026-09-01T00:00:00Z' } }],
    } }]);
    const result = await f.service.overview();
    expect(result.accounts[0]).toMatchObject({ balance: 60, level: 'PRO' });
    expect(f.db.$transaction).not.toHaveBeenCalled();
    expect(f.db.loyaltyProgramSetting.upsert).not.toHaveBeenCalled();
    expect(f.db.user.findMany.mock.calls[0][0].where).toMatchObject({ role: 'CUSTOMER_B2C', isActive: true });
  });

  it.each([undefined, false, 'false', '1'])('does not poll/read/mutate any customer with maintenance flag %j', async value => {
    const f = fixture(); f.configValues.LOYALTY_MAINTENANCE_ENABLED = value;
    const interval = jest.spyOn(global, 'setInterval');
    f.service.onModuleInit();
    expect(await f.service.runMaintenance()).toEqual({ processed: 0, disabled: true });
    expect(interval).not.toHaveBeenCalled();
    expect(f.db.user.findMany).not.toHaveBeenCalled();
    expect(f.db.$transaction).not.toHaveBeenCalled();
    f.service.onModuleDestroy(); interval.mockRestore();
  });

  it('only processes explicitly enabled maintenance and supports bounded cursor batches', async () => {
    const f = fixture(); f.configValues.LOYALTY_MAINTENANCE_ENABLED = 'true';
    expect(await f.service.runMaintenance(1)).toEqual({ processed: 1, disabled: false });
    expect(await f.service.runMaintenance(1)).toEqual({ processed: 1, disabled: false });
    expect(f.db.user.findMany.mock.calls[1][0]).toMatchObject({ take: 1, cursor: { id: 'customer' }, skip: 1 });
    f.db.user.findMany.mockResolvedValue([]);
    await f.service.runMaintenance(1);
    f.db.user.findMany.mockResolvedValue([{ id: 'customer' }]); await f.service.runMaintenance(1);
    expect(f.db.user.findMany.mock.calls[3][0]).not.toHaveProperty('cursor');
  });
});
