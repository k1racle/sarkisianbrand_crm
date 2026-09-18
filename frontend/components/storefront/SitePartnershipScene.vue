<script setup lang="ts">
import { ArrowRight, Building2, CalendarDays, Check, ChartNoAxesCombined, Link, Package, ShoppingBag, Users } from '@lucide/vue';
defineProps<{ kind: 'purchases' | 'salon' | 'creators' | 'business-reward'; products?: any[] }>();
</script>

<template>
  <div class="sb-partnership-scene" :class="'sb-partnership-scene--' + kind" aria-hidden="true">
    <template v-if="kind === 'purchases'">
      <div class="sb-partnership-product-stage"><div v-for="product in (products || []).slice(0, 3)" :key="product.id" class="sb-partnership-product-shot"><img :src="storefrontProductImage(product)" alt="" loading="lazy" decoding="async" /></div><ShoppingBag v-if="!products?.length" :size="96" /></div>
      <div class="sb-partnership-scene__floating"><Package :size="22" /><span>Заказ <ArrowRight :size="12" /> Склад <ArrowRight :size="12" /> Доставка</span></div>
    </template>
    <template v-else-if="kind === 'salon'">
      <div class="sb-partnership-calendar"><div class="sb-partnership-calendar__head"><CalendarDays :size="22" /><strong>Мой салон</strong><span>Неделя</span></div><div class="sb-partnership-calendar__days"><span v-for="day in ['Пн','Вт','Ср','Чт','Пт']" :key="day">{{ day }}</span></div><div class="sb-partnership-calendar__grid"><i v-for="cell in 20" :key="cell"></i><div class="sb-partnership-calendar__appointment"><span>Запись</span><b>09:00 — 10:30</b></div><div class="sb-partnership-calendar__break">Перерыв</div><div class="sb-partnership-calendar__second"><span>Запись</span><b>11:00 — 12:00</b></div></div></div>
      <div class="sb-partnership-scene__floating"><Users :size="22" /><span>Команда · Клиенты · Онлайн-запись</span></div>
    </template>
    <template v-else-if="kind === 'creators'">
      <div class="sb-partnership-link-card"><Link :size="32" /><span>SARKISIAN / ПАРТНЁР</span><div>sarkisianbrand.ru/r/•••••• <ArrowRight :size="18" /></div><div class="sb-partnership-link-card__flow"><span>Ваш контент</span><ArrowRight :size="16" /><span>Ваша ссылка</span></div></div>
      <div class="sb-partnership-scene__floating"><ChartNoAxesCombined :size="22" /><span>Переходы · Заказы · Начисления</span></div>
    </template>
    <template v-else>
      <div class="sb-partnership-business-card"><Building2 :size="42" /><strong>SARKISIAN<br />для бизнеса</strong><div><span><Check :size="15" /> Регистрация</span><span><Check :size="15" /> Проверка</span><span><Check :size="15" /> Активация</span></div></div>
      <div class="sb-partnership-scene__floating"><Users :size="22" /><span>Новый салон. Новые возможности.</span></div>
    </template>
  </div>
</template>
