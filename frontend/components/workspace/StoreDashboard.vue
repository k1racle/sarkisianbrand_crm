<script setup lang="ts">
import { ArrowRight, ShoppingBag, Wallet, TrendingUp, Package, Image, FolderTree, AlertCircle, Boxes, Check } from '@lucide/vue';
const props = defineProps<{ data: any; busy?: boolean }>();
const { leaves } = useWorkspaceNavigation();
const allowed = (section: string) => leaves.value.some(item => item.to === `/admin-workspace/${section}`);
const money = (value: unknown) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' });
const queue = [ { status: 'NEW', label: 'Новые', icon: ShoppingBag }, { status: 'CONFIRMED', label: 'Подтверждены', icon: Check }, { status: 'ASSEMBLING', label: 'В сборке', icon: Package }, { status: 'PAYMENT_WAITING', label: 'Ожидают оплаты', icon: Wallet }, { status: 'PAID', label: 'Оплачены, не в сборке', icon: Wallet }, { status: 'SHIPPED', label: 'Отправлены', icon: Package } ];
const statuses: Record<string,string> = { NEW:'Новый', CONFIRMED:'Подтверждён', PAYMENT_WAITING:'Ожидает оплаты', PAID:'Оплачен', ASSEMBLING:'В сборке', SHIPPED:'Отправлен', DELIVERED:'Доставлен', CANCELLED:'Отменён', REFUNDED:'Возврат' };
const payments: Record<string,string> = { PAID:'Оплачен', SUCCEEDED:'Оплачен', PENDING:'Не оплачен', FAILED:'Ошибка оплаты', REFUNDED:'Возврат', PARTIALLY_REFUNDED:'Частичный возврат' };
const trend = computed(()=>props.data.trend || []);
const maxRevenue = computed(()=>Math.max(1,...trend.value.map((item:any)=>Number(item.revenue))));
const sales = computed(()=>props.data.sales || { revenue:0, orders:0, paidOrders:0, averageOrder:0 });
const issues = computed(()=>props.data.issues || {});
const attention = computed(()=>[
  { label:'Товары без изображений', value:issues.value.missingImages || 0, icon:Image },
  { label:'Товары без категории', value:issues.value.uncategorized || 0, icon:FolderTree },
  { label:'Товары не в наличии', value:issues.value.outOfStock || 0, icon:Boxes },
  { label:'Варианты с остатком до 5 шт.', value:issues.value.lowStock || 0, icon:Package },
]);
const shortcuts = computed(()=>[
  { section:'products', label:'Товары', icon:Boxes }, { section:'appearance', label:'Витрина и баннеры', icon:Image },
  { section:'categories', label:'Категории', icon:FolderTree }, { section:'promotions', label:'Промокоды', icon:TrendingUp },
].filter(item=>allowed(item.section)));
</script>
<template>
  <section class="store-dashboard" :aria-busy="busy" aria-label="Сводка интернет-магазина">
    <div class="sd-metrics kpi-grid">
      <article class="sd-metric sd-metric--primary"><span><Wallet :size="18"/>Оплаченные заказы, сумма</span><strong>{{money(sales.revenue)}}</strong><small>{{sales.paidOrders}} оплаченных заказов за период</small></article>
      <article class="sd-metric"><span><ShoppingBag :size="18"/>Заказы за период</span><strong>{{sales.orders}}</strong><small>все статусы · только сайт</small></article>
      <article class="sd-metric"><span><TrendingUp :size="18"/>Средний оплаченный заказ</span><strong>{{money(sales.averageOrder)}}</strong><small>без отменённых и возвратов</small></article>
      <article class="sd-metric"><span><Package :size="18"/>Опубликовано товаров</span><strong>{{data.products || 0}}</strong><small>{{issues.outOfStock || 0}} не в наличии</small></article>
    </div>
    <div class="sd-main-grid">
      <article class="sd-panel sd-sales"><header><div><h2>Динамика продаж</h2><p>Оплаченные заказы по дате создания · московское время</p></div><span>{{data.period?.days || 30}} дней</span></header>
        <div v-if="sales.paidOrders" class="sd-chart" role="img" :aria-label="'Сумма оплаченных заказов по дням: '+trend.map((item:any)=>date(item.day)+': '+money(item.revenue)).join('; ')">
          <div v-for="(item,index) in trend" :key="item.day" class="sd-chart-column" :title="date(item.day)+': '+money(item.revenue)+' · '+item.orders+' заказов'"><div class="sd-chart-track"><span :style="{ '--sales-height': `${Number(item.revenue)/maxRevenue*100}%` }"/></div><small v-if="index===0||index===trend.length-1||trend.length===7">{{new Date(item.day).getUTCDate()}}</small><small v-else aria-hidden="true">·</small></div>
        </div>
        <div v-else class="sd-empty"><TrendingUp :size="28"/><strong>Нет оплаченных заказов за период</strong><p>После первых оплат здесь появится динамика продаж.</p></div>
        <footer v-if="trend.length" class="sd-chart-dates"><span>{{date(trend[0].day)}}</span><span>{{date(trend[trend.length-1].day)}}</span></footer>
      </article>
      <article class="sd-panel"><header><h2>Заказы в работе</h2><NuxtLink v-if="allowed('orders')" to="/admin-workspace/orders">Все заказы<ArrowRight :size="16"/></NuxtLink></header>
        <div class="sd-queue"><button v-for="stage in queue" :key="stage.status" type="button" :disabled="!allowed('orders')" @click="navigateTo({path:'/admin-workspace/orders',query:{status:stage.status}})"><component :is="stage.icon" :size="18"/><span>{{stage.label}}</span><strong>{{data.queue?.[stage.status] || 0}}</strong><ArrowRight :size="16"/></button></div>
        <p v-if="issues.syncErrors" class="sd-warning"><AlertCircle :size="17"/>Не переданы в 1С из-за ошибки: {{issues.syncErrors}}</p>
        <footer>Незавершённые заказы за всё время</footer>
      </article>
    </div>
    <div class="sd-bottom-grid">
      <article class="sd-panel"><header><h2>Последние заказы</h2><NuxtLink v-if="allowed('orders')" to="/admin-workspace/orders">Все заказы<ArrowRight :size="16"/></NuxtLink></header>
        <div v-if="data.recentOrders?.length" class="sd-recent"><button v-for="order in data.recentOrders" :key="order.id" type="button" :disabled="!allowed('orders')" @click="navigateTo({path:'/admin-workspace/orders',query:{q:order.orderNumber}})"><span><strong>{{order.orderNumber}}</strong><small>{{date(order.createdAt)}}</small></span><span><span class="sd-order-status">{{statuses[order.status] || order.status}}</span><small>{{payments[order.paymentStatus] || 'Оплата не подтверждена'}}</small></span><strong>{{money(order.finalAmount)}}</strong><ArrowRight :size="16"/></button></div>
        <div v-else class="sd-empty"><ShoppingBag :size="28"/><strong>Заказов пока нет</strong><p>Здесь появятся последние заказы с сайта.</p></div>
      </article>
      <article class="sd-panel"><header><h2>Состояние каталога</h2><NuxtLink v-if="allowed('products')" to="/admin-workspace/products">Каталог<ArrowRight :size="16"/></NuxtLink></header>
        <div class="sd-attention"><div v-for="item in attention" :key="item.label"><component :is="item.icon" :size="18"/><span>{{item.label}}</span><strong :class="{'sd-attention-count':item.value>0}">{{item.value}}</strong></div></div>
        <footer>Только опубликованные товары · без подарочных карт</footer>
      </article>
    </div>
    <nav v-if="shortcuts.length" class="sd-shortcuts" aria-label="Быстрые действия магазина"><NuxtLink v-for="item in shortcuts" :key="item.section" :to="'/admin-workspace/'+item.section"><component :is="item.icon" :size="18"/><span>{{item.label}}</span><ArrowRight :size="16"/></NuxtLink></nav>
  </section>
</template>
