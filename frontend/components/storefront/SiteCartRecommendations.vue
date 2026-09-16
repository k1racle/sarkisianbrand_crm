<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue';
const config = useRuntimeConfig();
const { cart } = useStorefront();
const items = ref<any[]>([]);
const loading = ref(false);
const failed = ref(false);
const track = ref<HTMLElement>();
const atStart = ref(true);
const atEnd = ref(false);
const excluded = computed(() => [...new Set<string>((cart.value?.items || []).map((item: any) => item.variant.product.id))].sort().join(','));
let request = 0;
function updateEdges() {
  if (!track.value) return;
  atStart.value = track.value.scrollLeft < 2;
  atEnd.value = track.value.scrollLeft + track.value.clientWidth >= track.value.scrollWidth - 2;
}
function slide(direction: number) {
  track.value?.scrollBy({ left: direction * track.value.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
async function load() {
  const current = ++request;
  loading.value = true; failed.value = false;
  try {
    const result = await $fetch<{ items: any[] }>('/products/recommendations/cart', { baseURL: config.public.apiBase, query: { exclude: excluded.value } });
    if (current === request) items.value = result.items.slice(0, 8);
  } catch { if (current === request) { items.value = []; failed.value = true; } }
  finally { if (current === request) { loading.value = false; await nextTick(); updateEdges(); } }
}
let observer: ResizeObserver | undefined;
watch(excluded, load);
watch(track, element => {
  observer?.disconnect();
  if (element) { observer = new ResizeObserver(updateEdges); observer.observe(element); updateEdges(); }
});
onMounted(load);
onBeforeUnmount(() => { request++; observer?.disconnect(); });
</script>

<template>
  <section v-if="loading || failed || items.length" class="sb-cart-recommendations" aria-label="Вам может понравиться" :aria-busy="loading">
    <header><h2>Вам может понравиться</h2><div v-if="items.length" class="sb-carousel-controls"><button type="button" aria-label="Предыдущие товары" :disabled="atStart" @click="slide(-1)"><ArrowLeft :size="18" /></button><button type="button" aria-label="Следующие товары" :disabled="atEnd" @click="slide(1)"><ArrowRight :size="18" /></button></div></header>
    <p v-if="failed" class="sb-cart-recommendations-note">Не удалось загрузить рекомендации. <button type="button" class="sb-checkout-text" @click="load">Повторить</button></p>
    <p v-else-if="loading && !items.length" class="sb-cart-recommendations-note" role="status">Подбираем товары…</p>
    <div v-if="items.length" ref="track" class="sb-cart-recommendations-track" role="region" aria-label="Рекомендованные товары" tabindex="0" @scroll.passive="updateEdges"><ProductCard v-for="item in items" :key="item.id" :product="item" /></div>
  </section>
</template>
