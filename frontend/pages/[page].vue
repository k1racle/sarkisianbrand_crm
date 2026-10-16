<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const { data: page, error } = await useFetch<any>(`/products/storefront-pages/${encodeURIComponent(String(route.params.page))}`, { baseURL: config.public.apiBase });
if (error.value) throw createError({ statusCode: error.value.statusCode || 503, statusMessage: error.value.statusCode === 404 ? 'Страница не найдена' : 'Не удалось загрузить страницу' });
useStorefrontSeo({ title: () => page.value?.slug === 'business' ? 'CRM салона и онлайн-запись — SARKISIAN' : `${page.value?.title || 'Страница'} — SARKISIAN BRAND`, description: () => page.value?.slug === 'business' ? 'CRM для салонов: расписание, клиентская база, своя страница записи и виджет. Заказывайте товары SARKISIAN по персональным ценам компании.' : page.value?.seoDescription || page.value?.lead, reviewRequired: () => Boolean(page.value?.reviewRequired) });
</script>

<template>
  <SiteShell :editorial="page?.slug === 'about' || page?.slug === 'business' || page?.slug === 'partnerships'" :about="page?.slug === 'about'"><SiteContentPage v-if="page" :page="page" /></SiteShell>
</template>
