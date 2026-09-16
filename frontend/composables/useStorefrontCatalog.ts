export const storefrontCategories = [
  { title: 'Новинки', query: 'нов', image: '/storefront/categories/instruments.jpg' },
  { title: 'Гели', query: 'гель', image: '/storefront/categories/gels.jpg' },
  { title: 'Гель-лаки', query: 'гель-лак', image: '/storefront/categories/gel-polish.jpg' },
  { title: 'Базы', query: 'база', image: '/storefront/categories/bases.jpg' },
  { title: 'Топы', query: 'топ', image: '/storefront/categories/tops.jpg' },
  { title: 'Фрезы', query: 'фреза', image: '/storefront/categories/cutters.jpg' },
  { title: 'Инструменты', query: 'ножницы', image: '/storefront/categories/instruments.jpg' },
  { title: 'Уход', query: 'масло', image: '/storefront/brand-strip.jpg' },
];

const productImages: Record<string, string> = {
  'gel-muss-prozrachnyi-15-gr': '/storefront/products/gel-mousse-clear.jpg',
  'freza-almaznaya-shar-40-mm': '/storefront/products/cutter-ball.jpg',
  'gel-muss-kamufliruyushchiy-23': '/storefront/products/gel-mousse-23.jpg',
  'gel-skorostnoy-002-30-ml': '/storefront/products/speed-gel-002.jpg',
};

export function storefrontProductImage(product: any) {
  // Legacy demo /catalog/*.jpg values never had corresponding files.
  const apiImage = product?.images?.slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder).find((image: any) => !image.url.startsWith('/catalog/') && /^(https?:\/\/|\/(?!\/))/.test(image.url))?.url;
  if (apiImage?.startsWith('/api/')) return new URL(apiImage, useRuntimeConfig().public.apiBase).toString();
  return apiImage || productImages[product?.slug] || null;
}

export type StorefrontCategory = { id: string; slug: string; nameRu: string; parentId?: string | null; isActive?: boolean; imageUrl?: string | null };
export type StorefrontCatalogQuickLinkKey = 'new' | 'popular' | 'gift-card';
export type StorefrontCatalogMenu = {
  entries?: Array<{ categoryId: string; label?: string; isVisible?: boolean }>;
  quickLinks?: Array<{ key: StorefrontCatalogQuickLinkKey; label?: string; isVisible?: boolean }>;
};

export function storefrontActiveCategories(categories: StorefrontCategory[] = []) {
  const slugs = new Set<string>();
  return categories.filter(category => {
    if (!category || category.isActive === false || !category.id || typeof category.slug !== 'string' || !category.slug.trim() || category.slug.includes(',') || !category.nameRu || slugs.has(category.slug)) return false;
    slugs.add(category.slug); return true;
  });
}

export function storefrontCategoryGroups(values: StorefrontCategory[] = [], menu?: StorefrontCatalogMenu | null) {
  const overrides = new Map<string, { label?: string; isVisible?: boolean }>();
  const positions = new Map<string, number>();
  const allById = new Map(values.filter(category => category?.id).map(category => [category.id, category]));
  for (const entry of Array.isArray(menu?.entries) ? menu.entries : []) {
    if (!entry || !allById.has(entry.categoryId) || overrides.has(entry.categoryId)) continue;
    positions.set(entry.categoryId, positions.size);
    overrides.set(entry.categoryId, { label: typeof entry.label === 'string' ? entry.label.trim() : undefined, isVisible: entry.isVisible });
  }
  function visible(category: StorefrontCategory) {
    const ancestors = new Set<string>();
    let current: StorefrontCategory | undefined = category;
    while (current && !ancestors.has(current.id)) {
      if (current.isActive === false || overrides.get(current.id)?.isVisible === false) return false;
      ancestors.add(current.id);
      current = current.parentId ? allById.get(current.parentId) : undefined;
    }
    return true;
  }
  const categories = storefrontActiveCategories(values).filter(visible).sort((a, b) => (positions.get(a.id) ?? positions.size) - (positions.get(b.id) ?? positions.size));
  const label = (category: StorefrontCategory) => overrides.get(category.id)?.label || category.nameRu;
  const byId = new Map(categories.map(category => [category.id, category]));
  const visited = new Set<string>();
  function group(root: StorefrontCategory) {
    visited.add(root.id);
    const items: Array<StorefrontCategory & { label: string }> = [];
    function children(parent: StorefrontCategory, path: string[]) {
      for (const child of categories.filter(category => category.parentId === parent.id)) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        const labels = [...path, label(child)];
        items.push({ ...child, label: labels.join(' / ') });
        children(child, labels);
      }
    }
    children(root, []);
    return { ...root, label: label(root), items };
  }
  const groups = categories.filter(category => !category.parentId || !byId.has(category.parentId)).map(group);
  // An orphan or malformed cycle still exposes only real category slugs, once each.
  for (const category of categories) if (!visited.has(category.id)) groups.push(group(category));
  return groups;
}

export function storefrontCatalogQuickLinks(menu?: StorefrontCatalogMenu | null) {
  const defaults = [
    { key: 'new' as const, label: 'Новинки', description: 'Свежие продукты бренда', url: '/catalog?sort=new' },
    { key: 'popular' as const, label: 'Бестселлеры', description: 'Выбор мастеров', url: '/catalog?sort=popular' },
    { key: 'gift-card' as const, label: 'Подарочная карта', description: 'Подарок без ошибки', url: '/products/gift-card' },
  ];
  const byKey = new Map(defaults.map(link => [link.key, link]));
  const seen = new Set<StorefrontCatalogQuickLinkKey>();
  const links: typeof defaults = [];
  for (const entry of Array.isArray(menu?.quickLinks) ? menu.quickLinks : []) {
    const base = entry && byKey.get(entry.key);
    if (!base || seen.has(entry.key)) continue;
    seen.add(entry.key);
    if (entry.isVisible !== false) links.push({ ...base, label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : base.label });
  }
  return [...links, ...defaults.filter(link => !seen.has(link.key))];
}

export function storefrontCatalogMenu(categories: StorefrontCategory[] = [], menu?: StorefrontCatalogMenu | null) {
  return { groups: storefrontCategoryGroups(categories, menu), quickLinks: storefrontCatalogQuickLinks(menu) };
}

export function storefrontCatalogLink(category?: string | Pick<StorefrontCategory, 'slug'>) {
  const slug = typeof category === 'string' ? category.trim() : category?.slug?.trim();
  return slug ? `/catalog?category=${encodeURIComponent(slug)}` : '/catalog';
}
