export type StorefrontPaymentProvider = 'YOOKASSA' | 'TBANK' | 'ROBOKASSA';
export type PaymentProviderCapability = { provider: StorefrontPaymentProvider; available: boolean; courseAvailable: boolean; courseReason?: string | null; environment?: string | null; reason?: string | null };
export const PAYMENT_PROVIDER_NAMES: Record<StorefrontPaymentProvider, string> = { YOOKASSA: 'ЮKassa', TBANK: 'Т-Банк', ROBOKASSA: 'Робокасса' };
export function paymentProviderList(value: unknown): PaymentProviderCapability[] {
  const raw = value && typeof value === 'object' ? (value as { providers?: unknown }).providers : undefined;
  if (!Array.isArray(raw)) throw new Error('Некорректный ответ платёжного сервиса');
  const seen = new Set<string>(), result: PaymentProviderCapability[] = [];
  for (const item of raw) {
    if (!item || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, item.provider) || typeof item.available !== 'boolean' || seen.has(item.provider)) continue;
    seen.add(item.provider);
    result.push({ provider: item.provider, available: item.available, courseAvailable: item.courseAvailable === true, courseReason: typeof item.courseReason === 'string' ? item.courseReason : null, environment: item.environment === 'TEST' ? 'TEST' : item.environment === 'PRODUCTION' ? 'PRODUCTION' : null, reason: typeof item.reason === 'string' ? item.reason : null });
  }
  return result;
}

export type RobokassaForm = { action: string; method: 'POST'; fields: Record<string, string> };
export function robokassaCourseForm(value: unknown, provider: unknown, expected: StorefrontPaymentProvider): RobokassaForm {
  const invalid = () => new Error('Получена некорректная форма оплаты. Заказ сохранён, обратитесь в поддержку.');
  if (provider !== 'ROBOKASSA' || expected !== 'ROBOKASSA' || !value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const form = value as Record<string, unknown>;
  if (form.action !== 'https://auth.robokassa.ru/Merchant/Index.aspx' || form.method !== 'POST' || !form.fields || typeof form.fields !== 'object' || Array.isArray(form.fields) || Object.keys(form).some(key => !['action','method','fields'].includes(key))) throw invalid();
  const fields = form.fields as Record<string, unknown>;
  const limits: Record<string, number> = { MerchantLogin:100, OutSum:16, InvId:10, Description:100, Receipt:8192, Shp_payment:36, SignatureValue:128, Email:64, IsTest:1 };
  const required = Object.keys(limits).filter(key => key !== 'IsTest');
  if (Object.keys(fields).some(key => !Object.hasOwn(limits, key)) || required.some(key => !Object.hasOwn(fields, key)) || Object.entries(fields).some(([key, value]) => typeof value !== 'string' || !value.length || value.length > limits[key] || /[\u0000-\u001f\u007f]/.test(value))) throw invalid();
  if (!/^\d+(?:\.\d{2})$/.test(fields.OutSum as string) || !/^[1-9]\d*$/.test(fields.InvId as string) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.Shp_payment as string) || !/^(?:[0-9a-f]{32}|[0-9a-f]{64}|[0-9a-f]{128})$/i.test(fields.SignatureValue as string) || (fields.IsTest !== undefined && fields.IsTest !== '1')) throw invalid();
  return { action: form.action, method: 'POST', fields: fields as Record<string, string> };
}
export function submitRobokassaCourseForm(value: unknown, provider: unknown, expected: StorefrontPaymentProvider): void {
  const validated = robokassaCourseForm(value, provider, expected);
  const element = document.createElement('form'); element.method = 'POST'; element.action = validated.action; element.target = '_self'; element.hidden = true;
  for (const [name, value] of Object.entries(validated.fields)) { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; element.appendChild(input); }
  document.body.appendChild(element);
  try { HTMLFormElement.prototype.submit.call(element); } finally { element.remove(); }
}
export function officialPaymentUrl(value: unknown, provider: unknown, expected: StorefrontPaymentProvider): string {
  if (typeof value !== 'string' || provider !== expected || !Object.hasOwn(PAYMENT_PROVIDER_NAMES, expected)) throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.'); }
  const allowed = expected === 'YOOKASSA' ? ['yoomoney.ru', 'yookassa.ru'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)) : expected === 'TBANK' ? ['securepayments.tinkoff.ru', 'securepayments.tbank.ru'].includes(url.hostname) : url.hostname === 'auth.robokassa.ru';
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowed) throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.');
  return url.href;
}
