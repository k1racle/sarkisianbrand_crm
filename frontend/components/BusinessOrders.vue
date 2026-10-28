<script setup lang="ts">
import { customerWarehouseAsOf } from '~/shared/customer-warehouse-status';
import { ChevronDown, ChevronLeft, ChevronRight, PackageSearch, Repeat2, Search, X } from '@lucide/vue';
const props = defineProps<{ organizationId: string; busy: boolean; canOrder: boolean; canSeeFinance: boolean; formatPrice: (value: any) => string; statusLabels: Record<string, string>; fulfillment: (item: any) => string }>();
const emit = defineEmits<{ repeat: [item: any]; context: [event: MouseEvent, item: any] }>();
const session = useB2BSession();
const query = ref(''), status = ref(''), sort = ref('newest'), expanded = ref(''), page = ref(1);
const orders = ref<any[]>([]), total = ref(0), pageCount = ref(1), loading = ref(false), error = ref(''), legacyLimited = ref(false);
const statuses = ['NEW', 'CONFIRMED', 'PAYMENT_WAITING', 'PAID', 'ASSEMBLING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const hasFilters = computed(() => Boolean(query.value.trim() || status.value));
let requestVersion = 0, timer: ReturnType<typeof setTimeout> | undefined;
async function load() {
  if (!props.organizationId) return;
  const version = ++requestVersion, organizationId = props.organizationId, identity = session.generation.value;
  loading.value = true; error.value = '';
  try {
    const result: any = await session.request('/b2b/orders', { query: { page: page.value, search: query.value.trim() || undefined, status: status.value || undefined, sort: sort.value } });
    if (version !== requestVersion || organizationId !== props.organizationId || identity !== session.generation.value) return;
    // Older servers and isolated UI fixtures return an array. Clearly disclose
    // the old 100-order limit instead of treating it as a complete history.
    if (Array.isArray(result)) {
      const filtered = result.filter(order => (!status.value || order.status === status.value) && `${order.orderNumber} ${(order.items || []).map((item: any) => item.productName).join(' ')}`.toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'))).sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) * (sort.value === 'newest' ? 1 : -1));
      total.value = filtered.length; pageCount.value = Math.max(1, Math.ceil(filtered.length / 20)); page.value = Math.min(page.value, pageCount.value);
      orders.value = filtered.slice((page.value - 1) * 20, page.value * 20); legacyLimited.value = result.length >= 100;
    } else {
      if (!result || !Array.isArray(result.items) || !Number.isSafeInteger(result.total) || !Number.isSafeInteger(result.page) || !Number.isSafeInteger(result.pages)) throw new Error('invalid response');
      orders.value = result.items; total.value = result.total; page.value = result.page; pageCount.value = result.pages; legacyLimited.value = false;
    }
  } catch (e: any) {
    if (version !== requestVersion || organizationId !== props.organizationId || identity !== session.generation.value) return;
    orders.value = []; total.value = 0; pageCount.value = 1;
    error.value = typeof e?.data?.message === 'string' ? e.data.message : 'Не удалось загрузить заказы. Проверьте подключение и повторите попытку.';
  } finally { if (version === requestVersion && organizationId === props.organizationId && identity === session.generation.value) loading.value = false; }
}
function schedule(delay = 0) {
  requestVersion++; clearTimeout(timer); page.value = 1; expanded.value = ''; loading.value = true;
  timer = setTimeout(() => void load(), delay);
}
function changePage(next: number) { if (loading.value || next < 1 || next > pageCount.value) return; page.value = next; expanded.value = ''; void load(); }
function reset() { query.value = ''; status.value = ''; sort.value = 'newest'; schedule(); }
watch(query, () => schedule(250));
watch([status, sort, () => props.organizationId], () => schedule(), { immediate: true });
onBeforeUnmount(() => { requestVersion++; clearTimeout(timer); });
</script>

<template>
  <section class="salon-services-panel business-orders-panel business-register-panel" aria-label="Ваши закупочные заказы">
    <div class="salon-services-filters">
      <label class="salon-services-search"><Search :size="18" /><input v-model="query" type="search" placeholder="Номер заказа или товар" aria-label="Поиск закупочных заказов" /><button v-if="query" type="button" aria-label="Очистить поиск заказов" @click="query = ''"><X :size="16" /></button></label>
      <select v-model="status" aria-label="Статус закупочного заказа"><option value="">Все статусы</option><option v-for="value in statuses" :key="value" :value="value">{{ statusLabels[value] || value }}</option></select>
      <select v-model="sort" aria-label="Сортировка закупочных заказов"><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option></select>
    </div>
    <div class="business-results-summary"><span role="status" aria-live="polite">{{ loading ? 'Загружаем заказы…' : error ? 'Заказы не загружены' : hasFilters ? `Найдено заказов: ${total}` : `Всего заказов: ${total}` }}</span><button v-if="hasFilters" type="button" class="business-text-control" @click="reset">Сбросить фильтры<X :size="14" /></button><small v-else-if="orders.length && !loading">Нажмите на номер, чтобы посмотреть состав</small></div>
    <p v-if="legacyLimited" class="crm-inline-note">Сервер вернул только последние 100 заказов. Для полной истории обновите приложение.</p>
    <div v-if="error" class="salon-services-empty" role="alert"><p>{{ error }}</p><button type="button" @click="load">Повторить</button></div>

    <table v-else-if="orders.length && !loading" class="salon-services-table business-orders-table" aria-label="Список закупочных заказов">
      <thead><tr><th scope="col">Заказ</th><th scope="col">Статус</th><th scope="col">Склад и передача</th><th v-if="canSeeFinance" scope="col" class="business-money-heading">Сумма</th><th scope="col"><span class="salon-services-sr-only">Действия</span></th></tr></thead>
      <tbody>
        <template v-for="item in orders" :key="item.id">
          <tr class="salon-service-row business-order-row" :class="{ 'is-expanded': expanded === item.id }" @contextmenu.prevent="emit('context', $event, item)">
            <th scope="row" class="salon-service-info"><button type="button" class="b2b-edit-link business-order-expand" :aria-expanded="expanded === item.id" :aria-controls="`business-order-${item.id}`" :aria-label="`Состав заказа ${item.orderNumber}`" @click="expanded = expanded === item.id ? '' : item.id">{{ item.orderNumber }}<ChevronDown :size="15" /></button><small>{{ new Date(item.createdAt).toLocaleDateString('ru-RU') }} · Позиций: {{ item.items.length }}</small></th>
            <td data-label="Статус"><span class="salon-service-status" :class="{ 'is-active': item.status === 'DELIVERED', 'is-cancelled': ['CANCELLED', 'REFUNDED'].includes(item.status) }"><i aria-hidden="true" />{{ statusLabels[item.status] || item.status }}</span></td>
            <td data-label="Склад и передача"><span :class="{ 'sync-error': item.warehouseStatus?.isCurrent && item.warehouseStatus?.stage === 'NEEDS_ATTENTION' }">{{ fulfillment(item) }}</span><small v-if="customerWarehouseAsOf(item.warehouseStatus)">Подтверждено {{ customerWarehouseAsOf(item.warehouseStatus) }}</small><small v-if="item.trackingNumber">Трек: {{ item.trackingNumber }}</small></td>
            <td v-if="canSeeFinance" data-label="Сумма" class="salon-client-spent"><strong>{{ formatPrice(item.finalAmount) }}</strong></td>
            <td class="business-order-actions"><button type="button" :disabled="busy || !canOrder" :aria-label="`Повторить заказ ${item.orderNumber}`" @click="emit('repeat', item)"><Repeat2 :size="16" /><span>Повторить</span></button></td>
          </tr>
          <tr v-if="expanded === item.id" :id="`business-order-${item.id}`" class="business-order-details"><td :colspan="canSeeFinance ? 5 : 4"><div><h3>Состав заказа {{ item.orderNumber }}</h3><div v-for="(line, index) in item.items" :key="line.id || index" class="business-order-line"><span><strong>{{ line.productName }}</strong><small>{{ line.variantName || line.externalSku }}</small></span><span>{{ line.quantity }} шт.</span><strong v-if="canSeeFinance">{{ formatPrice(line.total) }}</strong></div><p v-if="item.comments" class="business-order-comment">{{ item.comments }}</p><small class="business-order-repeat-note">При повторе проверим актуальные цены и наличие. Передачу в 1С подтверждает настроенное подключение.</small></div></td></tr>
        </template>
      </tbody>
    </table>

    <div v-else-if="!loading" class="salon-services-empty"><PackageSearch :size="30" /><h3>{{ hasFilters ? 'Заказы не найдены' : 'Заказов пока нет' }}</h3><p>{{ hasFilters ? 'Попробуйте другой номер, название товара или статус.' : 'Выберите товары в каталоге. После оформления здесь появятся состав и состояние заказа.' }}</p><button v-if="hasFilters" type="button" @click="reset">Показать все заказы</button><NuxtLink v-else to="/b2b?section=catalog">Открыть каталог</NuxtLink></div>
    <footer v-if="pageCount > 1 && !error" class="salon-services-total"><small>Показаны {{ (page - 1) * 20 + 1 }}–{{ Math.min(page * 20, total) }} из {{ total }}</small><nav class="business-pagination" aria-label="Страницы заказов"><button type="button" :disabled="loading || page === 1" aria-label="Предыдущая страница заказов" @click="changePage(page - 1)"><ChevronLeft :size="17" /></button><span aria-live="polite">{{ page }} из {{ pageCount }}</span><button type="button" :disabled="loading || page === pageCount" aria-label="Следующая страница заказов" @click="changePage(page + 1)"><ChevronRight :size="17" /></button></nav></footer>
  </section>
</template>
