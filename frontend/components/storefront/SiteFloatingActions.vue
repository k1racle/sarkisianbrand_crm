<script setup lang="ts">
const { user } = useStorefront();
const { openAuth, openCart } = useStorefrontPanels();
const { t } = useHomeLocale();
const accountAction = () => user.value ? navigateTo('/account') : openAuth();
</script>

<template>
  <nav class="sh-dock sh-icon-actions" :aria-label="t('Быстрый доступ')">
    <button type="button" :aria-label="t('Личный кабинет')" :title="t('Личный кабинет')" @click="accountAction"><img src="/storefront/home/account.svg" alt="" /></button>
    <button type="button" :aria-label="t('Корзина')" :title="t('Корзина')" @click="openCart"><img src="/storefront/home/cart.svg" alt="" /><SiteCartBadge /></button>
  </nav>
</template>
