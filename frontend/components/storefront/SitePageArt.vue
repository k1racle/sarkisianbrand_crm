<script setup lang="ts">
import { ArrowRight, Check, Mail, Package, Phone, Truck } from '@lucide/vue';
defineProps<{ kind: 'contacts' | 'delivery'; phone?: string; email?: string }>();
</script>
<template>
  <div class="sb-page-art" :class="'sb-page-art--' + kind" aria-hidden="true">
    <template v-if="kind === 'contacts'"><div class="sb-page-art__sheet"><img src="/sarkisian-logo.png" alt="" /><div><Phone :size="22" /><span>{{ phone || 'SARKISIAN' }}</span></div><div><Mail :size="22" /><span>{{ email || 'На связи с мастерами' }}</span></div></div><div class="sb-page-art__seal"><ArrowRight :size="30" /></div></template>
    <template v-else><div class="sb-page-art__parcel"><Package :size="80" /><span>SARKISIAN</span><i></i><i></i></div><div class="sb-page-art__route"><span><Check :size="16" /> Заказ</span><i></i><span><Truck :size="18" /> Доставка</span><i></i><span><Package :size="18" /> Получение</span></div></template>
  </div>
</template>
