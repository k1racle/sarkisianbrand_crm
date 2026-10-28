<script setup lang="ts">
import { ArrowRight, CalendarDays, Clock3, Globe, Scissors, Users } from '@lucide/vue';
const props = defineProps<{ dashboard: any; profile: any }>();
const canSeeFinance = computed(() => Boolean(props.profile.membership?.canSeeFinance));
const date = (value: string) => new Date(value).toLocaleString('ru-RU', { timeZone: props.dashboard.timeZone || 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const money = (value: any) => value === null ? 'Недоступно' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(Number(value || 0));
const duration = (booking: any) => booking.endTime ? Math.round((Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60000) : booking.service.duration;
const master = (booking: any) => [booking.masterMember?.user?.firstName, booking.masterMember?.user?.lastName].filter(Boolean).join(' ');
</script>

<template>
  <section class="salon-overview business-workspace-overview">
    <div class="business-overview-metrics" aria-label="Показатели салона">
      <article><span>Записи сегодня</span><strong>{{ dashboard.bookingsToday || 0 }}</strong><small>В расписании салона</small></article>
      <article><span>Будущие записи</span><strong>{{ dashboard.upcoming || 0 }}</strong><small>На следующие дни</small></article>
      <article><span>Клиенты салона</span><strong>{{ dashboard.clients || 0 }}</strong><small>В вашей клиентской базе</small></article>
      <article v-if="canSeeFinance"><span>Выручка за месяц</span><strong>{{ money(dashboard.serviceRevenueMonth) }}</strong><small>По завершённым визитам</small></article>
    </div>

    <div class="business-overview-columns">
      <article class="salon-settings-panel business-upcoming-panel">
        <header class="salon-overview-heading"><div><h2>Ближайшие записи</h2><p>Клиенты, которых ждёте в салоне</p></div><NuxtLink to="/b2b?section=calendar" class="business-section-link" aria-label="Открыть календарь"><span>Календарь</span><ArrowRight :size="16" /></NuxtLink></header>
        <ol v-if="dashboard.nextBookings?.length" class="business-upcoming-list">
          <li v-for="booking in dashboard.nextBookings" :key="booking.id" class="salon-overview-visit"><time :datetime="booking.startTime">{{ date(booking.startTime) }}</time><span><strong>{{ booking.client.firstName }} {{ booking.client.lastName }}</strong><small>{{ booking.service.name }}</small><small v-if="master(booking)">Мастер: {{ master(booking) }}</small></span><span class="business-visit-duration"><Clock3 :size="14" />{{ duration(booking) }} мин.</span></li>
        </ol>
        <div v-else class="business-dashboard-empty"><CalendarDays :size="30" /><h3>В расписании пока свободно</h3><p>Создайте запись в календаре или откройте онлайн-запись для клиентов.</p><NuxtLink to="/b2b?section=calendar">Открыть календарь<ArrowRight :size="16" /></NuxtLink></div>
      </article>

      <section class="business-overview-shortcuts" aria-label="Работа с салоном">
        <NuxtLink to="/b2b?section=online-booking" class="business-shortcut"><Globe :size="21" /><span><strong>Онлайн-запись</strong><small>Страница, виджет и доступные часы</small></span><ArrowRight :size="17" /></NuxtLink>
        <NuxtLink to="/b2b?section=clients" class="business-shortcut"><Users :size="21" /><span><strong>Ваши клиенты</strong><small>Контакты и история посещений</small></span><ArrowRight :size="17" /></NuxtLink>
        <NuxtLink to="/b2b?section=services" class="business-shortcut"><Scissors :size="21" /><span><strong>Услуги и цены</strong><small>Прайс, длительность и доступность</small></span><ArrowRight :size="17" /></NuxtLink>
      </section>
    </div>
    <SalonOrganizationCard :profile="profile" :format-price="money" />
  </section>
</template>
