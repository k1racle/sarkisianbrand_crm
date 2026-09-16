<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const { data: page, error } = await useFetch<any>(`/products/storefront-pages/${encodeURIComponent(String(route.params.page))}`, { baseURL: config.public.apiBase });
if (error.value) throw createError({ statusCode: error.value.statusCode || 503, statusMessage: error.value.statusCode === 404 ? 'Страница не найдена' : 'Не удалось загрузить страницу' });
useStorefrontSeo({ title: () => `${page.value?.title || 'Страница'} — SARKISIAN BRAND`, description: () => page.value?.seoDescription || page.value?.lead, reviewRequired: () => Boolean(page.value?.reviewRequired) });
</script>

<template>
  <SiteShell><SiteContentPage v-if="page" :page="page" /></SiteShell>
</template>
