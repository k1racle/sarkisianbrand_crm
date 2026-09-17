<script setup lang="ts">
import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, X } from '@lucide/vue';
definePageMeta({ middleware: 'catalog-legacy-links' });
const route = useRoute(); const router = useRouter(); const config = useRuntimeConfig();
const mobileFilters = ref(false); const drawer = ref<HTMLElement>(); const trigger = ref<HTMLElement>(); const duration = useStorefrontMotion();
const str = (v: any) => typeof v === 'string' ? v : '';
const tags = (v: any) => [...new Set(str(v).split(',').map(s => s.trim()).filter(Boolean))].slice(0,20);
const price = (v: any) => str(v) !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100000000 ? String(Number(v)) : '';
function routeModel() { return { search: str(route.query.search).slice(0,200), categories: tags(route.query.category), purposes: tags(route.query.purpose), features: tags(route.query.feature), minPrice: price(route.query.minPrice), maxPrice: price(route.query.maxPrice), inStock: route.query.inStock === 'true', sort: ['new','popular','price-asc','price-desc','name'].includes(str(route.query.sort)) ? str(route.query.sort) : 'new', page: Math.min(100000,Math.max(1,Math.floor(Number(route.query.page) || 1))) }; }
const model = reactive(routeModel());
const query = computed(() => ({ search: model.search || undefined, category: model.categories.join(',') || undefined, purpose: model.purposes.join(',') || undefined, feature: model.features.join(',') || undefined, minPrice: model.minPrice || undefined, maxPrice: model.maxPrice || undefined, inStock: model.inStock ? 'true' : undefined, sort: model.sort, page: model.page, limit: 24 }));
const { data, pending, error, refresh } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query });
const { data: filterData, error: filterError, refresh: refreshFilters } = await useFetch<any>('/products/filters', { baseURL: config.public.apiBase });
const facets = computed(() => filterData.value || { categories: [], purposes: [], features: [], price: { min: 0, max: 0 } });
const selectedCategory=computed(()=>model.categories.length===1?facets.value.categories.find((category:any)=>category.slug===model.categories[0]):null);
const categoryDescription=computed(()=>typeof selectedCategory.value?.description==='string'?selectedCategory.value.description:selectedCategory.value?.description?.ru||'');
const products = computed(() => data.value?.items || []);
const pagination = computed(() => data.value?.pagination || { pages: 0 });
const active = computed(() => [
 ...(model.search ? [{ field: 'search', value: model.search, label: 'Поиск: ' + model.search }] : []),
 ...model.categories.map(value => ({ field: 'categories', value, label: facets.value.categories.find((c: any) => c.slug === value)?.nameRu || value })),
 ...model.purposes.map(value => ({ field: 'purposes', value, label: value })),
 ...model.features.map(value => ({ field: 'features', value, label: value })),
 ...((model.minPrice || model.maxPrice) ? [{ field: 'price', value: '', label: (model.minPrice ? 'от ' + Number(model.minPrice).toLocaleString('ru-RU') : '') + (model.maxPrice ? ' до ' + Number(model.maxPrice).toLocaleString('ru-RU') : '') + ' ₽' }] : []),
 ...(model.inStock ? [{ field: 'inStock', value: '', label: 'В наличии' }] : []),
]);
function update(field: string, value: any) { (model as any)[field] = value; model.page = 1; }
function prices(min: string, max: string) { model.minPrice = min; model.maxPrice = max; model.page = 1; }
function reset() { Object.assign(model, { search: '', categories: [], purposes: [], features: [], minPrice: '', maxPrice: '', inStock: false, sort: 'new', page: 1 }); }
function remove(item: any) { if (item.field === 'price') prices('', ''); else if (item.field === 'search') update('search', ''); else if (item.field === 'inStock') update('inStock', false); else update(item.field, (model as any)[item.field].filter((v: string) => v !== item.value)); }
let syncingRoute = 0;
watch(query, value => { const { limit, ...params } = value; const next = Object.fromEntries(Object.entries(params).filter(([k,v]) => v !== undefined && !(k === 'sort' && v === 'new') && !(k === 'page' && v === 1))); syncingRoute++; router.replace({ query: next }).catch(() => undefined).finally(() => { syncingRoute--; }); });
watch(() => route.query, () => { if (syncingRoute) return; const next = routeModel(); if (JSON.stringify(next) !== JSON.stringify(model)) Object.assign(model, next); });
let oldOverflow = ''; let locked = false;
function release() { if (locked) { document.documentElement.style.overflow = oldOverflow; locked = false; } trigger.value?.focus(); }
watch(mobileFilters, async open => { if (open) { if (!locked) { oldOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; locked = true; } await nextTick(); drawer.value?.querySelector<HTMLButtonElement>('button')?.focus(); } });
function keyboard(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); mobileFilters.value = false; } if (e.key !== 'Tab') return; const controls = [...(drawer.value?.querySelectorAll<HTMLElement>('button,input,select,a[href]') || [])].filter(el => !el.hasAttribute('disabled') && el.getClientRects().length); const first = controls[0], last = controls[controls.length-1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
onBeforeUnmount(() => { if (locked) { document.documentElement.style.overflow = oldOverflow; locked = false; } });
useStorefrontSeo({ title:()=>`${selectedCategory.value?.nameRu||'Каталог'} — SARKISIAN BRAND`, description:()=>categoryDescription.value||'Материалы и инструменты для маникюра. Выберите категорию, назначение и стоимость.', noindex: () => model.categories.some(slug => !facets.value.categories.some((category: any) => category.slug === slug)) });
</script>
<template>
<SiteShell><div class="sb-catalog-page">
 <div class="sb-breadcrumbs"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Каталог</span></div>
 <div class="sb-catalog-title"><h1>{{selectedCategory?.nameRu||'Каталог'}}</h1><button ref="trigger" type="button" class="sb-filter-mobile" @click="mobileFilters = true"><SlidersHorizontal :size="18" /><span>Фильтры и сортировка</span></button></div><p v-if="categoryDescription" class="sb-category-description">{{categoryDescription}}</p>
 <div class="sb-catalog-layout sb-catalog-layout--filtered">
  <aside class="sb-filters sb-filters--catalog" aria-label="Фильтры каталога"><h2>Фильтры</h2><p v-if="filterError" class="sb-filter-note">Не удалось загрузить фильтры. <button type="button" class="sb-checkout-text" @click="refreshFilters()">Повторить</button></p><SiteCatalogFilters v-else :model="model" :facets="facets" @change="update" @prices="prices" @reset="reset" /></aside>
  <section class="sb-catalog-results" aria-label="Товары" :aria-busy="pending">
   <div v-if="active.length" class="sb-catalog-applied"><button v-for="item in active" :key="item.field + item.value" type="button" :aria-label="'Убрать фильтр: ' + item.label" @click="remove(item)">{{ item.label }}<span aria-hidden="true">×</span></button><button type="button" class="sb-checkout-text" @click="reset">Сбросить всё</button></div>
   <div v-if="pending" class="sb-state" role="status">Загружаем товары…</div><div v-else-if="error" class="sb-state is-error" role="alert">Не удалось загрузить каталог. <button type="button" class="sb-checkout-text" @click="refresh()">Повторить</button></div>
   <div v-else-if="products.length" class="sb-product-grid is-catalog"><ProductCard v-for="product in products" :key="product.id" :product="product" /></div>
   <div v-else class="sb-empty"><h2>Товары не найдены</h2><p>Измените параметры или сбросьте фильтры.</p><button type="button" class="sb-primary" @click="reset">Сбросить фильтры <ArrowRight :size="18" /></button></div>
   <nav v-if="pagination.pages > 1" class="sb-pagination" aria-label="Страницы каталога"><button type="button" :disabled="model.page <= 1" aria-label="Предыдущая страница" @click="model.page--"><ChevronLeft :size="18" /></button><span>{{ model.page }} из {{ pagination.pages }}</span><button type="button" :disabled="model.page >= pagination.pages" aria-label="Следующая страница" @click="model.page++"><ChevronRight :size="18" /></button></nav>
  </section>
 </div>
</div></SiteShell>
<Teleport to="body"><Transition name="sf-drawer" :duration="duration" @after-leave="release"><div v-if="mobileFilters" class="sb-glass-layer" @click.self="mobileFilters = false"><aside ref="drawer" class="sb-side-drawer sb-catalog-filter-drawer" role="dialog" aria-modal="true" aria-label="Фильтры каталога" @keydown="keyboard"><header class="sb-drawer-head sb-catalog-filter-head"><h2>Фильтры</h2><button type="button" aria-label="Закрыть фильтры" @click="mobileFilters = false"><X :size="20" /></button></header><p v-if="filterError" class="sb-filter-note">Не удалось загрузить фильтры. <button type="button" class="sb-checkout-text" @click="refreshFilters()">Повторить</button></p><SiteCatalogFilters v-else :model="model" :facets="facets" @change="update" @prices="prices" @reset="reset" /><button type="button" class="sb-primary sb-filter-show" @click="mobileFilters = false">Показать товары <ArrowRight :size="18" /></button></aside></div></Transition></Teleport>
</template>
