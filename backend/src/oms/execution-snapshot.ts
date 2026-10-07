import { createHash } from 'crypto';
export function executionSnapshot(order: any) {
 return createHash('sha256').update(JSON.stringify({ source: order.source, total: String(order.totalAmount), discount: String(order.discountAmount), final: String(order.finalAmount), currency: order.currency,
  shippingAddress: order.shippingAddress, shippingCost: String(order.shippingCost), shippingProvider: order.shippingProvider, paymentMethod: order.paymentMethod,
  items: [...order.items].sort((a,b) => a.id.localeCompare(b.id)).map(i => [i.id, i.variantId, i.quantity, String(i.price), String(i.total), i.productType]) })).digest('hex');
}
