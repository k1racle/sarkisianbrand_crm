<script setup lang="ts">
import { catalogProductPath } from '~/shared/catalog-paths';
definePageMeta({ path: '/catalog/:segments(.*)*', key: route => route.path });
const route = useRoute();
const config = useRuntimeConfig();
let segments: string[];
try { segments = route.path.slice('/catalog/'.length).replace(/\/+$/, '').split('/').map(segment => decodeURIComponent(segment)); }
catch { throw createError({ statusCode: 404, statusMessage: 'Страница каталога не найдена' }); }
if (segments.length < 1 || segments.length > 2 || segments.some(segment => !segment || /[\/\\?#\s]/.test(segment))) throw createError({ statusCode: 404, statusMessage: 'Страница каталога не найдена' });
const { data: categories, error: categoryError } = await useFetch<any[]>('/products/categories', { baseURL: config.public.apiBase });
if (categoryError.value) throw createError({ statusCode: 503, statusMessage: 'Не удалось загрузить каталог' });
const category = categories.value?.find(item => item.slug === segments[0]);
const isCategory = segments.length === 1 && Boolean(category);
const product = ref<any>(null);
if (!isCategory) {
  if (segments.length === 2 && !category) throw createError({ statusCode: 404, statusMessage: 'Категория не найдена' });
  const { data, error } = await useFetch<any>(`/products/${encodeURIComponent(segments.at(-1)!)}`, { baseURL: config.public.apiBase });
  if (error.value || !data.value) throw createError({ statusCode: error.value?.statusCode === 404 || !error.value && !data.value ? 404 : 503, statusMessage: error.value?.statusCode === 404 ? 'Товар не найден' : 'Не удалось загрузить товар' });
  if (segments.length === 2 && !data.value.categories?.some((item: any) => item.category?.slug === category.slug)) throw createError({ statusCode: 404, statusMessage: 'Товар не найден в этой категории' });
  const canonical = catalogProductPath(data.value);
  if (route.path.replace(/\/+$/, '') !== canonical) await navigateTo(canonical, { replace: true });
  product.value = data.value;
}
</script>
<template><SiteCatalogPage v-if="isCategory" :category-slug="category.slug"/><SiteProductPage v-else-if="product" :product="product"/></template>
