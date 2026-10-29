<script setup lang="ts">
import { ArrowRight, Check, ChevronLeft, Heart, ShoppingBag, Trash2, X } from '@lucide/vue';
import { storefrontVariantPrice } from '~/shared/product-merchandising';
import { fetchFavoriteProducts } from '~/shared/favorite-products';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { favoriteIds, favoriteSyncError, toggleFavorite, addToCart, syncFavorites, accessToken, user, loadMe } = useStorefront();
const products = ref<any[]>([]);
const loading = ref(false);
const loadError = ref('');
const busyId = ref('');
const addedId = ref('');
const errorId = ref('');
const addError = ref('');
const failedImages = ref<string[]>([]);
let addedTimer: ReturnType<typeof setTimeout> | undefined;
let loadRevision = 0;

const favorites = computed(() => products.value.filter(product => favoriteIds.value.includes(product.id)).map(product => {
  const variants = (product.variants || []).filter((item: any) => item.isActive !== false);
  const gift = product.productType === 'GIFT_CARD';
  const variant = gift ? [...variants].sort((a: any, b: any) => Number(a.price) - Number(b.price))[0]
    : variants.find((item: any) => Number(item.stock) > Number(item.reserved || 0)) || variants[0];
  return {
    product, variant, gift, image: storefrontProductImage(product),
    available: gift ? Boolean(variant) : Number(variant?.stock || 0) > Number(variant?.reserved || 0),
    price: variant ? storefrontVariantPrice(variant, gift) : Number(product.basePrice || 0),
    regularPrice: Number(variant?.regularPrice ?? variant?.price ?? product.basePrice ?? 0),
    category: (product.categories?.find((item: any) => item.isPrimary) || product.categories?.[0])?.category?.nameRu || 'SARKISIAN BRAND',
  };
}));
const countLabel = computed(() => {
  const count = favoriteIds.value.length, last = count % 10, lastTwo = count % 100;
  return count + ' ' + (last === 1 && lastTwo !== 11 ? 'товар' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'товара' : 'товаров');
});
const unavailable = computed(() => Math.max(0, new Set(favoriteIds.value).size - favorites.value.length));

async function load() {
  const revision = ++loadRevision;
  loading.value = true;
  loadError.value = '';
  products.value = [];
  try {
    if (accessToken.value && !user.value) await loadMe();
    if (accessToken.value && !user.value) throw new Error('Сессия недоступна');
    const token = accessToken.value, owner = user.value?.id;
    await syncFavorites();
    if (revision !== loadRevision || token !== accessToken.value || owner !== user.value?.id) return;
    const result = await fetchFavoriteProducts([...favoriteIds.value], batch => $fetch('/products', { baseURL: config.public.apiBase, query: { limit: 8, ids: batch.join(',') } }));
    if (revision === loadRevision && token === accessToken.value && owner === user.value?.id) products.value = result;
  } catch {
    if (revision === loadRevision) loadError.value = 'Не удалось загрузить избранное. Попробуйте ещё раз.';
  } finally {
    if (revision === loadRevision) loading.value = false;
  }
}

async function add(item: (typeof favorites.value)[number]) {
  if (busyId.value || !item.available) return;
  if (item.gift) { emit('close'); await navigateTo(storefrontProductLink(item.product)); return; }
  busyId.value = item.product.id;
  errorId.value = '';
  addError.value = '';
  try {
    await addToCart(item.product, 1, item.variant.id);
    addedId.value = item.product.id;
    clearTimeout(addedTimer);
    addedTimer = setTimeout(() => { addedId.value = ''; }, 1600);
  } catch (error: any) {
    errorId.value = item.product.id;
    addError.value = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || 'Не удалось добавить товар. Попробуйте ещё раз.';
  } finally { busyId.value = ''; }
}

watch([() => props.open, accessToken, () => user.value?.id], ([value]) => {
  if (value) {
    errorId.value = '';
    addError.value = '';
    void load();
  } else { loadRevision++; products.value = []; }
}, { immediate: true });
onBeforeUnmount(() => { loadRevision++; clearTimeout(addedTimer); });
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer sd-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-favorites-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="favorites-drawer-title">
          <div class="sd-toolbar">
            <button type="button" aria-label="Вернуться к покупкам" @click="emit('close')"><ChevronLeft :size="32" :stroke-width="1" /></button>
            <button type="button" aria-label="Закрыть" @click="emit('close')"><X :size="32" :stroke-width="1.5" /></button>
          </div>
          <div class="sd-content">
            <header class="sd-heading sd-cart-heading"><h2 id="favorites-drawer-title">Избранное</h2><span aria-live="polite">{{ countLabel }}</span></header>

            <div v-if="loading" class="sb-drawer-state" role="status">Загружаем избранное…</div>
            <div v-else-if="loadError" class="sd-favorites-error">
              <p class="sb-form-error" role="alert">{{ loadError }}</p>
              <button type="button" class="sb-liquid-primary" @click="load">Повторить загрузку</button>
            </div>
            <div v-else-if="favoriteSyncError && !favorites.length" class="sd-favorites-error"><p class="sb-form-error" role="alert">Не удалось синхронизировать избранное с аккаунтом. Попробуйте ещё раз.</p><button type="button" class="sb-liquid-primary" @click="load">Повторить загрузку</button></div>
            <template v-else-if="favorites.length">
              <p v-if="favoriteSyncError" class="sb-form-error" role="status">Не удалось синхронизировать избранное с аккаунтом. Показаны товары, сохранённые на этом устройстве. <button type="button" @click="load">Повторить</button></p>
              <p v-else-if="unavailable" class="sb-form-error" role="status">Некоторые сохранённые товары сейчас недоступны.</p>
              <div class="sd-cart-list sd-favorite-list" :aria-busy="Boolean(busyId)">
                <article v-for="item in favorites" :key="item.product.id" class="sd-cart-item">
                  <div class="sd-cart-media">
                    <NuxtLink :to="storefrontProductLink(item.product)" class="sd-cart-image" @click="emit('close')">
                      <img v-if="item.image && !failedImages.includes(item.product.id)" :src="item.image" :alt="item.product.nameRu" loading="lazy" @error="failedImages.push(item.product.id)" />
                      <span v-else class="sd-image-placeholder">SARKISIAN<small>Фото появится позже</small></span>
                    </NuxtLink>
                  </div>
                  <div class="sd-cart-info">
                    <small>{{ item.category }}</small>
                    <NuxtLink :to="storefrontProductLink(item.product)" @click="emit('close')">{{ item.product.nameRu }}</NuxtLink>
                    <small v-if="item.variant?.name && item.variant.name !== 'Основной вариант'">{{ item.variant.name }}</small>
                    <div class="sd-favorite-price"><del v-if="item.regularPrice > item.price">{{ item.regularPrice.toLocaleString('ru-RU') }} ₽</del><strong>{{ item.price.toLocaleString('ru-RU') }} ₽</strong></div>
                    <div class="sd-favorite-actions">
                      <button type="button" class="sb-liquid-primary" :disabled="Boolean(busyId) || !item.available" @click="add(item)"><Check v-if="addedId === item.product.id" :size="17" /><ShoppingBag v-else :size="17" :stroke-width="1.5" />{{ busyId === item.product.id ? 'Добавляем…' : addedId === item.product.id ? 'Добавлено' : !item.available ? 'Нет в наличии' : item.gift ? 'Выбрать номинал' : 'В корзину' }}</button>
                      <button type="button" class="sd-remove" :aria-label="'Убрать из избранного: ' + item.product.nameRu" @click="toggleFavorite(item.product.id)"><Trash2 :size="16" /><span>Убрать</span></button>
                    </div>
                    <p v-if="errorId === item.product.id && addError" class="sb-form-error" role="alert">{{ addError }}</p>
                  </div>
                </article>
              </div>
              <span class="sb-visually-hidden" role="status">{{ addedId ? 'Добавлено в корзину' : '' }}</span>
              <div class="sd-favorites-footer"><NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Продолжить покупки <ArrowRight :size="17" /></NuxtLink></div>
            </template>

            <div v-else-if="favoriteIds.length" class="sb-drawer-empty"><i><Heart :size="30" :stroke-width="1.5" /></i><h3>Сохранённые товары сейчас недоступны</h3><p>Они могут появиться позже.</p><NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Открыть каталог <ArrowRight :size="17" /></NuxtLink></div>
            <div v-else class="sb-drawer-empty">
              <i><Heart :size="30" :stroke-width="1.5" /></i>
              <h3>Сохраняйте любимое</h3>
              <p>Нажимайте на сердце в карточке товара — он появится здесь.</p>
              <NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Открыть каталог <ArrowRight :size="17" /></NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
