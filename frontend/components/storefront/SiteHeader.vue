<script setup lang="ts">
import { Grid2X2, Heart, Menu, ShoppingBag, UserRound } from '@lucide/vue';

const route = useRoute();
const scrolled = ref(false);
let scrollFrame: number | undefined;
const { user, cartCount, favoriteIds, loadCart, loadMe, syncFavorites, bindCart } = useStorefront();
const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const { catalogOpen, authOpen, cartOpen, favoritesOpen, menuOpen, closeAll, openCatalog, openAuth, openCart, openFavorites, openMenu } = useStorefrontPanels();
const panelOpen = computed(() => catalogOpen.value || authOpen.value || cartOpen.value || favoritesOpen.value || menuOpen.value);
let previousOverflow = '';
let scrollLocked = false;
let returnFocus: HTMLElement | null = null;

function afterPanelLeave() {
  if (panelOpen.value || !scrollLocked) return;
  document.documentElement.style.overflow = previousOverflow;
  scrollLocked = false;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && panelOpen.value) closeAll();
  if (event.key !== 'Tab' || !panelOpen.value) return;
  const drawer = activeDrawer();
  const controls = [...(drawer?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || [])].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && (document.activeElement === first || !drawer?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !drawer?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
}

function activeDrawer() {
  const name = catalogOpen.value ? 'catalog' : authOpen.value ? 'auth' : cartOpen.value ? 'cart' : favoritesOpen.value ? 'favorites' : 'menu';
  return document.querySelector<HTMLElement>(`.sb-${name}-drawer`);
}
watch([catalogOpen, authOpen, cartOpen, favoritesOpen, menuOpen], async () => {
  if (!import.meta.client || !panelOpen.value) return;
  await nextTick();
  const drawer = activeDrawer();
  drawer?.setAttribute('role', 'dialog'); drawer?.setAttribute('aria-modal', 'true');
  drawer?.querySelector<HTMLButtonElement>('button[aria-label="Закрыть"]')?.focus({ preventScroll: true });
});

function accountAction() {
  closeAll();
  if (user.value) navigateTo('/account');
  else openAuth();
}

function onScroll() {
  if (scrollFrame !== undefined) return;
  scrollFrame = window.requestAnimationFrame(() => {
    const scrollTop = window.scrollY;
    if (!scrolled.value && scrollTop > 56) scrolled.value = true;
    else if (scrolled.value && scrollTop < 4) scrolled.value = false;
    scrollFrame = undefined;
  });
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKeydown);
  onScroll();
  loadStorefrontContent().catch(() => undefined);
  await loadMe().catch(() => undefined);
  if (user.value) await bindCart().catch(() => undefined);
  await loadCart().catch(() => undefined);
  await syncFavorites();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('keydown', onKeydown);
  if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
  if (scrollLocked) document.documentElement.style.overflow = previousOverflow;
});

watch(panelOpen, (open) => {
  if (!import.meta.client || !open || scrollLocked) return;
  previousOverflow = document.documentElement.style.overflow;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.documentElement.style.overflow = 'hidden';
  scrollLocked = true;
});

watch(() => route.fullPath, closeAll);
</script>

<template>
  <div class="sb-site-head" :class="{ 'is-scrolled': scrolled }">
    <div class="sb-announcement">
      <span>{{ content.settings.announcementText }}</span>
    </div>

    <div class="sb-header-wrap">
      <header class="sb-header sb-glass-surface">
        <NuxtLink to="/" class="sb-logo" :aria-label="`${siteContent.brand.name} — на главную`"><img :src="storefrontMediaUrl(siteContent.brand.logoUrl)" :alt="siteContent.brand.name" /></NuxtLink>
        <button class="sb-catalog-button" @click="openCatalog"><Menu :size="17" /><span>Каталог</span></button>

        <nav class="sb-page-menu" aria-label="Страницы сайта">
          <SiteMenuLink v-for="item in content.menuItems" :key="item.id" :item="item" />
        </nav>

        <nav class="sb-header-actions" aria-label="Покупки и аккаунт">
          <button aria-label="Избранное" @click="openFavorites"><Heart :size="19" /><span>Избранное</span><b v-if="favoriteIds.length">{{ favoriteIds.length }}</b></button>
          <button aria-label="Личный кабинет" @click="accountAction"><UserRound :size="19" /><span>{{ user ? (user.firstName || 'Кабинет') : 'Войти' }}</span></button>
          <button aria-label="Корзина" @click="openCart"><ShoppingBag :size="19" /><span>Корзина</span><b v-if="cartCount">{{ cartCount }}</b></button>
        </nav>
      </header>

    </div>

    <SiteCatalogDrawer :open="catalogOpen" @close="closeAll" @after-leave="afterPanelLeave" />
    <SiteAuthDrawer :open="authOpen" @close="closeAll" @after-leave="afterPanelLeave" />
    <SiteCartDrawer :open="cartOpen" @close="closeAll" @after-leave="afterPanelLeave" />
    <SiteFavoritesDrawer :open="favoritesOpen" @close="closeAll" @after-leave="afterPanelLeave" />
    <SiteMenuDrawer :open="menuOpen" @close="closeAll" @after-leave="afterPanelLeave" />
  </div>

  <nav class="sb-mobile-nav sb-glass-surface" aria-label="Основная навигация">
    <button aria-label="Каталог" :aria-expanded="catalogOpen" :class="{ active: catalogOpen || (!panelOpen && route.path === '/catalog') }" @click="openCatalog"><Grid2X2 :size="23" /></button>
    <button aria-label="Личный кабинет" :aria-expanded="authOpen" :class="{ active: authOpen || (!panelOpen && route.path === '/account') }" @click="accountAction"><UserRound :size="23" /></button>
    <button aria-label="Избранное" :aria-expanded="favoritesOpen" :class="{ active: favoritesOpen }" @click="openFavorites"><Heart :size="23" /><b v-if="favoriteIds.length">{{ favoriteIds.length > 99 ? '99+' : favoriteIds.length }}</b></button>
    <button aria-label="Корзина" :aria-expanded="cartOpen" :class="{ active: cartOpen || (!panelOpen && route.path === '/cart') }" @click="openCart"><ShoppingBag :size="23" /><b v-if="cartCount">{{ cartCount > 99 ? '99+' : cartCount }}</b></button>
    <button class="sb-mobile-nav__menu" aria-label="Меню" :aria-expanded="menuOpen" :class="{ active: menuOpen }" @click="openMenu"><Menu :size="23" /></button>
  </nav>
</template>
