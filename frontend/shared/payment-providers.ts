export type StorefrontPaymentProvider = 'YOOKASSA' | 'TBANK' | 'ROBOKASSA';
export type PaymentProviderCapability = { provider: StorefrontPaymentProvider; available: boolean; environment?: string | null; reason?: string | null };
export const PAYMENT_PROVIDER_NAMES: Record<StorefrontPaymentProvider, string> = { YOOKASSA: 'ЮKassa', TBANK: 'Т-Банк', ROBOKASSA: 'Робокасса' };
export function paymentProviderList(value: unknown): PaymentProviderCapability[] {
  const raw = value && typeof value === 'object' ? (value as { providers?: unknown }).providers : undefined;
  if (!Array.isArray(raw)) throw new Error('Некорректный ответ платёжного сервиса');
  const seen = new Set<string>(), result: PaymentProviderCapability[] = [];
  for (const item of raw) {
    if (!item || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, item.provider) || typeof item.available !== 'boolean' || seen.has(item.provider)) continue;
    seen.add(item.provider);
    result.push({ provider: item.provider, available: item.available, environment: item.environment === 'TEST' ? 'TEST' : item.environment === 'PRODUCTION' ? 'PRODUCTION' : null, reason: typeof item.reason === 'string' ? item.reason : null });
  }
  return result;
}
export function officialPaymentUrl(value: unknown, provider: unknown, expected: StorefrontPaymentProvider): string {
  if (typeof value !== 'string' || provider !== expected || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, expected)) throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.'); }
  const allowed = expected === 'YOOKASSA' ? ['yoomoney.ru', 'yookassa.ru'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)) : expected === 'TBANK' ? ['securepayments.tinkoff.ru', 'securepayments.tbank.ru'].includes(url.hostname) : url.hostname === 'auth.robokassa.ru';
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowed) throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.');
  return url.href;
}
