<script setup lang="ts">
import { BarChart3, ClipboardList, Settings, Wifi } from '@lucide/vue';
const route = useRoute();
</script>
<template><aside data-v-ui-d35ff91f75cd class="marketplace-rail"><div data-v-ui-d35ff91f75cd class="rail-brand"><img data-v-ui-d35ff91f75cd src="/sarkisian-logo.png" alt="SARKISIAN" /></div><nav data-v-ui-d35ff91f75cd><NuxtLink data-v-ui-d35ff91f75cd to="/crm"><BarChart3 data-v-ui-d35ff91f75cd :size="18" /> Обзор</NuxtLink><NuxtLink data-v-ui-d35ff91f75cd to="/crm-marketplaces"><ClipboardList data-v-ui-d35ff91f75cd :size="18" /> Заказы каналов</NuxtLink><NuxtLink data-v-ui-d35ff91f75cd to="/crm-marketplaces#integrations"><Wifi data-v-ui-d35ff91f75cd :size="18" /> Интеграции</NuxtLink><NuxtLink data-v-ui-d35ff91f75cd to="/crm-marketplaces#settings"><Settings data-v-ui-d35ff91f75cd :size="18" /> Настройки</NuxtLink></nav></aside></template>

