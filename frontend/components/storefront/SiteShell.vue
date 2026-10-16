<script setup lang="ts">
defineProps<{ editorial?: boolean; about?: boolean; account?: boolean; catalog?: boolean; product?: boolean }>();
</script>

<template>
  <div class="sb-storefront" :class="{ 'sb-home': editorial, 'sb-about': about, 'sb-account-editorial': account, 'sb-catalog-editorial': catalog, 'sb-product-editorial': product }">
    <SiteHomeEffects v-if="editorial" :about="about || catalog || product" />
    <SiteHeader :editorial="editorial" />
    <main><slot /></main>
    <SiteHomeFooter v-if="editorial" />
    <SiteFooter v-else />
    <SiteFloatingActions />
  </div>
</template>
