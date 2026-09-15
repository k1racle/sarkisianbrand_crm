<script setup lang="ts">
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from '@lucide/vue';

const route = useRoute();
const search = ref(String(route.query.search || ''));
const mobileSearchOpen = ref(false);
const scrolled = ref(false);
const { user, cartCount, favoriteIds, loadCart, loadMe, syncFavorites } = useStorefront();
const { content, loadStorefrontContent } = useStorefrontContent();
const { catalogOpen, authOpen, cartOpen, favoritesOpen, closeAll, openCatalog, openAuth, openCart, openFavorites } = useStorefrontPanels();

function submitSearch() {
  navigateTo({ path: '/catalog', query: search.value.trim() ? { search: search.value.trim() } : {} });
  mobileSearchOpen.value = false;
}

function accountAction() {
  if (user.value) navigateTo('/account');
  else openAuth();
}

function onScroll() {
  scrolled.value = window.scrollY > 18;
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  loadStorefrontContent().catch(() => undefined);
  loadCart().catch(() => undefined);
  await loadMe().catch(() => undefined);
  await syncFavorites();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  document.documentElement.style.overflow = '';
});

watch([catalogOpen, authOpen, cartOpen, favoritesOpen], (values) => {
  if (import.meta.client) document.documentElement.style.overflow = values.some(Boolean) ? 'hidden' : '';
});

watch(() => route.query.search, (value) => { search.value = String(value || ''); });
watch(() => route.fullPath, () => { mobileSearchOpen.value = false; });
</script>

<template>
  <div class="sb-site-head" :class="{ 'is-scrolled': scrolled }">
    <div class="sb-announcement">
      <span>{{ content.settings.announcementText }}</span>
    </div>

    <div class="sb-header-wrap">
      <header class="sb-header sb-glass-surface">
        <button class="sb-mobile-menu" aria-label="Открыть каталог" @click="openCatalog"><Menu :size="21" /></button>
        <NuxtLink to="/" class="sb-logo" aria-label="SARKISIAN — на главную"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
        <button class="sb-catalog-button" @click="openCatalog"><Menu :size="17" /><span>Каталог</span></button>

        <form class="sb-search" :class="{ 'is-open': mobileSearchOpen }" @submit.prevent="submitSearch">
          <Search :size="18" />
          <input v-model="search" aria-label="Поиск по каталогу" placeholder="Поиск по каталогу" />
          <button type="submit">Найти</button>
          <button type="button" class="sb-search-close" aria-label="Закрыть поиск" @click="mobileSearchOpen = false"><X :size="18" /></button>
        </form>

        <nav class="sb-header-actions" aria-label="Покупки и аккаунт">
          <button class="sb-mobile-search" aria-label="Открыть поиск" @click="mobileSearchOpen = true"><Search :size="20" /></button>
          <button aria-label="Избранное" @click="openFavorites"><Heart :size="19" /><span>Избранное</span><b v-if="favoriteIds.length">{{ favoriteIds.length }}</b></button>
          <button aria-label="Личный кабинет" @click="accountAction"><UserRound :size="19" /><span>{{ user ? (user.firstName || 'Кабинет') : 'Войти' }}</span></button>
          <button aria-label="Корзина" @click="openCart"><ShoppingBag :size="19" /><span>Корзина</span><b v-if="cartCount">{{ cartCount }}</b></button>
        </nav>
      </header>

    </div>

    <SiteCatalogDrawer :open="catalogOpen" @close="closeAll" />
    <SiteAuthDrawer :open="authOpen" @close="closeAll" />
    <SiteCartDrawer :open="cartOpen" @close="closeAll" />
    <SiteFavoritesDrawer :open="favoritesOpen" @close="closeAll" />
  </div>
</template>
