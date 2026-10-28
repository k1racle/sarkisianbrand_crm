/** Warehouse figures come only from the explicit 1C projection, never local CRM counters. */
export type WarehouseMetric = 'reserved' | 'picked' | 'checked' | 'shipped' | 'cancelled' | 'returned' | 'damaged';
export type WarehouseLine = { orderItemId: string } & Partial<Record<WarehouseMetric, number | null>>;
export type WarehouseExecution = {
  owner: 'ONE_C'; status?: string; receivedAt?: string; updatedAt?: string; occurredAt?: string; asOf?: string; validUntil?: string;
  warehouseId?: string; warehouseName?: string; documentId?: string; documentNumber?: string;
  revision?: string | number; error?: string; lines?: WarehouseLine[];
  isCurrent?: boolean; staleReason?: 'ORDER_CHANGED' | 'EXPIRED' | null;
  executorName?: string; performer?: string | { name?: string; displayName?: string };
  documents?: Array<{ id?: string; kind?: string; number?: string; name?: string; status?: string; occurredAt?: string }>;
};
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });
export function warehouseExecution(order: any): WarehouseExecution | null {
  const value = order?.warehouseExecution;
  return value && typeof value === 'object' && value.owner === 'ONE_C' ? value : null;
}
export function warehouseQuantity(order: any, itemId: string, metric: WarehouseMetric): number | null {
  const rows = warehouseExecution(order)?.lines;
  if (!Array.isArray(rows)) return null;
  const matches = rows.filter(row => row?.orderItemId === itemId);
  if (matches.length !== 1) return null;
  const value = matches[0][metric];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function warehouseTotal(order: any, metric: WarehouseMetric): number | null {
  if (!warehouseExecution(order) || !Array.isArray(order?.items) || !order.items.length) return null;
  const values = order.items.map((item: any) => warehouseQuantity(order, item.id, metric));
  return values.some((value: number | null) => value === null) ? null : values.reduce((sum: number, value: number) => sum + value, 0);
}
export function warehouseNumber(value: number | null | undefined): string { return value == null ? '—' : number.format(value); }
export function warehouseFactAt(order: any): string | undefined {
  const value = warehouseExecution(order);
  return value?.asOf || value?.occurredAt || value?.updatedAt || value?.receivedAt;
}
export function warehouseDocumentName(document: { name?: string; kind?: string }): string {
  const names: Record<string, string> = { PICKING_TASK: 'Задание на отбор', WAREHOUSE_TASK: 'Складское задание', EXPENSE_ORDER: 'Расходный ордер', OUTBOUND_ORDER: 'Расходный ордер', SALE: 'Документ реализации', RETURN: 'Документ возврата', TRANSFER: 'Перемещение' };
  return document.name || (document.kind ? names[document.kind] || document.kind : 'Документ 1С');
}
export function warehouseStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    RECEIVED: 'Получен в 1С', ACCEPTED: 'Принят в 1С', RESERVED: 'Зарезервирован', PARTIAL_RESERVE: 'Частичный резерв', READY_FOR_PICKING: 'Ожидает отбора',
    PICKING: 'Идёт отбор', PICKED: 'Отобран', CHECKING: 'Идёт проверка', CHECKED: 'Проверен', PACKED: 'Упакован', READY_TO_SHIP: 'Готов к отгрузке',
    PARTIALLY_SHIPPED: 'Частично отгружен', SHIPPED: 'Отгружен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', PARTIALLY_RETURNED: 'Частичный возврат', RETURNED: 'Возврат принят', REFUNDED: 'Возврат оформлен',
    SHORTAGE: 'Не хватает товара', REJECTED: 'Отклонён в 1С', ERROR: 'Ошибка обработки', NEEDS_ATTENTION: 'Требует проверки', REVIEW_REQUIRED: 'Нужна сверка', STALE: 'Данные требуют обновления', MISSING: 'Данные не получены',
    POSTED: 'Проведён', UNPOSTED: 'Не проведён', DELETED: 'Помечен на удаление',
  };
  return status ? labels[status] || `Статус 1С: ${String(status).slice(0, 120)}` : 'Статус склада не получен';
}
export function warehouseNeedsReview(order: any): boolean {
  const value = warehouseExecution(order);
  return Boolean(value?.isCurrent === false || value?.error || ['NEEDS_ATTENTION', 'REVIEW_REQUIRED', 'STALE', 'ERROR', 'REJECTED', 'SHORTAGE', 'PARTIAL_RESERVE'].includes(value?.status || ''));
}
export function orderTransfer(order: any): { label: string; detail: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (order?.oneCSyncError) return { label: 'Ошибка передачи в 1С', detail: String(order.oneCSyncError), tone: 'danger' };
  if (order?.isSynced1C === true) return { label: 'Передача в 1С подтверждена', detail: '1С подтвердила приём заказа. Состояние резерва и отгрузки показано отдельно.', tone: 'success' };
  if (order?.oneCSyncAt) return { label: 'Ожидает нового подтверждения 1С', detail: 'После изменения заказа новое подтверждение передачи ещё не получено.', tone: 'warning' };
  return { label: 'Передача в 1С не подтверждена', detail: 'Ожидаем подтверждение приёма заказа. Резерв и складское задание пока не подтверждены.', tone: 'neutral' };
}
export function orderSourceLabel(order: any): string {
  if (order?.source === 'MANUAL' && order?.sourceChannel === 'PARTNER_GIFT') return 'Подарок партнёру';
  const names: Record<string, string> = { WEB: 'Интернет-магазин', B2B: 'Кабинет B2B', MANUAL: 'Ручной заказ', ONE_C: '1С', OZON: 'Ozon', WILDBERRIES: 'Wildberries', YANDEX_MARKET: 'Яндекс Маркет', MEGAMARKET: 'Мегамаркет' };
  return names[order?.source] || order?.source || 'Источник не указан';
}
