<script setup lang="ts">
import { ArrowRight, Check, Mail, Package, Phone, Truck } from '@lucide/vue';
defineProps<{ kind: 'contacts' | 'delivery'; phone?: string; email?: string }>();
</script>
<template>
  <div class="sb-page-art" :class="'sb-page-art--' + kind" :aria-hidden="kind === 'contacts' ? 'true' : undefined">
    <template v-if="kind === 'contacts'"><div class="sb-page-art__sheet"><img src="/sarkisian-logo.png" alt="" /><div><Phone :size="22" /><span>{{ phone || 'SARKISIAN' }}</span></div><div><Mail :size="22" /><span>{{ email || 'На связи с мастерами' }}</span></div></div><div class="sb-page-art__seal"><ArrowRight :size="30" /></div></template>
    <div v-else class="sb-delivery-flow"><p>ВАШ ЗАКАЗ В ПУТИ</p><h2>От выбора до получения</h2><div class="sb-page-art__route" role="img" aria-label="Этапы заказа: заказ, доставка, получение"><span class="sb-delivery-step sb-delivery-step--order"><span class="sb-delivery-step__icon"><Check :size="24" /></span><strong>Заказ</strong></span><i class="sb-delivery-line sb-delivery-line--first"></i><span class="sb-delivery-step sb-delivery-step--transit"><span class="sb-delivery-step__icon"><Truck :size="25" /></span><strong>Доставка</strong></span><i class="sb-delivery-line sb-delivery-line--second"></i><span class="sb-delivery-step sb-delivery-step--received"><span class="sb-delivery-step__icon"><Package :size="25" /></span><strong>Получение</strong></span></div><span class="sb-delivery-flow__note">Три понятных этапа вашего заказа</span></div>
  </div>
</template>
