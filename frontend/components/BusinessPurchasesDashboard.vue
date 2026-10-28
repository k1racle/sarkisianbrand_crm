<script setup lang="ts">
import { ArrowRight, CircleAlert, CircleHelp, PackageSearch, Settings, ShoppingBag } from '@lucide/vue';
const props = defineProps<{ profile: any; dashboard: any; orders: any[]; formatPrice: (value: any) => string; statusLabels: Record<string, string>; fulfillment: (item: any) => string }>();
const active = computed(() => props.orders.filter(order => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)));
const issues = computed(() => props.orders.filter(order => order.needsAttention));
const canSeeFinance = computed(() => Boolean(props.profile.membership?.canSeeFinance));
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
</script>

<template>
  <section class="business-purchases-overview business-workspace-overview">
    <div class="business-overview-metrics" aria-label="Показатели закупок">
      <article><span>Заказы за месяц</span><strong>{{ dashboard.purchaseOrdersMonth || 0 }}</strong><small>Оформлены вашей компанией</small></article>
      <article v-if="canSeeFinance"><span>Сумма закупок за месяц</span><strong>{{ formatPrice(dashboard.purchasesMonth) }}</strong><small>По заказам за текущий месяц</small></article>
      <article><span>Заказы в работе</span><strong>{{ active.length }}</strong><small>Из загруженных заказов</small></article>
      <article><span>Требуют проверки</span><strong>{{ issues.length }}</strong><small>Ошибки передачи заказа</small></article>
    </div>

    <div v-if="issues.length" class="business-overview-notice" role="status"><CircleAlert :size="20" /><div><strong>Есть заказы с ошибкой передачи</strong><p>Откройте список заказов и свяжитесь с поддержкой для проверки статуса.</p></div><NuxtLink to="/b2b?section=orders">К заказам<ArrowRight :size="16" /></NuxtLink></div>

    <div class="business-purchases-columns">
      <section class="salon-settings-panel business-recent-orders">
        <header class="salon-overview-heading"><div><h2>Последние заказы</h2><p>Состав, сумма и текущее состояние закупок</p></div><NuxtLink to="/b2b?section=orders" class="business-section-link" aria-label="Все заказы"><span>Все заказы</span><ArrowRight :size="16" /></NuxtLink></header>
        <NuxtLink v-for="item in orders.slice(0, 5)" :key="item.id" to="/b2b?section=orders" class="business-dashboard-order"><span class="business-order-mark" aria-hidden="true"><ShoppingBag :size="19" /></span><div><strong>{{ item.orderNumber }}</strong><small>{{ date(item.createdAt) }} · {{ statusLabels[item.status] || item.status }}</small><small :class="{ 'sync-error': item.warehouseStatus?.isCurrent && item.warehouseStatus?.stage === 'NEEDS_ATTENTION' }">{{ fulfillment(item) }}</small></div><strong v-if="canSeeFinance">{{ formatPrice(item.finalAmount) }}</strong><ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
        <div v-if="!orders.length" class="business-dashboard-empty"><ShoppingBag :size="30" /><h3>Начните первую закупку</h3><p>Подберите товары по персональным ценам. История и статусы заказов появятся здесь.</p><NuxtLink to="/b2b?section=catalog">Открыть каталог<ArrowRight :size="16" /></NuxtLink></div>
      </section>

      <section class="business-overview-shortcuts" aria-label="Действия с закупками">
        <NuxtLink to="/b2b?section=catalog" class="business-shortcut business-shortcut--primary"><PackageSearch :size="22" /><span><strong>Подобрать товары</strong><small>Каталог с персональными ценами</small></span><ArrowRight :size="18" /></NuxtLink>
        <NuxtLink to="/b2b?section=support&area=purchases" class="business-shortcut"><CircleHelp :size="21" /><span><strong>Помощь с закупкой</strong><small>Вопросы по товарам и заказам</small></span><ArrowRight :size="17" /></NuxtLink>
        <NuxtLink to="/b2b?section=settings&area=purchases" class="business-shortcut"><Settings :size="21" /><span><strong>Данные компании</strong><small>Реквизиты и контактные данные</small></span><ArrowRight :size="17" /></NuxtLink>
      </section>
    </div>
    <SalonOrganizationCard :profile="profile" :format-price="formatPrice" />
  </section>
</template>
