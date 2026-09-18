<script setup lang="ts">
const props=defineProps<{dashboard:any;profile:any}>();
const date=(value:string)=>new Date(value).toLocaleString('ru-RU',{timeZone:props.dashboard.timeZone||'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const money=(value:any)=>value===null?'Недоступно':new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(value||0));
</script>
<template>
  <section class="salon-overview">
    <SalonOrganizationCard :profile="profile" :format-price="money"/>
    <div class="business-overview-metrics"><article><span>Записи сегодня</span><strong>{{dashboard.bookingsToday||0}}</strong></article><article><span>Будущие записи</span><strong>{{dashboard.upcoming||0}}</strong></article><article><span>Клиенты салона</span><strong>{{dashboard.clients||0}}</strong></article><article><span>Выручка услуг за месяц</span><strong>{{money(dashboard.serviceRevenueMonth)}}</strong></article></div>
    <article class="salon-settings-panel"><header class="salon-overview-heading"><h2>Ближайшие записи</h2><NuxtLink to="/b2b?section=calendar">Открыть календарь</NuxtLink></header><div v-for="booking in dashboard.nextBookings" :key="booking.id" class="salon-overview-visit"><time>{{date(booking.startTime)}}</time><span><strong>{{booking.client.firstName}} {{booking.client.lastName}}</strong><small>{{booking.service.name}} · {{booking.service.duration}} мин.</small></span></div><p v-if="!dashboard.nextBookings?.length">Предстоящих записей пока нет.</p></article>
    <div class="business-purchases-actions"><NuxtLink to="/b2b?section=calendar">Календарь записи</NuxtLink><NuxtLink to="/b2b?section=clients">Клиенты салона</NuxtLink><NuxtLink to="/b2b?section=online-booking">Страница и виджет записи</NuxtLink></div>
  </section>
</template>
