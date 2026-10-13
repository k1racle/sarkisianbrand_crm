<script setup lang="ts">
defineProps<{ editorial?: boolean }>();
</script>

<template>
  <div class="sb-storefront" :class="{ 'sb-home': editorial }">
    <SiteHomeEffects v-if="editorial" />
    <SiteHeader :editorial="editorial" />
    <main><slot /></main>
    <SiteHomeFooter v-if="editorial" />
    <SiteFooter v-else />
  </div>
</template>
