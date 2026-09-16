import { BadRequestException } from '@nestjs/common';
import { birthdayIsToday, DEFAULT_LOYALTY_SETTINGS, LedgerEntry, loyaltyCreditMetadata, loyaltyLevel, loyaltyWriteOffMetadata, replayLoyaltyLedger } from './loyalty-core.helpers';

const NOW = new Date('2026-09-16T12:00:00Z');
const entry = (id: string, amount: number, day: number, meta?: unknown, type = amount > 0 ? 'ACCRUAL' : 'WRITE_OFF'): LedgerEntry => ({
  id, amount, type, createdAt: new Date(`2026-01-${String(day).padStart(2, '0')}T00:00:00Z`), metadata: meta,
});
const expired = { expiresAt: '2026-09-01T00:00:00Z' };
const valid = { expiresAt: '2027-01-01T00:00:00Z' };

describe('Loyalty FIFO core (pure functions, no integrations/database)', () => {
  it('preserves legacy credits without metadata and pre-ledger opening balances indefinitely', () => {
    expect(replayLoyaltyLedger(100, [entry('legacy', 100, 1)], NOW).availableBalance).toBe(100);
    expect(replayLoyaltyLedger(250, [], NOW)).toMatchObject({ availableBalance: 250, expiredAmount: 0 });
    const mixed = replayLoyaltyLedger(300, [entry('expiring', 100, 2, expired)], NOW);
    expect(mixed.availableBalance).toBe(200);
    expect(mixed.expiredEntries).toEqual([{ entryId: 'expiring', amount: 100 }]);
  });

  it('expires only remaining explicitly expiring credits after FIFO spending', () => {
    const state = replayLoyaltyLedger(140, [entry('old', 100, 1, expired), entry('new', 100, 2, valid), entry('spent', -60, 3)], NOW);
    expect(state).toMatchObject({ expiredAmount: 40, availableBalance: 100, expiredEntries: [{ entryId: 'old', amount: 40 }] });
    expect(replayLoyaltyLedger(0, [entry('old', 100, 1, expired), entry('spent', -100, 2)], NOW).expiredAmount).toBe(0);
  });

  it('consumes legacy credits FIFO before a later explicitly expiring credit', () => {
    const state = replayLoyaltyLedger(150, [entry('legacy', 100, 1), entry('new', 100, 2, expired), entry('spent', -50, 3)], NOW);
    expect(state.availableBalance).toBe(50);
    expect(state.expiredAmount).toBe(100);
  });

  it('uses explicit expiry allocations, never consumes an unrelated unexpired credit, and is idempotent', () => {
    const entries = [entry('legacy', 100, 1), entry('expired', 80, 2, expired),
      entry('expiry-event', -80, 3, { expiredEntries: [{ entryId: 'expired', amount: 80 }] }, 'EXPIRY')];
    const state = replayLoyaltyLedger(100, entries, NOW);
    expect(state.availableBalance).toBe(100);
    expect(state.expiredEntries).toEqual([]);
    expect(state.lots.find(lot => lot.entryId === 'legacy')!.amount).toBe(100);
    expect(replayLoyaltyLedger(100, entries, NOW).expiredAmount).toBe(0);
  });

  it('handles multiple credits, partial debits and separate expiry runs without double expiry', () => {
    const entries = [entry('a', 100, 1, expired), entry('b', 100, 2, expired), entry('c', 100, 3, valid),
      entry('debit', -125, 4), entry('expiry', -75, 5, { expiredEntries: [{ entryId: 'b', amount: 75 }] }, 'EXPIRY')];
    expect(replayLoyaltyLedger(100, entries, NOW)).toMatchObject({ expiredAmount: 0, availableBalance: 100 });
  });

  it('treats an unexplained historical balance shortfall as already spent, not as expiry again', () => {
    expect(replayLoyaltyLedger(25, [entry('old', 100, 1, expired)], NOW).expiredAmount).toBe(25);
    expect(replayLoyaltyLedger(0, [entry('old', 100, 1, expired)], NOW).expiredAmount).toBe(0);
  });

  it('applies expiresAt only to credits and preserves malformed/absent credit expiry safely', () => {
    const entries = [entry('credit', 100, 1, { expiresAt: 'broken' }), entry('debit', -20, 2, expired)];
    expect(replayLoyaltyLedger(80, entries, NOW).expiredAmount).toBe(0);
  });

  it('handles tied database timestamps deterministically with credit before debit', () => {
    const entries = [entry('z-credit', 100, 1, expired), entry('a-debit', -40, 1)];
    expect(replayLoyaltyLedger(60, entries, NOW).expiredAmount).toBe(60);
    expect(replayLoyaltyLedger(60, entries.slice().reverse(), NOW).expiredAmount).toBe(60);
  });

  it('writes explicit FIFO consumption without touching input rows or using expired credits', () => {
    const entries = [entry('a', 100, 1, valid), entry('b', 100, 2, valid)];
    const original = JSON.stringify(entries);
    expect(loyaltyWriteOffMetadata(200, entries, 125, NOW)).toEqual({ ledgerVersion: 1, consumedEntries: [
      { entryId: 'a', amount: 100 }, { entryId: 'b', amount: 25 },
    ] });
    expect(JSON.stringify(entries)).toBe(original);
    expect(() => loyaltyWriteOffMetadata(100, [entry('a', 100, 1, expired)], 1, NOW)).toThrow(BadRequestException);
  });

  it('replays explicit write-off allocations without charging unrelated credits', () => {
    const entries = [entry('legacy', 100, 1), entry('valid', 100, 2, valid), entry('debit', -50, 3, {
      consumedEntries: [{ entryId: 'valid', amount: 50 }],
    })];
    const state = replayLoyaltyLedger(150, entries, NOW);
    expect(state.lots.find(lot => lot.entryId === 'legacy')!.amount).toBe(100);
    expect(state.lots.find(lot => lot.entryId === 'valid')!.amount).toBe(50);
  });

  it('gives reversal/refund credits a NEW TTL rather than reopening consumed old credits', () => {
    const meta = loyaltyCreditMetadata(DEFAULT_LOYALTY_SETTINGS, NOW, { source: 'REFUND' });
    const entries = [entry('old', 100, 1, expired), entry('spent', -100, 2),
      { ...entry('refund', 100, 3, meta, 'REVERSAL'), createdAt: NOW }];
    expect(replayLoyaltyLedger(100, entries, NOW).expiredAmount).toBe(0);
    expect(meta.expiresAt).toBe('2027-09-16T12:00:00.000Z');
    expect(replayLoyaltyLedger(100, entries, new Date('2027-09-16T12:00:00Z')).expiredAmount).toBe(100);
  });

  it('never retroactively changes dates when validity settings change', () => {
    const meta = loyaltyCreditMetadata({ bonusValidityDays: 30 }, new Date('2026-09-01T00:00:00Z'));
    expect(meta.expiresAt).toBe('2026-10-01T00:00:00.000Z');
    expect(() => loyaltyCreditMetadata({ bonusValidityDays: 0 }, NOW)).toThrow(BadRequestException);
    expect(loyaltyCreditMetadata({ bonusValidityDays: 365 }, NOW, { expiresAt: 'wrong' }).expiresAt).toBe('2027-09-16T12:00:00.000Z');
  });

  it.each([0, -1, 0.5, 201])('rejects invalid or excessive write-off %i', amount => {
    expect(() => loyaltyWriteOffMetadata(200, [entry('credit', 200, 1)], amount, NOW)).toThrow(BadRequestException);
  });

  it('computes levels from current settings, not a stale stored level', () => {
    expect(loyaltyLevel(100, { proThreshold: 50, premiumThreshold: 200 })).toBe('PRO');
    expect(loyaltyLevel(100, { proThreshold: 101, premiumThreshold: 200 })).toBe('START');
    expect(loyaltyLevel(200, { proThreshold: 50, premiumThreshold: 200 })).toBe('PREMIUM');
  });

  it('matches UTC birthdays only and ignores absent/invalid/future dates', () => {
    expect(birthdayIsToday('2000-09-16', NOW)).toBe(true);
    expect(birthdayIsToday('2000-09-15T23:30:00-01:00', NOW)).toBe(true);
    expect(birthdayIsToday('2090-09-16', NOW)).toBe(false);
    expect(birthdayIsToday(null, NOW)).toBe(false);
    expect(birthdayIsToday('not-a-date', NOW)).toBe(false);
    expect(birthdayIsToday('2000-02-30', new Date('2026-03-01T00:00:00Z'))).toBe(false);
  });

  it('uses February 28 for February 29 birthdays only in non-leap UTC years', () => {
    expect(birthdayIsToday('2000-02-29', new Date('2026-02-28T00:00:00Z'))).toBe(true);
    expect(birthdayIsToday('2000-02-29', new Date('2028-02-28T00:00:00Z'))).toBe(false);
    expect(birthdayIsToday('2000-02-29', new Date('2028-02-29T00:00:00Z'))).toBe(true);
  });
});
