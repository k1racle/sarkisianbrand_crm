<script setup lang="ts">
import { Menu, X } from '@lucide/vue';
defineEmits<{ account: []; cart: [] }>();
const { t } = useHomeLocale();
const menuOpen = ref(false);
const route = useRoute();
watch(() => route.fullPath, () => { menuOpen.value = false; });
</script>

<template>
  <header class="sh-navigation sh-container" @keydown.esc="menuOpen = false">
    <NuxtLink to="/" class="sh-mobile-brand" aria-label="SARKISIAN">SARKISIAN</NuxtLink>
    <button class="sh-menu-toggle" :aria-expanded="menuOpen" aria-controls="home-navigation" :aria-label="t(menuOpen ? 'Закрыть меню' : 'Открыть меню')" @click="menuOpen = !menuOpen"><X v-if="menuOpen" :size="24" /><Menu v-else :size="24" /></button>
    <nav id="home-navigation" class="sh-navigation-links" :class="{ 'is-open': menuOpen }" aria-label="SARKISIAN">
      <div class="sh-navigation-pair"><NuxtLink to="/partnerships">{{ t('Сотрудничество') }}</NuxtLink><NuxtLink to="/about" @click="menuOpen = false">{{ t('О бренде') }}</NuxtLink></div>
      <NuxtLink to="/catalog">{{ t('Каталог') }}</NuxtLink>
      <NuxtLink to="/business">{{ t('Онлайн') }}<br />{{ t('запись') }}</NuxtLink>
      <SiteHomeCourses />
      <NuxtLink to="/club/referrals">{{ t('Реферальная') }}<br />{{ t('программа') }}</NuxtLink>
      <button class="sh-navigation-cart" @click="$emit('cart')">{{ t('Корзина') }}</button>
      <button @click="$emit('account')"><span>{{ t('Личный') }}<br />{{ t('кабинет') }}</span></button>
    </nav>
    <SiteHomeRegion />
  </header>
</template>
