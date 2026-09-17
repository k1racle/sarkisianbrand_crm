<script setup lang="ts">
import { Bot } from '@lucide/vue';

type Brand = {
  src: string;
  label: string;
  full?: boolean;
};

const props = defineProps<{ provider: string; size?: number }>();
const failed = ref(false);

const brands: Record<string, Brand> = {
  OZON: {
    src: 'https://www.google.com/s2/favicons?domain=ozon.ru&sz=128',
    label: 'OZON',
  },
  OZON_LOGISTICS: {
    src: 'https://www.google.com/s2/favicons?domain=ozon.ru&sz=128',
    label: 'OZON',
  },
  WILDBERRIES: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Wildberries_2023_Pink.svg',
    label: 'WB',
  },
  YANDEX_MARKET: {
    src: 'https://www.google.com/s2/favicons?domain=market.yandex.ru&sz=128',
    label: 'Я',
  },
  YANDEX_DELIVERY: {
    src: 'https://dostavka.yandex.ru/favicon.ico',
    label: 'Я',
  },
  CDEK: {
    src: 'https://static.tildacdn.com/tild3738-3931-4064-a232-376134356330/CDEK_logo.png',
    label: 'CDEK', full: true,
  },
  ONE_C: {
    src: 'https://1c.ru/fav.svg',
    label: '1C',
  },
  YOOKASSA: {
    src: 'https://static.yoomoney.ru/files-front/resources/head/checkout/favicon-32x32.png',
    label: 'ЮK',
  },
  CLOUDKASSIR: {
    src: 'https://static.tildacdn.com/tild3839-6335-4735-a537-393566323837/Favicon-1.png',
    label: 'CK',
  },
  SMS_AERO: {
    src: 'https://smsaero.ru/logos/icon.png',
    label: 'SMS',
  },
  TELEGRAM: {
    src: 'https://telegram.org/img/website_icon.svg?4',
    label: 'TG',
  },
  MAX: {
    src: 'https://max.ru/favicon.svg',
    label: 'MAX',
  },
  VK: {
    src: 'https://www.google.com/s2/favicons?domain=vk.com&sz=128',
    label: 'VK',
  },
};

const brand = computed(() => brands[props.provider]);
watch(() => props.provider, () => { failed.value = false; });
</script>

<template>
  <span data-v-ui-5a4be72ea064
    class="brand-logo"
    :class="{ 'brand-logo--full': brand?.full }"
    :data-provider="provider"
    :style="size ? { '--brand-logo-size': `${size}px` } : undefined"
    :title="brand?.label || provider"
  >
    <img data-v-ui-5a4be72ea064 v-if="brand && !failed" :src="brand.src" :alt="brand.label" referrerpolicy="no-referrer" @error="failed = true" />
    <strong data-v-ui-5a4be72ea064 v-else-if="brand" class="brand-logo-label">{{ brand.label }}</strong>
    <Bot data-v-ui-5a4be72ea064 v-else />
  </span>
</template>
