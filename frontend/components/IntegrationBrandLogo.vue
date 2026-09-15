<script setup lang="ts">
import { Bot } from '@lucide/vue';

type Brand = {
  src: string;
  label: string;
  background: string;
  padding?: string;
  full?: boolean;
};

const props = defineProps<{ provider: string; size?: number }>();
const failed = ref(false);

const brands: Record<string, Brand> = {
  OZON: {
    src: 'https://www.google.com/s2/favicons?domain=ozon.ru&sz=128',
    label: 'OZON', background: '#005bff', padding: '7px',
  },
  OZON_LOGISTICS: {
    src: 'https://www.google.com/s2/favicons?domain=ozon.ru&sz=128',
    label: 'OZON', background: '#005bff', padding: '7px',
  },
  WILDBERRIES: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Wildberries_2023_Pink.svg',
    label: 'WB', background: '#fff', padding: '7px',
  },
  YANDEX_MARKET: {
    src: 'https://www.google.com/s2/favicons?domain=market.yandex.ru&sz=128',
    label: 'Я', background: '#ffdc00', padding: '7px',
  },
  YANDEX_DELIVERY: {
    src: 'https://dostavka.yandex.ru/favicon.ico',
    label: 'Я', background: '#ffdc00', padding: '7px',
  },
  CDEK: {
    src: 'https://static.tildacdn.com/tild3738-3931-4064-a232-376134356330/CDEK_logo.png',
    label: 'CDEK', background: '#fff', padding: '5px', full: true,
  },
  ONE_C: {
    src: 'https://1c.ru/fav.svg',
    label: '1C', background: '#ffec00', padding: '5px',
  },
  YOOKASSA: {
    src: 'https://static.yoomoney.ru/files-front/resources/head/checkout/favicon-32x32.png',
    label: 'ЮK', background: '#8b3ffd', padding: '6px',
  },
  CLOUDKASSIR: {
    src: 'https://static.tildacdn.com/tild3839-6335-4735-a537-393566323837/Favicon-1.png',
    label: 'CK', background: '#1484c6', padding: '6px',
  },
  SMS_AERO: {
    src: 'https://smsaero.ru/logos/icon.png',
    label: 'SMS', background: '#fff', padding: '5px',
  },
  TELEGRAM: {
    src: 'https://telegram.org/img/website_icon.svg?4',
    label: 'TG', background: '#229ed9', padding: '6px',
  },
  MAX: {
    src: 'https://max.ru/favicon.svg',
    label: 'MAX', background: '#fff', padding: '5px',
  },
  VK: {
    src: 'https://www.google.com/s2/favicons?domain=vk.com&sz=128',
    label: 'VK', background: '#0077ff', padding: '6px',
  },
};

const brand = computed(() => brands[props.provider]);
watch(() => props.provider, () => { failed.value = false; });
</script>

<template>
  <span
    class="brand-logo"
    :class="{ 'brand-logo--full': brand?.full }"
    :style="{ width: `${size || 38}px`, height: `${size || 38}px`, background: brand?.background || '#f3f3f4', padding: brand?.padding || '0' }"
    :title="brand?.label || provider"
  >
    <img v-if="brand && !failed" :src="brand.src" :alt="brand.label" referrerpolicy="no-referrer" @error="failed = true" />
    <strong v-else-if="brand">{{ brand.label }}</strong>
    <Bot v-else :size="Math.round((size || 38) * .52)" />
  </span>
</template>

<style scoped>
.brand-logo{box-sizing:border-box;display:grid;place-items:center;overflow:hidden;flex:none;color:#50535a;border:1px solid #e8e9eb}
.brand-logo img{display:block;width:100%;height:100%;object-fit:contain}
.brand-logo--full img{width:100%;height:auto;max-height:100%}
.brand-logo strong{font-size:8px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#fff;text-align:center}
.brand-logo[style*="rgb(255, 255, 255)"],.brand-logo[style*="#fff"]{color:#333}
.brand-logo[style*="rgb(255, 255, 255)"] strong,.brand-logo[style*="#fff"] strong{color:#333}
</style>
