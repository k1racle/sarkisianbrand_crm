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
  const apiImage = product?.images?.find((image: any) => /^https?:\/\//.test(image.url))?.url;
  return apiImage || productImages[product?.slug] || null;
}

export function storefrontCatalogLink(query?: string) {
  return query ? { path: '/catalog', query: { search: query } } : '/catalog';
}
