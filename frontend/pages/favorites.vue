<script setup lang="ts">
import { Heart } from '@lucide/vue';
import { fetchFavoriteProducts } from '~/shared/favorite-products';

const config = useRuntimeConfig();
const { favoriteIds, favoriteSyncError, syncFavorites, authReady, accessToken, user } = useStorefront();
const loadedProducts = ref<any[]>([]), loading = ref(true), error = ref('');
const products = computed(() => loadedProducts.value.filter(product => favoriteIds.value.includes(product.id)));
const unavailable = computed(() => Math.max(0, new Set(favoriteIds.value).size - products.value.length));
let revision = 0;

async function load(sync = false) {
  const current = ++revision;
  const token = accessToken.value, owner = user.value?.id;
  loading.value = true; error.value = ''; loadedProducts.value = [];
  try {
    if (!authReady.value) return;
    if (token && !owner) throw new Error('Не удалось подтвердить вход. Проверьте соединение и повторите попытку.');
    if (sync) await syncFavorites();
    if (current !== revision || token !== accessToken.value || owner !== user.value?.id) return;
    const ids = [...favoriteIds.value];
    const result = await fetchFavoriteProducts(ids, batch => $fetch('/products', { baseURL: config.public.apiBase, query: { limit: 8, ids: batch.join(',') } }));
    if (current === revision && token === accessToken.value && owner === user.value?.id) loadedProducts.value = result;
  } catch {
    if (current === revision) error.value = token && !owner ? 'Не удалось подтвердить вход. Проверьте соединение и повторите попытку.' : 'Не удалось загрузить избранное. Проверьте соединение и повторите попытку.';
  } finally {
    if (current === revision && authReady.value) loading.value = false;
  }
}

onMounted(() => {
  watch([authReady, accessToken, () => user.value?.id], () => { if (authReady.value) void load(true); }, { immediate: true });
  watch(() => favoriteIds.value.join('|'), () => { if (authReady.value) void load(); });
});
onBeforeUnmount(() => { revision++; });
useSeoMeta({ title: 'Избранное — SARKISIAN BRAND' });
</script>

<template>
  <SiteShell><div class="sb-simple-page">
    <div class="sb-breadcrumbs"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Избранное</span></div>
    <div class="sb-page-title"><p>ВАША ПОДБОРКА</p><h1>Избранное</h1></div>
    <div v-if="loading" class="sb-state" role="status">Загружаем товары…</div>
    <div v-else-if="error" class="sb-state"><p role="alert">{{ error }}</p><button type="button" class="sb-primary" @click="load(true)">Повторить загрузку</button></div>
    <template v-else>
      <p v-if="favoriteSyncError" class="sb-state" role="status">Не удалось синхронизировать избранное с аккаунтом. Показаны товары, сохранённые на этом устройстве. <button type="button" @click="load(true)">Повторить</button></p>
      <p v-if="unavailable && !favoriteSyncError" class="sb-state" role="status">Некоторые сохранённые товары сейчас недоступны.</p>
      <div v-if="products.length" class="sb-product-grid"><ProductCard v-for="product in products" :key="product.id" :product="product" /></div>
      <div v-else-if="favoriteIds.length && !favoriteSyncError" class="sb-empty"><Heart :size="36" /><h2>Сохранённые товары сейчас недоступны</h2><p>Они могут появиться позже.</p><NuxtLink to="/catalog" class="sb-primary">Перейти в каталог</NuxtLink></div>
      <div v-else-if="!favoriteSyncError" class="sb-empty"><Heart :size="36" /><h2>Здесь пока пусто</h2><p>Нажимайте на сердечко в карточке товара, чтобы сохранить его.</p><NuxtLink to="/catalog" class="sb-primary">Перейти в каталог</NuxtLink></div>
    </template>
  </div></SiteShell>
</template>
