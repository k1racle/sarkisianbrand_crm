// UI availability only. The API verifies the channel, payment and reservation again.
export const WEB_ORDER_OPERATOR_ROLES = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE'];

type WebOrderActionState = {
  source?: string;
  status: string;
  paymentStatus?: string;
  reservationState?: string;
  priceSnapshot?: { digitalDelivery?: boolean } | null;
};

export function webOrderNextStatuses(order: WebOrderActionState | null | undefined): string[] {
  if (!order || order.source !== 'WEB' || order.reservationState === 'RELEASED' || ['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) return [];
  const paid = order.paymentStatus === 'SUCCEEDED';
  const financiallyPaid = ['SUCCEEDED', 'PAID', 'REFUNDING', 'REFUNDED'].includes(order.paymentStatus || '');
  const digital = order.reservationState === 'DIGITAL' || order.priceSnapshot?.digitalDelivery === true;
  const next: string[] = order.status === 'NEW' ? ['CONFIRMED'] : [];
  if (paid) {
    const physical: Record<string, string[]> = {
      CONFIRMED: ['ASSEMBLING'], PAYMENT_WAITING: ['ASSEMBLING'], PAID: ['ASSEMBLING'],
      ASSEMBLING: ['SHIPPED'], SHIPPED: ['DELIVERED'],
    };
    if (digital && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING', 'PAID'].includes(order.status)) next.push('DELIVERED');
    else if (!digital) next.push(...(physical[order.status] || []));
  } else if (!financiallyPaid && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status)) next.push('CANCELLED');
  return next;
}
