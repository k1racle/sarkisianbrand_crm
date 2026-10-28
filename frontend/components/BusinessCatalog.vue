<script setup lang="ts">
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Package, Plus, Search, ShoppingBag, Trash2, X } from '@lucide/vue';
import { resolveProductImageUrl } from '~/shared/product-images';
import { cartAvailabilityProblem, confirmedAvailabilityLabel, confirmedOneCAvailable } from '~/shared/confirmed-availability';

const props = defineProps<{ products: any[]; cart: Record<string, number>; canOrder: boolean; busy: boolean; formatPrice: (value: any) => string }>();
const emit = defineEmits<{ quantity: [id: string, value: number]; checkout: [] }>();
const config = useRuntimeConfig();
const query = ref(''), category = ref(''), stock = ref('all'), sort = ref('name'), page = ref(1);
const failed = ref<Record<string, boolean>>({});
const cartPanel = ref<HTMLElement | null>(null);
const perPage = 12;
const categories = computed(() => {
  const values = new Map<string, string>();
  for (const product of props.products) for (const item of product.categories || []) values.set(item.category.id, item.category.nameRu || item.category.name);
  return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
});
const price = (product: any) => Math.min(...product.variants.map((variant: any) => Number(variant.b2bPrice)));
const filtered = computed(() => props.products.filter(product => {
  const matchesQuery = !query.value.trim() || `${product.nameRu} ${product.sku} ${product.variants.map((variant: any) => variant.sku).join(' ')}`.toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'));
  const available = product.variants.some((variant: any) => (confirmedOneCAvailable(variant) || 0) > 0);
  const empty = product.variants.length > 0 && product.variants.every((variant: any) => confirmedOneCAvailable(variant) === 0);
  const unknown = product.variants.some((variant: any) => confirmedOneCAvailable(variant) === null);
  return matchesQuery && (!category.value || product.categories?.some((item: any) => item.category.id === category.value))
    && (stock.value === 'all' || (stock.value === 'available' ? available : stock.value === 'unavailable' ? empty : unknown));
}).sort((a, b) => sort.value === 'price' ? price(a) - price(b) : sort.value === 'price-desc' ? price(b) - price(a) : a.nameRu.localeCompare(b.nameRu, 'ru')));
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)));
const visible = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage));
const hasFilters = computed(() => Boolean(query.value.trim() || category.value || stock.value !== 'all'));
const lines = computed(() => props.products.flatMap(product => product.variants.filter((variant: any) => props.cart[variant.id] > 0).map((variant: any) => ({ product, variant, quantity: props.cart[variant.id] }))));
const total = computed(() => lines.value.reduce((sum, line) => sum + line.quantity * Math.round(Number(line.variant.b2bPrice) * 100), 0) / 100);
const units = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0));
const orphanedCartIds = computed(() => { const known = new Set(props.products.flatMap(product => product.variants.map((variant: any) => variant.id))); return Object.keys(props.cart).filter(id => props.cart[id] > 0 && !known.has(id)); });
const cartIssue = computed(() => orphanedCartIds.value.length ? 'Некоторые позиции больше недоступны в каталоге. Уберите их из корзины.' : cartAvailabilityProblem(lines.value));
function clearOrphanedCart() { for (const id of orphanedCartIds.value) emit('quantity', id, 0); }
const image = (product: any) => failed.value[product.id] ? '' : resolveProductImageUrl(product.images?.[0]?.url, config.public.apiBase, String(config.public.siteUrl || ''));
watch([query, category, stock, sort], () => { page.value = 1; });
watch(pageCount, value => { page.value = Math.min(page.value, value); });
function reset() { query.value = ''; category.value = ''; stock.value = 'all'; sort.value = 'name'; page.value = 1; }
function set(variant: any, value: any) {
  const amount = Number(value);
  const requested = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0)), available = confirmedOneCAvailable(variant);
  if (available === null) { if (requested <= (props.cart[variant.id] || 0)) emit('quantity', variant.id, requested); return; }
  emit('quantity', variant.id, Math.min(requested, available));
}
function showCart() {
  cartPanel.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  cartPanel.value?.focus({ preventScroll: true });
}
</script>

<template>
  <div class="business-catalog">
    <section class="business-catalog-products" aria-label="Товары для закупки">
      <div class="salon-services-panel business-catalog-controls">
        <div class="salon-services-filters business-catalog-filters">
          <label class="salon-services-search"><Search :size="18" /><input v-model="query" type="search" placeholder="Название или артикул" aria-label="Поиск оптовых товаров" /><button v-if="query" type="button" aria-label="Очистить поиск товаров" @click="query = ''"><X :size="16" /></button></label>
          <select v-model="category" aria-label="Категория оптовых товаров"><option value="">Все категории</option><option v-for="[id, label] in categories" :key="id" :value="id">{{ label }}</option></select>
          <select v-model="stock" aria-label="Наличие оптовых товаров"><option value="all">Любой остаток</option><option value="available">В наличии</option><option value="unavailable">Нет в наличии</option><option value="unconfirmed">Остатки уточняются</option></select>
          <select v-model="sort" aria-label="Сортировка оптовых товаров"><option value="name">По названию</option><option value="price">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select>
        </div>
        <div class="business-results-summary"><span role="status" aria-live="polite">{{ hasFilters ? `Найдено: ${filtered.length} из ${products.length}` : `Товаров в каталоге: ${products.length}` }}</span><button v-if="hasFilters" type="button" class="business-text-control" @click="reset">Сбросить фильтры <X :size="14" /></button></div>
      </div>

      <button v-if="lines.length" type="button" class="business-cart-jump" @click="showCart"><ShoppingBag :size="18" /><span>Ваш заказ · {{ units }} шт.</span><strong>{{ formatPrice(total) }}</strong><ArrowRight :size="17" /></button>

      <div v-if="visible.length" class="business-product-grid">
        <article v-for="product in visible" :key="product.id" class="business-product" :class="{ 'is-selected': product.variants.some((variant: any) => cart[variant.id] > 0) }">
          <div class="business-product-image"><img v-if="image(product)" :src="image(product)" :alt="product.nameRu" loading="lazy" @error="failed[product.id] = true" /><Package v-else :size="32" aria-label="Изображение товара отсутствует" /></div>
          <div class="business-product-heading"><small>{{ product.sku }}</small><h3>{{ product.nameRu }}</h3></div>
          <p v-if="!product.variants.length" class="business-product-no-variants">Варианты товара сейчас недоступны</p>
          <div v-for="variant in product.variants" :key="variant.id" class="business-product-variant">
            <div><small v-if="product.variants.length > 1">{{ variant.name || variant.sku }}</small><div class="business-product-prices"><strong>{{ formatPrice(variant.b2bPrice) }}</strong><s v-if="Number(variant.retailPrice) > Number(variant.b2bPrice)">{{ formatPrice(variant.retailPrice) }}</s></div><small class="business-product-stock" :class="{ 'is-available': (confirmedOneCAvailable(variant) || 0) > 0 }"><i aria-hidden="true" />{{ confirmedAvailabilityLabel(variant) }}</small></div>
            <div class="business-quantity"><button type="button" :disabled="busy || !canOrder || !cart[variant.id]" :aria-label="`Уменьшить количество ${variant.sku}`" @click="set(variant, (cart[variant.id] || 0) - 1)"><Minus :size="15" /></button><input type="number" inputmode="numeric" min="0" :max="confirmedOneCAvailable(variant) ?? undefined" :value="cart[variant.id] || 0" :disabled="busy || !canOrder || (confirmedOneCAvailable(variant) || 0) < 1" :aria-label="`Количество ${variant.sku}`" @change="set(variant, ($event.target as HTMLInputElement).value)" /><button type="button" :disabled="busy || !canOrder || confirmedOneCAvailable(variant) === null || (cart[variant.id] || 0) >= (confirmedOneCAvailable(variant) || 0)" :aria-label="`Добавить ${variant.sku}`" @click="set(variant, (cart[variant.id] || 0) + 1)"><Plus :size="15" /></button></div>
          </div>
        </article>
      </div>
      <div v-else class="salon-services-panel salon-services-empty business-catalog-empty"><Package :size="30" /><h3>{{ products.length ? 'Подходящих товаров нет' : 'Каталог пока пуст' }}</h3><p>{{ products.length ? 'Попробуйте другое название, категорию или наличие.' : 'Товары появятся здесь после публикации. Менеджер поможет с подбором.' }}</p><button v-if="hasFilters" type="button" @click="reset">Показать все товары</button><NuxtLink v-else-if="!products.length" to="/b2b?section=support&area=purchases">Связаться с поддержкой</NuxtLink></div>

      <nav v-if="pageCount > 1" class="business-catalog-pagination" aria-label="Страницы каталога"><button type="button" :disabled="page === 1" aria-label="Предыдущая страница товаров" @click="page--"><ChevronLeft :size="17" />Назад</button><span aria-live="polite">{{ page }} из {{ pageCount }}</span><button type="button" :disabled="page === pageCount" aria-label="Следующая страница товаров" @click="page++">Далее<ChevronRight :size="17" /></button></nav>
    </section>

    <aside ref="cartPanel" class="business-cart salon-settings-panel" aria-label="Корзина закупок" tabindex="-1">
      <header><div class="business-cart-title"><ShoppingBag :size="20" /><h2>Ваш заказ</h2><span v-if="lines.length" class="business-count-badge">{{ lines.length }}</span></div><small>{{ lines.length ? `Товаров: ${units} шт.` : 'Пока ничего не добавлено' }}</small></header>
      <div v-if="!lines.length" class="business-cart-empty"><Package :size="28" /><p>Укажите количество у нужного товара — он появится здесь.</p></div>
      <div v-for="line in lines" :key="line.variant.id" class="business-cart-line"><div><strong>{{ line.product.nameRu }}</strong><small v-if="line.product.variants.length > 1">{{ line.variant.name || line.variant.sku }}</small><small>{{ line.quantity }} × {{ formatPrice(line.variant.b2bPrice) }}</small></div><strong>{{ formatPrice(line.quantity * line.variant.b2bPrice) }}</strong><button type="button" :disabled="busy" :aria-label="`Убрать ${line.variant.sku} из корзины`" @click="emit('quantity', line.variant.id, 0)"><Trash2 :size="16" /></button></div>
      <p v-if="cartIssue" class="business-cart-availability" role="status">{{ cartIssue }}</p><button v-if="orphanedCartIds.length" type="button" class="business-text-control" @click="clearOrphanedCart">Убрать недоступные позиции</button><footer><span>Итого<strong>{{ formatPrice(total) }}</strong></span><button type="button" class="primary" :disabled="busy || !canOrder || !lines.length || !!cartIssue" @click="emit('checkout')">Оформить заказ<ArrowRight :size="17" /></button><small>{{ canOrder ? 'Перед подтверждением покажем состав и итоговую сумму.' : 'Создание заказа доступно сотруднику с правом закупок.' }}</small></footer>
    </aside>
  </div>
</template>
