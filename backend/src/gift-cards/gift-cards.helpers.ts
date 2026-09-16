import { BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { GIFT_CODE_PATTERN } from './gift-cards.dto';

export function normalizeGiftCode(code: string): string {
  if (typeof code !== 'string' || !GIFT_CODE_PATTERN.test(code.trim())) throw new BadRequestException('Неверный формат сертификата');
  return code.trim().replace(/-/g, '').toUpperCase();
}

export function generateGiftCode(): string {
  return randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g)!.join('-');
}

export const giftCodeHash = (code: string) => createHash('sha256').update(normalizeGiftCode(code)).digest('hex');
export const maskGiftCode = (code: string) => `••••-••••-••••-${normalizeGiftCode(code).slice(-4)}`;

// Decimal strings are parsed exactly; do not round fractional kopecks or coerce booleans.
export function giftMoneyMinor(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string' && !(value && typeof value === 'object' && 'toFixed' in value)) {
    throw new BadRequestException('Некорректная денежная сумма');
  }
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new BadRequestException('Сумма должна содержать не более двух знаков после запятой');
  const [rub, kop = ''] = text.split('.');
  const minor = Number(BigInt(rub) * 100n + BigInt(kop.padEnd(2, '0')));
  if (!Number.isSafeInteger(minor) || minor > 10_000_000_000) throw new BadRequestException('Денежная сумма слишком велика');
  return minor;
}

export function giftAmountMinor(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 10_000_000_000) throw new BadRequestException('Сумма списания должна быть положительной в копейках');
  return value;
}

export const giftMoney = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

export function giftValidityDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 3650) throw new BadRequestException('Срок действия должен быть от 1 до 3650 дней');
  return value;
}

export function giftNominal(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1_000_000) throw new BadRequestException('Номинал должен быть целым числом от 1 до 1 000 000 рублей');
  return value;
}

export function giftCardView(card: any) {
  return {
    id: card.id, maskedCode: card.maskedCode, faceValue: giftMoney(giftMoneyMinor(card.faceValue)),
    balance: giftMoney(giftMoneyMinor(card.balance)), reserved: giftMoney(giftMoneyMinor(card.reserved)), currency: card.currency,
    validityDays: card.validityDays, issuedAt: card.issuedAt, expiresAt: card.expiresAt, isActive: card.isActive,
    revision: card.revision, sourceOrderId: card.sourceOrderId, sourceItemId: card.sourceItemId, ordinal: card.ordinal,
    label: card.label, reason: card.reason, createdAt: card.createdAt,
  };
}
