<script setup lang="ts">
import { ArrowLeft, ShoppingBag, Truck } from '@lucide/vue';
const route = useRoute();
const config = useRuntimeConfig();
const notice = ref('');
const { data: product, error } = await useFetch<any>(`/products/${route.params.slug}`, { baseURL: config.public.apiBase });

async function addToCart() {
  const variant = product.value?.variants?.[0];
  if (!variant) return;
  const session = useCookie('sb-cart-session', { default: () => `web-${Math.random().toString(36).slice(2)}` });
  await $fetch('/cart/items', { baseURL: config.public.apiBase, method: 'POST', headers: { 'x-cart-session': session.value }, body: { variantId: variant.id, quantity: 1 } });
  notice.value = 'Товар добавлен в корзину';
  setTimeout(() => { notice.value = ''; }, 2200);
}
</script>

<template>
  <div class="site"><header class="header"><NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><NuxtLink to="/" class="back-link"><ArrowLeft :size="17" /> Вернуться в каталог</NuxtLink></header><main v-if="product" class="product-page"><div class="product-page-visual"><div class="product-pack large"><i>{{ product.nameRu.slice(0, 1) }}</i></div></div><div class="product-page-info"><p class="kicker">{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN BRAND' }}</p><h1>{{ product.nameRu }}</h1><p class="sku">Артикул: {{ product.sku }}</p><p class="description">{{ product.descriptionRu || 'Профессиональный материал SARKISIAN для мастеров маникюра. Предсказуемый результат и комфортная работа.' }}</p><div class="product-page-price">{{ Number(product.basePrice).toLocaleString('ru-RU') }} ₽</div><button class="product-page-button" @click="addToCart"><ShoppingBag :size="19" /> Добавить в корзину</button><div class="delivery-note"><Truck :size="19" /><span>Быстрая доставка по России<br /><small>Рассчитаем стоимость при оформлении</small></span></div></div></main><p v-else-if="error" class="state error">Товар не найден</p><div v-if="notice" class="toast">{{ notice }}</div></div>
</template>
