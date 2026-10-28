// UI availability only. The API verifies the channel, payment and reservation again.
export const WEB_ORDER_OPERATOR_ROLES = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE', 'EXECUTIVE'];

type WebOrderActionState = {
  source?: string;
  status: string;
  paymentStatus?: string;
  reservationState?: string;
  fulfillmentManaged?: boolean;
  execution?: unknown;
  warehouseExecution?: unknown;
  isSynced1C?: boolean;
  pickingStartedAt?: string | null;
  pickedAt?: string | null;
  packedAt?: string | null;
  items?: Array<{ productType?: string }>;
  priceSnapshot?: { digitalDelivery?: boolean } | null;
};

export function webOrderNextStatuses(order: WebOrderActionState | null | undefined): string[] {
  if (!order || order.source !== 'WEB' || order.reservationState === 'RELEASED' || ['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) return [];
  const paid = order.paymentStatus === 'SUCCEEDED';
  const financiallyPaid = ['SUCCEEDED', 'PAID', 'REFUNDING', 'REFUNDED'].includes(order.paymentStatus || '');
  const digital = order.reservationState === 'DIGITAL' || order.priceSnapshot?.digitalDelivery === true || Boolean(order.items?.length && order.items.every(item => item.productType === 'GIFT_CARD'));
  const warehouseOwned = !digital && (['ACTIVE', 'CONSUMED'].includes(order.reservationState || '') || Boolean(order.fulfillmentManaged || order.execution || order.warehouseExecution || order.isSynced1C || order.pickingStartedAt || order.pickedAt || order.packedAt) || Boolean(order.items?.some(item => item.productType === 'PHYSICAL')));
  const next: string[] = order.status === 'NEW' ? ['CONFIRMED'] : [];
  if (paid) {
    if (digital && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING', 'PAID'].includes(order.status)) next.push('DELIVERED');
    // Physical execution belongs to 1C. SHIPPED is not a fact of delivery;
    // no separate confirmed delivery event is exposed by this employee DTO yet.
  } else if (!warehouseOwned && !financiallyPaid && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status)) next.push('CANCELLED');
  return next;
}
