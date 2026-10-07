// Channel projections affect only public availability, never physical inventory.
export const salesStockInclude = { select: { channel: true, quantity: true } } as const;
export function salesQuantity(variant: any, channel: string) {
 const raw = Math.max(0, variant.stock - variant.reserved);
 const row = variant.channelStocks?.find((s: any) => s.channel === channel);
 return row ? Math.max(0, Math.min(raw, row.quantity)) : raw;
}
export function salesVariant<T extends { stock: number; reserved: number }>(variant: T, channel: string): T {
 const { channelStocks, ...view } = variant as any;
 return { ...view, stock: variant.reserved + salesQuantity(variant, channel) };
}
export function salesProduct<T extends { variants: any[]; productType?: string }>(product: T, channel = 'WEB'): T {
 return { ...product, variants: product.variants.map(v => product.productType === 'GIFT_CARD' ? v : salesVariant(v, channel)) };
}
