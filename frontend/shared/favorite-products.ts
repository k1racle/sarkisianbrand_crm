/** Public catalog accepts up to eight ids per request. Never walk the whole catalog. */
export async function fetchFavoriteProducts(ids: string[], fetchBatch: (ids: string[]) => Promise<unknown>) {
  const unique = [...new Set(ids)];
  if (unique.some(id => typeof id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(id))) throw new Error('Некорректный идентификатор сохранённого товара');
  const products = new Map<string, any>();
  const batches: string[][] = [];
  for (let offset = 0; offset < unique.length; offset += 8) batches.push(unique.slice(offset, offset + 8));
  // Bound parallelism for large lists, while returning favorites in saved order.
  for (let offset = 0; offset < batches.length; offset += 4) {
    const group = batches.slice(offset, offset + 4);
    const results = await Promise.all(group.map(batch => fetchBatch(batch))) as { items?: unknown }[];
    for (let index = 0; index < group.length; index++) {
      const batch = group[index], result = results[index];
      if (!result || !Array.isArray(result.items)) throw new Error('Некорректный ответ каталога');
      for (const item of result.items) {
        if (!item || typeof item.id !== 'string' || !batch.includes(item.id)) throw new Error('Некорректный товар в ответе каталога');
        products.set(item.id, item);
      }
    }
  }
  return unique.flatMap(id => products.has(id) ? [products.get(id)] : []);
}
