import { BadGatewayException } from '@nestjs/common';
import { MarketplaceChannel } from '@prisma/client';
import type { MarketplaceOrderInput } from '../oms/oms.service';

export type OzonMode = 'FBS' | 'FBO';
export type OzonPage = { postings: unknown[]; has_next: boolean; cursor?: string };

/** Never fall back to an invented price, SKU, quantity or status. */
export function normalizeOzonPosting(raw: any, mode: OzonMode): MarketplaceOrderInput {
  if (!raw || typeof raw !== 'object' || typeof raw.posting_number !== 'string' || !raw.posting_number.trim() || !Array.isArray(raw.products) || !raw.products.length) throw new BadGatewayException('Ozon вернул отправление без номера или состава');
  const status = String(raw.status || '').toLowerCase();
  if (!status) throw new BadGatewayException('Ozon вернул отправление без статуса');
  let totalMinor = 0;
  const items = raw.products.map((p: any) => {
    const sku = String(p?.offer_id ?? '').trim();
    const amount = p?.price && typeof p.price === 'object' ? p.price.amount : p?.price;
    const currency = p?.price && typeof p.price === 'object' ? p.price.currency : p?.currency_code;
    const price = Number(amount), quantity = Number(p?.quantity);
    if (!sku || amount === null || amount === undefined || amount === '' || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000 || (currency && currency !== 'RUB')) throw new BadGatewayException('Ozon вернул товар без артикула, количества или цены в рублях');
    const minor = Math.round(price * 100);
    if (Math.abs(price * 100 - minor) > 0.000001 || !Number.isSafeInteger(minor * quantity)) throw new BadGatewayException('Некорректная цена товара Ozon');
    totalMinor += minor * quantity;
    if (!Number.isSafeInteger(totalMinor)) throw new BadGatewayException('Сумма отправления Ozon слишком велика');
    const externalValue = p.sku ?? p.product_id;
    if (typeof externalValue === 'number' && !Number.isSafeInteger(externalValue)) throw new BadGatewayException('Ozon вернул некорректный идентификатор товара');
    if (!/^[1-9]\d{0,19}$/.test(String(externalValue ?? ''))) throw new BadGatewayException('Ozon не передал идентификатор варианта товара');
    const externalVariantId = `${p.sku == null ? 'product' : 'sku'}:${String(externalValue)}`;
    return { sku, offerId: externalVariantId, externalVariantId, productId: p.product_id == null ? undefined : String(p.product_id), name: typeof p.name === 'string' ? p.name : sku, quantity, price: minor / 100, total: minor * quantity / 100 };
  });
  // Marketplace delivery statuses are not evidence of warehouse execution in 1C.
  // An explicit cancellation is staged for reconciliation if work already started.
  const normalizedStatus = status === 'cancelled' ? 'CANCELLED' : 'NEW';
  return { channel: MarketplaceChannel.OZON, externalId: raw.posting_number.trim(), fulfillmentMode: mode, status: normalizedStatus, totalAmount: totalMinor / 100, items,
    trackingNumber: typeof raw.tracking_number === 'string' ? raw.tracking_number : undefined,
    payload: { provider: 'OZON', sourceStatus: status, sourceSubstatus: typeof raw.substatus === 'string' ? raw.substatus : null, orderNumber: typeof raw.order_number === 'string' ? raw.order_number : null } };
}

/** Read-only seller endpoints. URL is fixed so credentials cannot be sent to a configured host. */
export async function readOzonPage(credentials: {clientId: string; apiKey: string}, mode: OzonMode, window: {since: string; to: string; cursor: string}, transport: typeof fetch = fetch): Promise<OzonPage> {
  const url = `https://api-seller.ozon.ru/${mode === 'FBS' ? 'v4/posting/fbs/list' : 'v3/posting/fbo/list'}`;
  let response: Response;
  try {
    response = await transport(url, { method: 'POST', headers: {'Content-Type': 'application/json', 'Client-Id': credentials.clientId, 'Api-Key': credentials.apiKey},
      body: JSON.stringify({ cursor: window.cursor, filter: {since: window.since, to: window.to}, limit: 50, ...(mode === 'FBS' ? {dir: 'ASC'} : {sort_dir: 'asc'}), with: {financial_data: true} }), redirect: 'error', signal: AbortSignal.timeout(20000) });
  } catch { throw new BadGatewayException('Не удалось получить отправления Ozon'); }
  if (!response.ok) throw new BadGatewayException(`Ozon не подтвердил запрос отправлений (HTTP ${response.status})`);
  let data: any;
  try { data = await response.json(); } catch { throw new BadGatewayException('Некорректный ответ Ozon'); }
  if (!data || !Array.isArray(data.postings) || typeof data.has_next !== 'boolean' || (data.has_next && (typeof data.cursor !== 'string' || !data.cursor || data.cursor === window.cursor))) throw new BadGatewayException('Ozon вернул неполную или некорректную страницу отправлений');
  return { postings: data.postings, has_next: data.has_next, cursor: data.cursor };
}
