<script setup lang="ts">
import { ArrowRight, RotateCcw } from '@lucide/vue';
const props = defineProps<{ error: { statusCode?: number } }>();
const missing = computed(() => props.error.statusCode === 404);
useHead({ title: () => `${missing.value ? 'Страница не найдена' : 'Временно недоступно'} — SARKISIAN BRAND`, meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
function home() { clearError({ redirect: '/' }); }
function retry() { window.location.reload(); }
</script>
<template><SiteShell><section class="sb-site-error"><span class="sb-kicker">{{ missing ? '404' : 'ВРЕМЕННО НЕДОСТУПНО' }}</span><h1>{{ missing ? 'Страница не найдена' : 'Не удалось загрузить страницу' }}</h1><p>{{ missing ? 'Возможно, ссылка изменилась или страница больше не опубликована. В каталоге можно найти нужные товары.' : 'Пожалуйста, попробуйте ещё раз через некоторое время. Если заказ уже оформлен, не создавайте его повторно — сначала проверьте статус.' }}</p><div><button v-if="!missing" class="sb-primary" @click="retry">Попробовать снова <RotateCcw :size="18" /></button><button class="sb-primary" @click="home">На главную <ArrowRight :size="18" /></button></div></section></SiteShell></template>
