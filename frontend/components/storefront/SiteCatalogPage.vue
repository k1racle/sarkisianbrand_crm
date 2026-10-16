<script setup lang="ts">
import { ChevronLeft, ChevronRight, Heart } from '@lucide/vue';
const props = defineProps<{ categorySlug?: string }>();
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const { t, english } = useHomeLocale();
const { favoriteIds } = useStorefront();
const { openFavorites } = useStorefrontPanels();
const str = (v: any) => typeof v === 'string' ? v : '';
const tags = (v: any) => [...new Set(str(v).split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
const price = (v: any) => str(v) !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100000000 ? String(Number(v)) : '';
const model = computed(() => ({
  search: str(route.query.search).slice(0, 200),
  categories: props.categorySlug ? [props.categorySlug] : tags(route.query.category),
  volumes: tags(route.query.volume).filter(value => /^\d{1,5}(?:\.\d{1,2})?$/.test(value)),
  purposes: tags(route.query.purpose), features: tags(route.query.feature),
  minPrice: price(route.query.minPrice), maxPrice: price(route.query.maxPrice),
  inStock: route.query.inStock === 'true',
  sort: ['new', 'popular', 'price-asc', 'price-desc', 'name'].includes(str(route.query.sort)) ? str(route.query.sort) : 'new',
  page: Math.min(100000, Math.max(1, Math.floor(Number(route.query.page) || 1))),
}));
function params(value: typeof model.value) {
  return { search: value.search || undefined, category: value.categories.join(',') || undefined, volume: value.volumes.join(',') || undefined, purpose: value.purposes.join(',') || undefined, feature: value.features.join(',') || undefined, minPrice: value.minPrice || undefined, maxPrice: value.maxPrice || undefined, inStock: value.inStock ? 'true' : undefined, sort: value.sort === 'new' ? undefined : value.sort, page: value.page === 1 ? undefined : value.page };
}
const query = computed(() => ({ ...params(model.value), limit: 12 }));
const apiBase = import.meta.server ? config.seoApiBase : config.public.apiBase;
const { data, pending, error, refresh } = await useFetch<any>('/products', { key: `catalog-design-products:${props.categorySlug || 'all'}`, baseURL: apiBase, query });
const { data: filterData, error: filterError, refresh: refreshFilters } = await useFetch<any>('/products/filters', { key: 'catalog-design-facets', baseURL: apiBase });
const facets = computed(() => ({ categories: [], purposes: [], features: [], volumes: [], price: { min: 0, max: 0 }, ...filterData.value }));
const selectedCategory = computed(() => model.value.categories.length === 1 ? facets.value.categories.find((category: any) => category.slug === model.value.categories[0]) : null);
const catalogTitle = computed(() => t(selectedCategory.value?.nameRu || 'Каталог'));
const collectionWordScale = computed(() => Math.min(1, 4 / Array.from(catalogTitle.value).length));
const categoryDescription = computed(() => typeof selectedCategory.value?.description === 'string' ? selectedCategory.value.description : selectedCategory.value?.description?.ru || '');
const products = computed(() => data.value?.items || []);
const pagination = computed(() => data.value?.pagination || { pages: 0, total: 0 });
async function apply(value: typeof model.value) {
  const next = params(value);
  await router.push({ path: value.categories.length === 1 ? storefrontCatalogLink(value.categories[0]) : '/catalog', query: value.categories.length === 1 ? { ...next, category: undefined } : next });
}
function reset() { return apply({ search: '', categories: [], volumes: [], purposes: [], features: [], minPrice: '', maxPrice: '', inStock: false, sort: 'new', page: 1 }); }
async function changePage(page: number) {
  await apply({ ...model.value, page });
  document.querySelector('#catalog-heading')?.scrollIntoView({ behavior: 'instant', block: 'start' });
}
useHead(() => ({ htmlAttrs: { lang: english.value ? 'en' : 'ru' } }));
useStorefrontSeo({ title: () => `${selectedCategory.value?.nameRu || 'Каталог'} — SARKISIAN BRAND`, description: () => categoryDescription.value || 'Материалы и инструменты для маникюра. Выберите категорию, объём и стоимость.', noindex: () => model.value.categories.some(slug => !facets.value.categories.some((category: any) => category.slug === slug)) });
</script>

<template>
  <SiteShell editorial catalog>
    <div class="sc-page">
      <header class="sc-hero sh-container">
        <NuxtLink to="/" class="sc-wordmark" aria-label="SARKISIAN — на главную"><img src="/storefront/home/hero-wordmark.svg" alt="SARKISIAN" width="1412" height="196" fetchpriority="high" /></NuxtLink>
        <div class="sc-hero-copy"><p>{{ t('Премиальный бренд для мастеров маникюра, который понимает профессию изнутри.') }}<br />{{ t('Материалы, которые помогают работать быстрее и увереннее') }}</p><span>{{ t('От мастера — к мастерам') }}</span></div>
      </header>
      <section class="sc-catalog sh-container" aria-labelledby="catalog-heading">
        <header class="sc-heading">
          <h1 id="catalog-heading" :class="{ 'sc-category-title': selectedCategory }">{{ catalogTitle }}</h1>
          <button type="button" class="sc-favorites" :aria-label="t('Избранное')" @click="openFavorites"><Heart :stroke-width="1.5" /><span v-if="favoriteIds.length">{{ favoriteIds.length }}</span></button>
        </header>
        <p v-if="categoryDescription" class="sc-category-description">{{ categoryDescription }}</p>
        <p v-if="filterError" class="sc-state" role="alert">{{ t('Не удалось загрузить фильтры.') }} <button type="button" class="sb-design-button" @click="refreshFilters()">{{ t('Повторить') }}</button></p>
        <SiteCatalogDesignFilters :model="model" :facets="facets" @apply="apply" @reset="reset" />
        <section class="sc-results" :aria-label="t('Товары')" :aria-busy="pending">
          <div v-if="pending" class="sc-state" role="status">{{ t('Загружаем товары…') }}</div>
          <div v-else-if="error" class="sc-state" role="alert"><p>{{ t('Не удалось загрузить каталог.') }}</p><button type="button" class="sb-design-button" @click="refresh()">{{ t('Повторить') }}</button></div>
          <div v-else-if="products.length" class="sc-product-grid" :class="`sc-count-${products.length}`">
            <span class="sc-collection-word" :style="{ '--sc-word-scale': collectionWordScale }" aria-hidden="true">{{ catalogTitle }}</span>
            <ProductCard v-for="product in products" :key="product.id" :product="product" :volumes="model.volumes" catalog />
          </div>
          <div v-else class="sc-state"><h2>{{ t('Товары не найдены') }}</h2><p>{{ t('Измените параметры или сбросьте фильтры.') }}</p><button type="button" class="sb-design-button" @click="reset">{{ t('Сбросить фильтры') }}</button></div>
          <nav v-if="pagination.pages > 1" class="sc-pagination" :aria-label="t('Страницы каталога')"><button type="button" :disabled="model.page <= 1" :aria-label="t('Предыдущая страница')" @click="changePage(model.page - 1)"><ChevronLeft :size="20" /></button><span>{{ model.page }} / {{ pagination.pages }}</span><button type="button" :disabled="model.page >= pagination.pages" :aria-label="t('Следующая страница')" @click="changePage(model.page + 1)"><ChevronRight :size="20" /></button></nav>
        </section>
      </section>
    </div>
  </SiteShell>
</template>
