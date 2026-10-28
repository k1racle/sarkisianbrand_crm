export function confirmedOneCAvailable(variant: any): number | null {
  const value = variant?.available;
  return variant?.availabilityStatus === 'CURRENT' && typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function confirmedAvailabilityLabel(variant: any): string {
  const value = confirmedOneCAvailable(variant);
  return value === null ? 'Остатки 1С уточняются' : value > 0 ? `В наличии: ${value} шт.` : 'Нет в наличии';
}
export function cartAvailabilityProblem(lines: Array<{ product?: any; variant: any; quantity: number }>): string {
  for (const line of lines) {
    const available = confirmedOneCAvailable(line.variant);
    const name = line.product?.nameRu || line.variant?.name || 'Позиция заказа';
    if (available === null) return `${name}: остатки 1С уточняются. Дождитесь подтверждения наличия или уберите позицию из заказа.`;
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > available) return `${name}: подтверждено в наличии ${available} шт. Проверьте количество в корзине.`;
  }
  return '';
}
