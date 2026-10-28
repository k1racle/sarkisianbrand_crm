import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';

// Restrict credentials to WB's official hosts; redirects are never followed.
const origins = { TEST: 'https://marketplace-api-sandbox.wildberries.ru', PRODUCTION: 'https://marketplace-api.wildberries.ru' } as const;

export class WildberriesFbsClient {
  constructor(private readonly token: string, private readonly environment: 'TEST' | 'PRODUCTION', private readonly request = fetch) {}

  private async call(path: string, body?: unknown): Promise<any> {
    const origin = origins[this.environment];
    if (!origin || !this.token?.trim()) throw new ServiceUnavailableException('Wildberries не настроен');
    let response: Response;
    try {
      response = await this.request(origin + path, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        headers: { Authorization: this.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new ServiceUnavailableException('Нет связи с API Wildberries'); }
    if (!response.ok) throw new BadGatewayException(`API Wildberries ответил HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > 10_000_000) throw new BadGatewayException('Слишком большой ответ Wildberries');
    try {
      const text = await response.text();
      if (text.length > 10_000_000) throw new Error();
      return JSON.parse(text);
    } catch { throw new BadGatewayException('Некорректный ответ API Wildberries'); }
  }

  async orders(from: number, to: number, next: number) {
    if (![from, to, next].every(Number.isSafeInteger) || from <= 0 || to < from || to - from > 30 * 86400 || next < 0) throw new BadGatewayException('Некорректный курсор Wildberries');
    const result = await this.call(`/api/v3/orders?limit=100&next=${next}&dateFrom=${from}&dateTo=${to}`);
    if (!result || !Array.isArray(result.orders) || result.orders.length > 100 || !Number.isSafeInteger(result.next) || result.next < 0 || (result.orders.length && result.next === next && next !== 0)) throw new BadGatewayException('Некорректная страница Wildberries');
    return { orders: result.orders as unknown[], next: result.next as number };
  }

  async statuses(ids: number[]) {
    if (!ids.length) return [];
    if (ids.length > 100 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw new BadGatewayException('Некорректные идентификаторы Wildberries');
    const result = await this.call('/api/v3/orders/status', { orders: ids });
    if (!result || !Array.isArray(result.orders) || result.orders.length !== ids.length) throw new BadGatewayException('Wildberries не подтвердил статусы всех заданий');
    const byId = new Map<number, any>();
    for (const status of result.orders) {
      if (!status || !ids.includes(status.id) || byId.has(status.id) || typeof status.supplierStatus !== 'string' || typeof status.wbStatus !== 'string') throw new BadGatewayException('Некорректный статус Wildberries');
      byId.set(status.id, status);
    }
    return ids.map(id => byId.get(id));
  }
}
