import { createHash, timingSafeEqual } from 'crypto';

// Robokassa signs the original OutSum text, including trailing zeros. Compare
// the normalized amount with our immutable payment only after verification.
// https://docs.robokassa.ru/ru/notifications-and-redirects
export type RobokassaHash = 'MD5' | 'SHA256' | 'SHA512';
type PaymentForm = {
  merchantLogin: string; amount: string; invoiceId: number; password1: string;
  algorithm: RobokassaHash; isTest: boolean; localPaymentId: string; description?: string;
  receipt?: Record<string, unknown>;
};
type ResultFields = { outSum: unknown; invId: unknown; signatureValue: unknown; extra?: Record<string, unknown> };

const MAX_INVOICE = 2_147_483_647;
const PAYMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digests: Record<RobokassaHash, string> = { MD5: 'md5', SHA256: 'sha256', SHA512: 'sha512' };

function hash(value: string, algorithm: RobokassaHash): string {
  if (!Object.prototype.hasOwnProperty.call(digests, algorithm)) throw new Error('Unsupported Robokassa signature algorithm');
  return createHash(digests[algorithm]).update(value, 'utf8').digest('hex');
}

function invoice(value: unknown): number {
  const raw = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw) || Number(raw) > MAX_INVOICE) throw new Error('Invalid Robokassa invoice');
  return Number(raw);
}

function money(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{1,13}(?:\.\d{1,6})?$/.test(value)) throw new Error('Invalid Robokassa amount');
  const [whole, decimals = ''] = value.split('.');
  if (decimals.slice(2).replace(/0/g, '')) throw new Error('Invalid Robokassa amount precision');
  const cents = BigInt(whole) * 100n + BigInt(decimals.slice(0, 2).padEnd(2, '0'));
  if (cents <= 0n || cents >= 1_000_000_000_000_000n) throw new Error('Invalid Robokassa amount');
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function makeRobokassaUrl(input: PaymentForm): string {
  const merchant = input.merchantLogin.trim();
  if (!merchant || merchant.length > 100 || /[:\s]/.test(merchant) || !input.password1 || !PAYMENT_ID.test(input.localPaymentId)) throw new Error('Invalid Robokassa merchant configuration');
  const amount = money(input.amount), id = invoice(input.invoiceId);
  // Receipt is encoded before signing, and then encoded as a query parameter.
  // A missing receipt must be allowed only by the caller's explicit fiscal policy.
  const receipt = input.receipt === undefined ? undefined : encodeURIComponent(JSON.stringify(input.receipt));
  const custom = `Shp_payment=${input.localPaymentId}`;
  const signature = hash([merchant, amount, String(id), ...(receipt ? [receipt] : []), input.password1, custom].join(':'), input.algorithm);
  const url = new URL('https://auth.robokassa.ru/Merchant/Index.aspx');
  url.searchParams.set('MerchantLogin', merchant);
  url.searchParams.set('OutSum', amount);
  url.searchParams.set('InvId', String(id));
  if (input.description) url.searchParams.set('Description', input.description.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 100));
  if (receipt) url.searchParams.set('Receipt', receipt);
  url.searchParams.set('Shp_payment', input.localPaymentId);
  url.searchParams.set('SignatureValue', signature);
  if (input.isTest) url.searchParams.set('IsTest', '1');
  return url.toString();
}

/** Receipt is signed URL-encoded, then a browser POST form encodes it again. */
export function makeRobokassaPost(input: PaymentForm & { email: string }): { action: string; method: 'POST'; fields: Record<string, string> } {
  if (!input.receipt || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 64) throw new Error('Receipt and customer email are required');
  const url = new URL(makeRobokassaUrl(input));
  const fields = Object.fromEntries(url.searchParams.entries());
  fields.Email = input.email;
  return { action: 'https://auth.robokassa.ru/Merchant/Index.aspx', method: 'POST', fields };
}

export function verifyRobokassaResult(fields: ResultFields, password2: string, algorithm: RobokassaHash): { invoiceId: number; amount: string; localPaymentId: string } {
  if (!password2 || typeof fields.outSum !== 'string' || typeof fields.invId !== 'string' || typeof fields.signatureValue !== 'string') throw new Error('Invalid Robokassa notification');
  // Bind the signed callback to this exact local payment as invoice numbers may
  // already have been used by the same merchant before our installation.
  const localPaymentId = fields.extra?.Shp_payment;
  if (typeof localPaymentId !== 'string' || !PAYMENT_ID.test(localPaymentId) || Object.keys(fields.extra || {}).some(key => /^shp_/i.test(key) && key !== 'Shp_payment')) throw new Error('Unexpected Robokassa parameter');
  const id = invoice(fields.invId), amount = money(fields.outSum);
  const expected = hash(`${fields.outSum}:${fields.invId}:${password2}:Shp_payment=${localPaymentId}`, algorithm);
  if (!/^[a-fA-F0-9]+$/.test(fields.signatureValue) || fields.signatureValue.length !== expected.length) throw new Error('Invalid Robokassa signature');
  if (!timingSafeEqual(Buffer.from(fields.signatureValue.toLowerCase(), 'hex'), Buffer.from(expected, 'hex'))) throw new Error('Invalid Robokassa signature');
  return { invoiceId: id, amount, localPaymentId };
}
