import { createHash } from 'crypto';

export const hashCartSession = (session: string) => createHash('sha256').update(session).digest('hex');
export function hashShippingDestination(input: Record<string, any>) {
  const keys = ['provider', 'deliveryMethod', 'city', 'street', 'house', 'cityCode', 'pickupPointCode'];
  return createHash('sha256').update(JSON.stringify(keys.map(key => String(input[key] ?? '').trim().toLowerCase()))).digest('hex');
}
export function moneyMinor(value: any): number {
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Некорректная денежная сумма');
  return result;
}
