/** Public projection only. Never read internal warehouse errors, IDs, documents or performers here. */
export type CustomerWarehouseStatus = { stage: string | null; asOf: string | null; isCurrent: boolean };
const labels: Record<string, string> = {
  RECEIVED: 'Заказ получен складом', RESERVING: 'Резервируем товары', RESERVED: 'Товары зарезервированы', PARTIAL_RESERVE: 'Часть товаров зарезервирована',
  READY_FOR_PICKING: 'Ожидает сборки', PICKING: 'Собираем заказ', PICKED: 'Заказ собран', CHECKING: 'Проверяем комплектацию', CHECKED: 'Комплектация проверена',
  PACKED: 'Заказ упакован', READY_TO_SHIP: 'Готов к отгрузке', PARTIALLY_SHIPPED: 'Частично отгружен', SHIPPED: 'Отгружен',
  PARTIALLY_RETURNED: 'Частичный возврат', RETURNED: 'Возврат принят', CANCELLED: 'Отменён', NEEDS_ATTENTION: 'Уточняем заказ',
};
export function customerWarehouseLabel(value: CustomerWarehouseStatus | null | undefined): string {
  return value?.isCurrent === true && value.stage && labels[value.stage] ? labels[value.stage] : 'Статус склада уточняется';
}
export function customerWarehouseAsOf(value: CustomerWarehouseStatus | null | undefined): string {
  return value?.isCurrent === true && value.stage && labels[value.stage] && value.asOf && Number.isFinite(Date.parse(value.asOf))
    ? new Date(value.asOf).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}
export function customerWarehouseApplies(order: any): boolean {
  if (typeof order?.requiresWarehouse === 'boolean') return order.requiresWarehouse;
  if (order?.priceSnapshot?.digitalDelivery === true || order?.reservationState === 'DIGITAL') return false;
  return !Array.isArray(order?.items) || !order.items.length || !order.items.every((item: any) => item.productType === 'GIFT_CARD');
}
