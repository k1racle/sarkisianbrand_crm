type CatalogCategory = { slug: string; nameRu?: string; isActive?: boolean; sortOrder?: number };
type CatalogProduct = { slug: string; categories?: { isPrimary?: boolean; category?: CatalogCategory }[] };

export function catalogCategoryPath(category: string | CatalogCategory) {
  const slug = typeof category === 'string' ? category : category.slug;
  return `/catalog/${encodeURIComponent(slug)}`;
}

export function catalogProductCategory(product: CatalogProduct) {
  return [...(product.categories || [])]
    .filter(item => item.category?.slug && item.category.isActive !== false)
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary))
      || (a.category?.sortOrder || 0) - (b.category?.sortOrder || 0)
      || a.category!.slug.localeCompare(b.category!.slug, 'en'))[0]?.category;
}

export function catalogProductPath(product: CatalogProduct) {
  const category = catalogProductCategory(product);
  return `${category ? catalogCategoryPath(category) : '/catalog'}/${encodeURIComponent(product.slug)}`;
}
