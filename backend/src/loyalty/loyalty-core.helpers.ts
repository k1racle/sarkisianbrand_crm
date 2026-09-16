import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const DEFAULT_LOYALTY_SETTINGS = {
  id: 'default', programName: 'SARKISIAN CLUB', isEnabled: true, earnPercent: 1,
  maxWriteOffPercent: 30, signupBonus: 0, birthdayBonus: 0, bonusValidityDays: 365,
  proThreshold: 3000, premiumThreshold: 10000, proMultiplierPercent: 120, premiumMultiplierPercent: 150,
};
export type LoyaltySettings = typeof DEFAULT_LOYALTY_SETTINGS;
export interface LedgerEntry {
  id: string; amount: number; type: string; createdAt: Date; metadata?: unknown;
}
export type CreditConsumption = { entryId: string; amount: number };
export interface LoyaltyUser {
  id: string; role: string; isActive: boolean;
}
interface CreditLot extends CreditConsumption { expiresAt: Date | null; createdAt: Date }
const OPENING = '__legacy_opening_balance__';
const DAY_MS = 86400_000;

export function loyaltyLevel(balance: number, settings: Pick<LoyaltySettings, 'proThreshold' | 'premiumThreshold'>) {
  return balance >= settings.premiumThreshold ? 'PREMIUM' : balance >= settings.proThreshold ? 'PRO' : 'START';
}

function metadata(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function expiry(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/** Use on every NEW positive credit (signup, payment, birthday, refund/reversal).
 * Refund policy: REVERSAL is a new positive credit with a fresh full TTL, not reopening
 * the original expired/spent lot. Legacy positive rows lacking expiresAt stay protected.
 * Setting changes affect new credits only; do not retroactively replace old expiry dates.
 */
export function loyaltyCreditMetadata(settings: Pick<LoyaltySettings, 'bonusValidityDays'>, now = new Date(), extra: Record<string, Prisma.InputJsonValue> = {}) {
  if (!Number.isInteger(settings.bonusValidityDays) || settings.bonusValidityDays < 1 || settings.bonusValidityDays > 3650) {
    throw new BadRequestException('Некорректный срок действия бонусов.');
  }
  return { ...extra, ledgerVersion: 1, expiresAt: new Date(now.getTime() + settings.bonusValidityDays * DAY_MS).toISOString() };
}

/** Read-only FIFO projection. Historical credits with no explicit expiresAt NEVER expire. */
export function replayLoyaltyLedger(balance: number, entries: readonly LedgerEntry[], now = new Date()) {
  const safeBalance = Math.max(0, Number.isSafeInteger(balance) ? balance : 0);
  const ordered = entries.filter(entry => Number.isSafeInteger(entry.amount) && entry.amount !== 0)
    .slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() ||
      // PostgreSQL now() is shared by rows in the same TX; credits precede tied debits.
      Number(b.amount > 0) - Number(a.amount > 0) || a.id.localeCompare(b.id));
  const ledgerSum = ordered.reduce((sum, entry) => sum + entry.amount, 0);
  const lots: CreditLot[] = [];
  const opening = Math.max(0, safeBalance - ledgerSum);
  if (opening) lots.push({ entryId: OPENING, amount: opening, createdAt: new Date(0), expiresAt: null });
  const consumeFifo = (amount: number) => {
    for (const lot of lots) {
      const used = Math.min(lot.amount, amount);
      lot.amount -= used; amount -= used;
      if (!amount) break;
    }
  };
  const consumeExplicit = (value: unknown, amount: number) => {
    if (!Array.isArray(value)) return amount;
    for (const part of value) {
      if (!part || typeof part.entryId !== 'string' || !Number.isSafeInteger(part.amount) || part.amount <= 0) continue;
      const lot = lots.find(item => item.entryId === part.entryId);
      if (!lot) continue;
      const used = Math.min(part.amount, lot.amount, amount);
      lot.amount -= used; amount -= used;
      if (!amount) break;
    }
    return amount;
  };
  for (const entry of ordered) {
    const meta = metadata(entry.metadata);
    if (entry.amount > 0) {
      lots.push({ entryId: entry.id, amount: entry.amount, createdAt: entry.createdAt, expiresAt: expiry(meta.expiresAt) });
    } else if (entry.type === 'EXPIRY' && Array.isArray(meta.expiredEntries)) {
      // Never let an expiry debit consume unrelated, non-expired credits.
      consumeExplicit(meta.expiredEntries, -entry.amount);
    } else {
      const remainder = consumeExplicit(meta.consumedEntries, -entry.amount);
      consumeFifo(remainder);
    }
  }
  // Conservative reconciliation: unexplained shortfalls count as spent, not expired again.
  const remaining = lots.reduce((sum, lot) => sum + lot.amount, 0);
  if (remaining > safeBalance) consumeFifo(remaining - safeBalance);
  const expiredEntries: CreditConsumption[] = lots.filter(lot => lot.amount > 0 && lot.expiresAt && lot.expiresAt <= now)
    .map(({ entryId, amount }) => ({ entryId, amount }));
  const expiredAmount = Math.min(safeBalance, expiredEntries.reduce((sum, entry) => sum + entry.amount, 0));
  return { balance: safeBalance, availableBalance: safeBalance - expiredAmount, expiredAmount, expiredEntries, lots };
}

/** Caller must hold the same LoyaltyAccount row lock used by maintainAccount/checkout. */
export function loyaltyWriteOffMetadata(balance: number, entries: readonly LedgerEntry[], amount: number, now = new Date()) {
  const state = replayLoyaltyLedger(balance, entries, now);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > state.availableBalance) throw new BadRequestException('Недостаточно действующих бонусов.');
  const consumedEntries: CreditConsumption[] = [];
  let remaining = amount;
  for (const lot of state.lots) {
    if (lot.expiresAt && lot.expiresAt <= now) continue;
    const used = Math.min(lot.amount, remaining);
    if (used) consumedEntries.push({ entryId: lot.entryId, amount: used });
    remaining -= used;
    if (!remaining) break;
  }
  if (remaining) throw new BadRequestException('Не удалось сверить бонусный баланс. Обратитесь в поддержку.');
  return { ledgerVersion: 1, consumedEntries };
}

export function birthdayIsToday(birthDate: Date | string | null | undefined, now = new Date()) {
  if (!birthDate) return false;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (!Number.isFinite(birth.getTime()) || birth > now) return false;
  if (typeof birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birth.toISOString().slice(0, 10) !== birthDate) return false;
  const month = birth.getUTCMonth();
  let day = birth.getUTCDate();
  // February 29 birthdays are observed February 28 in non-leap UTC years.
  const year = now.getUTCFullYear();
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (month === 1 && day === 29 && !leap) day = 28;
  return month === now.getUTCMonth() && day === now.getUTCDate();
}

/** Run INSIDE an owning Prisma TX. Locks account; expires only remaining explicit credits;
 * birthday is deduped once per UTC year. Returns fresh account/ledger for atomic operations.
 */
export async function maintainAccount(tx: Prisma.TransactionClient, userId: string, settings: LoyaltySettings, now = new Date()) {
  const user: LoyaltyUser | null = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
  if (!user?.isActive || user.role !== 'CUSTOMER_B2C') throw new NotFoundException('Активный клиент B2C не найден.');
  const initial = await tx.loyaltyAccount.upsert({ where: { userId }, update: {}, create: { userId } });
  await tx.$queryRaw`SELECT id FROM "LoyaltyAccount" WHERE id = ${initial.id} FOR UPDATE`;
  let account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: initial.id } });
  let entries = await tx.loyaltyTransaction.findMany({ where: { accountId: account.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  // Canonical B2C birthday belongs to Customer linked by its unique userId.
  const customer = await tx.customer.findUnique({ where: { userId }, select: { birthday: true } });
  const state = replayLoyaltyLedger(account.balance, entries, now);
  if (state.expiredAmount) {
    const entry = await tx.loyaltyTransaction.create({ data: {
      accountId: account.id, amount: -state.expiredAmount, type: 'EXPIRY', reason: 'Истёк срок действия неиспользованных бонусов',
      metadata: { ledgerVersion: 1, expiredEntries: state.expiredEntries },
    } });
    account = await tx.loyaltyAccount.update({ where: { id: account.id }, data: {
      balance: { decrement: state.expiredAmount }, level: loyaltyLevel(account.balance - state.expiredAmount, settings),
    } });
    entries = [...entries, entry];
  }
  const birthdayYear = now.getUTCFullYear();
  const alreadyAccrued = entries.some(entry => {
    const meta = metadata(entry.metadata);
    return meta.source === 'BIRTHDAY' && meta.birthdayYear === birthdayYear;
  });
  if (settings.isEnabled && settings.birthdayBonus > 0 && birthdayIsToday(customer?.birthday, now) && !alreadyAccrued) {
    if (!Number.isSafeInteger(settings.birthdayBonus) || settings.birthdayBonus > 1_000_000 || account.balance > 2_147_483_647 - settings.birthdayBonus) {
      throw new BadRequestException('Некорректное начисление бонусов ко дню рождения.');
    }
    const entry = await tx.loyaltyTransaction.create({ data: {
      accountId: account.id, amount: settings.birthdayBonus, type: 'ACCRUAL', reason: 'Бонусы ко дню рождения',
      metadata: loyaltyCreditMetadata(settings, now, { source: 'BIRTHDAY', birthdayYear }),
    } });
    account = await tx.loyaltyAccount.update({ where: { id: account.id }, data: {
      balance: { increment: settings.birthdayBonus }, level: loyaltyLevel(account.balance + settings.birthdayBonus, settings),
    } });
    entries = [...entries, entry];
  }
  return { account: { ...account, level: loyaltyLevel(account.balance, settings) }, entries, expiredAmount: state.expiredAmount };
}
