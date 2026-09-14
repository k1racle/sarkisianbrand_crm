<script setup lang="ts">
import { ArrowRight, Heart, Menu, Search, ShoppingBag, UserRound } from '@lucide/vue';
const config = useRuntimeConfig();
const search = ref('');
const cartCount = ref(0);
const notice = ref('');
const categories = ['Бестселлеры', 'Новинки', 'Базы и праймеры', 'Гель', 'Гель-лак', 'Обезжириватель', 'Инструменты', 'Косметика уходовая', 'Топы для ногтей', 'Фрезы'];

const { data, pending, error } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: computed(() => ({ search: search.value || undefined })), watch: [search] });
const products = computed(() => data.value?.items || []);

async function addToCart(product: any) {
  const variant = product.variants?.[0];
  if (!variant) return;
  const session = useCookie('sb-cart-session', { default: () => crypto.randomUUID() });
  await $fetch('/cart/items', { baseURL: config.public.apiBase, method: 'POST', headers: { 'x-cart-session': session.value }, body: { variantId: variant.id, quantity: 1 } });
  cartCount.value += 1;
  notice.value = 'Товар добавлен в корзину';
  setTimeout(() => { notice.value = ''; }, 2200);
}
</script>

<template>
  <div class="site">
    <div class="announcement"><b>SARKISIAN BRAND</b><span> — это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян</span></div>
    <header class="header">
      <button class="mobile-menu" aria-label="Меню"><Menu :size="22" /></button>
      <NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
      <button class="catalog-button"><Menu :size="18" /> Каталог</button>
      <div class="header-search"><Search :size="19" /><input v-model="search" placeholder="Найти товары" /><button>Поиск</button></div>
      <nav class="actions"><button><Heart :size="18" /> <span>Избранное</span></button><button><UserRound :size="18" /> <span>Войти</span></button><NuxtLink to="/cart" class="cart"><ShoppingBag :size="18" /> <span>Корзина</span><b>{{ cartCount }}</b></NuxtLink></nav>
    </header>

    <nav class="category-bar"><a v-for="category in categories" :key="category" href="#catalog">{{ category }}</a></nav>

    <main>
      <section class="promo"><div class="promo-copy"><p>ПРОФЕССИОНАЛЬНЫЕ МАТЕРИАЛЫ ДЛЯ МАНИКЮРА</p><h1>От мастера —<br /><strong>мастерам</strong></h1><a href="#catalog">Перейти в каталог <ArrowRight :size="18" /></a></div><div class="promo-shape"><span>SARKISIAN</span><small>PROFESSIONAL</small></div></section>

      <section id="catalog" class="catalog"><div class="section-title"><h2>Бестселлеры</h2><a href="#catalog">Смотреть все&nbsp; →</a></div>
        <p v-if="pending" class="state">Загрузка каталога…</p><p v-else-if="error" class="state error">Backend API недоступен. Откройте backend на порту 3000.</p>
        <div v-else class="product-grid"><article v-for="product in products" :key="product.id" class="product-card"><NuxtLink :to="`/products/${product.slug}`" class="product-visual"><span class="badge">Акция</span><div class="product-pack"><i>{{ product.nameRu.slice(0, 1) }}</i></div><button class="quick-add" @click.prevent="addToCart(product)">В корзину <ShoppingBag :size="16" /></button></NuxtLink><div class="product-meta"><p>{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN' }}</p><h3><NuxtLink :to="`/products/${product.slug}`">{{ product.nameRu }}</NuxtLink></h3><div><b>{{ Number(product.basePrice).toLocaleString('ru-RU') }} ₽</b><del v-if="product.basePrice">{{ (Number(product.basePrice) * 1.1).toLocaleString('ru-RU') }} ₽</del></div></div></article></div>
      </section>

      <section class="brand-note"><div><p class="kicker">SARKISIAN BRAND</p><h2>Мы не просто продаём.<br /><em>Мы создаём материалы.</em></h2></div><p>Быстрая доставка, бонусы, скидки и акции — всё для мастеров, которые выбирают качество и предсказуемый результат.</p></section>
    </main>
    <div v-if="notice" class="toast">{{ notice }}</div>
    <footer><NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><span>Оплата</span><span>Доставка</span><span>Правила возврата</span><span>info@sarkisianbrand.ru</span></footer>
  </div>
</template>
