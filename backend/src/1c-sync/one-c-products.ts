import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { OneCProductDto } from './dto/sync.dto';

// The catalog endpoint is not a versioned stock feed. Missing stock means
// "not supplied", not zero. Reject a malformed package before opening a
// transaction so a partial response cannot silently update part of a catalog.
function numeric(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

type Failure = (message: string) => Error;

export function validateCatalogProducts(products: unknown, failure: Failure): asserts products is OneCProductDto[] {
  if (!Array.isArray(products) || !products.length) throw failure('1С не передала непустой список товаров');
  const externalIds = new Set<string>(), skus = new Set<string>(), slugs = new Set<string>();
  for (const [index, product] of products.entries()) {
    const label = `Товар 1С №${index + 1}`;
    if (!product || typeof product !== 'object' || Array.isArray(product)) throw failure(`${label}: некорректная запись`);
    for (const field of ['externalId', 'sku', 'nameRu', 'slug'] as const) {
      if (typeof product[field] !== 'string' || !product[field].trim()) throw failure(`${label}: отсутствует ${field}`);
    }
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0 || product.price >= 1e13) throw failure(`${label}: укажите корректную цену`);
    // Product prices are stored with two decimal places; reject instead of
    // silently rounding values that cannot be represented by the catalog.
    const cents = product.price * 100;
    if (Math.abs(cents - Math.round(cents)) > Math.max(1e-7, Number.EPSILON * Math.abs(cents) * 2)) throw failure(`${label}: цена должна быть указана с точностью до копейки`);
    if (product.stock !== undefined && (typeof product.stock !== 'number' || !Number.isInteger(product.stock) || product.stock < 0 || product.stock > 2147483647)) throw failure(`${label}: остаток должен быть целым неотрицательным числом`);
    for (const [field, seen] of [['externalId', externalIds], ['sku', skus], ['slug', slugs]] as const) {
      if (seen.has(product[field])) throw failure(`${label}: повторяется ${field}`);
      seen.add(product[field]);
    }
  }
}

export function parseOneCCatalog(raw: unknown): OneCProductDto[] {
  const response = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const items = Array.isArray(raw) ? raw : response.products ?? response.value;
  if (!Array.isArray(items) || !items.length) throw new BadGatewayException('1С не передала непустой список товаров');
  const products = items.map((item: any, index: number) => {
    const fail = (field: string): never => { throw new BadGatewayException(`Товар 1С №${index + 1}: некорректное значение ${field}`); };
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail('записи');
    const externalId = text(item.externalId ?? item.ref ?? item.Ref_Key);
    const sku = text(item.sku ?? item.article ?? item.Code);
    const nameRu = text(item.nameRu ?? item.name ?? item.Description);
    const slug = text(item.slug ?? item.sku ?? item.article ?? item.Code).toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '');
    const price = numeric(item.price ?? item.basePrice);
    if (price === undefined) return fail('цены');
    const stockValue = item.stock !== undefined ? item.stock : item.quantity;
    const stock = stockValue === undefined ? undefined : numeric(stockValue);
    if (stockValue !== undefined && stock === undefined) return fail('остатка');
    return { externalId, sku, nameRu, slug, price, ...(stock !== undefined ? { stock } : {}) };
  });
  validateCatalogProducts(products, message => new BadGatewayException(message));
  return products;
}

export function assertCatalogImport(products: unknown): asserts products is OneCProductDto[] {
  validateCatalogProducts(products, message => new BadRequestException(message));
}
