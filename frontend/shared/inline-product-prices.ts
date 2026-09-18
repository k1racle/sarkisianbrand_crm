export function inlineProductPrices(priceText: string, saleText: string) {
  const parse = (text: string) => {
    const normalized = text.trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Введите цену числом, не более двух знаков после запятой.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value > 100000000) throw new Error('Цена должна быть от 0 до 100 000 000 ₽.');
    return value;
  };
  const price = parse(priceText);
  const salePrice = saleText.trim() === '' ? null : parse(saleText);
  if (salePrice !== null && salePrice >= price) throw new Error('Акционная цена должна быть меньше обычной.');
  return { price, salePrice };
}
