// Size labels come from merchant variant options, then variant/product names.
export function catalogVolume(variant: any, product: any): string {
  const options = variant?.options || {};
  const configured = options.volume ?? options['объем'] ?? options['объём'] ?? options.weight;
  const source = configured == null ? `${variant?.name || ''} ${product?.nameRu || ''}` : String(configured);
  const match = source.match(/(?:^|[^\d])([0-9]+(?:[.,][0-9]+)?)\s*(мл|ml|гр|г|g)(?![a-zа-я])/i);
  if (match) return `${Number(match[1].replace(',', '.'))} ${/^(ml|мл)$/i.test(match[2]) ? 'мл' : 'гр'}`;
  return configured != null && /^\d+(?:[.,]\d+)?$/.test(source.trim()) ? String(Number(source.trim().replace(',', '.'))) : '';
}
