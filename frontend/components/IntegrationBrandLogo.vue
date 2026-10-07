<script setup lang="ts">
import { Bot } from '@lucide/vue';

type Brand = {
  src: string;
  label: string;
  full?: boolean;
};

const props = defineProps<{ provider: string; size?: number }>();
const failed = ref(false);
// Employee pages must not contact favicon/CDN services while showing private data.

const brands: Record<string, Brand> = {
  OZON: {
    src: '/crm/brands/ozon.svg',
    label: 'OZON',
  },
  OZON_LOGISTICS: {
    src: '/crm/brands/ozon_logistics.svg',
    label: 'OZON',
  },
  WILDBERRIES: {
    src: '/crm/brands/wildberries.svg',
    label: 'WB',
  },
  YANDEX_MARKET: {
    src: '/crm/brands/yandex_market.svg',
    label: 'Я',
  },
  YANDEX_DELIVERY: {
    src: '/crm/brands/yandex_delivery.svg',
    label: 'Я',
  },
  CDEK: {
    src: '/crm/brands/cdek.svg',
    label: 'CDEK', full: true,
  },
  ONE_C: {
    src: '/crm/brands/one_c.svg',
    label: '1C',
  },
  YOOKASSA: {
    src: '/crm/brands/yookassa.svg',
    label: 'ЮK',
  },
  CLOUDKASSIR: {
    src: '/crm/brands/cloudkassir.png',
    label: 'CK',
  },
  SMS_AERO: {
    src: '/crm/brands/sms_aero.svg',
    label: 'SMS',
  },
  TELEGRAM: {
    src: '/crm/brands/telegram.svg',
    label: 'TG',
  },
  MAX: {
    src: '/crm/brands/max.svg',
    label: 'MAX',
  },
  VK: {
    src: '/crm/brands/vk.svg',
    label: 'VK',
  },
  VK_ID: {
    src: '/storefront/icons/vk-id.svg',
    label: 'VK ID',
  },
  YANDEX_ID: {
    src: '/storefront/icons/yandex-id.svg',
    label: 'Яндекс ID',
  },
};

const brand = computed(() => brands[props.provider]);
watch(() => brand.value?.src, () => { failed.value = false; });
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
