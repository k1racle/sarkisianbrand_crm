<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, FileText, PackageCheck, RefreshCw, Search, UserRound, X } from '@lucide/vue';
import { orderSourceLabel, orderTransfer, warehouseExecution, warehouseFactAt, warehouseNeedsReview, warehouseNumber, warehouseQuantity, warehouseStatusLabel, warehouseTotal } from '~/shared/warehouse-execution';
const props = withDefaults(defineProps<{ fulfillment?: boolean }>(), { fulfillment: false });
const source = ref(props.fulfillment ? '' : 'B2B'), needsReview = ref(false);
useHead({ title: (props.fulfillment ? 'Сборка и отгрузка' : 'Заказы B2B') + ' — SARKISIAN CRM' });
const config = useRuntimeConfig(), session = useWorkspaceSession(), access = useWorkspaceAccess();
const route = useRoute();
const rows = ref<any[]>([]), total = ref(0), pages = ref(1), page = ref(1), search = ref(''), status = ref('');
const loading = ref(false), saving = ref(false), error = ref(''), detailError = ref(''), selected = ref<any>(null);
const registerTab = ref('orders'), financeVisited = ref(false);
const registerTabs = computed<ReadonlyArray<readonly [string, string]>>(() => [
  ['orders', 'Заказы'], ...(!props.fulfillment && access.can('order_finance.read') ? [['finance', 'Расчёты из 1С'] as const] : []),
]);
watch(registerTab, value => { if (value === 'finance') financeVisited.value = true; });
watch(registerTabs, tabs => { if (!tabs.some(([key]) => key === registerTab.value)) registerTab.value = 'orders'; });
const quickStatuses = [['', 'Все заказы'], ['NEW', 'Новые'], ['CONFIRMED', 'Подтверждённые'], ['ASSEMBLING', 'В сборке'], ['SHIPPED', 'Отправленные']];
const hasFilters = computed(() => Boolean(search.value || status.value || needsReview.value || (props.fulfillment && source.value)));
function resetFilters() { search.value = ''; status.value = ''; needsReview.value = false; source.value = props.fulfillment ? '' : 'B2B'; }
const draft = reactive({ internalNotes: '', comment: '' });
const baseline = ref(''), dirty = computed(() => !!selected.value && JSON.stringify(draft) !== baseline.value);
const detailLoaded = ref(false);
const detailTab = ref('general'), detailBody = ref<HTMLElement | null>(null);
const financeSummary = ref<any>(null), managerEditor = ref(false);
const detailTabs = computed<ReadonlyArray<readonly [string, string]>>(() => [
  ['general', 'Обзор'], ['execution', 'Склад 1С'],
  ...(access.can('order_finance.read') ? [['finance', 'Расчёты 1С'] as const] : []), ['history', 'История'], ['settings', 'Условия и заметки'],
]);
watch(detailTab, async () => { await nextTick(); detailBody.value?.scrollTo({ top: 0 }); });
watch(detailTabs, tabs => { if (!tabs.some(([key]) => key === detailTab.value)) detailTab.value = 'general'; });
const canWrite = computed(() => access.can('oms.write') && selected.value?.canWrite === true && detailLoaded.value);
const managerOptions = ref<any[]>([]), managerId = ref(''), managerSearch = ref(''), managerError = ref(''), managerLoading = ref(false), canUnassign = ref(false), moreManagers = ref(false);
const personName = (person: any) => person ? [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Сотрудник' : 'Не назначен';
async function loadManagers() {
  if (!selected.value || !canWrite.value) return;
  const id = selected.value.id;
  managerLoading.value = true; managerError.value = '';
  try {
    const result = await request(`/oms/orders/${encodeURIComponent(id)}/managers`, { query: { search: managerSearch.value || undefined } });
    if (selected.value?.id !== id) return;
    managerOptions.value = result.items; canUnassign.value = result.canUnassign; moreManagers.value = result.hasMore;
  } catch (e: any) { if (selected.value?.id === id) managerError.value = message(e); }
  finally { if (selected.value?.id === id) managerLoading.value = false; }
}
async function assignManager() {
  if (!canWrite.value || saving.value || managerLoading.value || dirty.value || (managerId.value || null) === selected.value.managerId) return;
  saving.value = true; managerError.value = '';
  try {
    await request(`/oms/orders/${encodeURIComponent(selected.value.id)}/manager`, { method: 'PATCH', body: { managerId: managerId.value || null, expectedManagerId: selected.value.managerId } });
    try { setOrder(await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`)); }
    catch (e: any) { if (e?.status === 404 || e?.statusCode === 404) selected.value = null; else throw e; }
    await load();
  } catch (e: any) { managerError.value = message(e); }
  finally { saving.value = false; }
}
const names: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплаты', PAID: 'Оплачен', ASSEMBLING: 'В сборке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const amount = (value: any) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: selected.value?.currency || 'RUB', maximumFractionDigits: 2 }).format(Number(value || 0));
const company = (order: any) => order.organization?.name || order.buyerName || [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || 'Компания не указана';
const date = (value: string) => new Date(value).toLocaleString('ru-RU');
const operationNames: Record<string, string> = { CONFIRM: 'Коммерческие условия подтверждены', PICK: 'Товары собраны', SHIP: 'Оформлена отгрузка', CANCEL_REMAINDER: 'Отменён остаток', RETURN: 'Принят возврат' };
const warehouse = computed(() => warehouseExecution(selected.value));
const transfer = computed(() => orderTransfer(selected.value));
const warehouseAt = computed(() => warehouseFactAt(selected.value));
const warehouseDateLabel = computed(() => warehouseAt.value ? (warehouse.value?.isCurrent === false ? 'Исторические данные на ' : 'По данным 1С на ') + date(warehouseAt.value) : 'Подтверждённые данные 1С не получены');
const countLabel = (value: number, forms: [string, string, string]) => `${value} ${forms[new Intl.PluralRules('ru').select(value) === 'one' ? 0 : new Intl.PluralRules('ru').select(value) === 'few' ? 1 : 2]}`;
const quantities = computed(() => (selected.value?.items || []).reduce((sum: any, item: any) => ({
  ordered: sum.ordered + Number(item.quantity || 0), picked: sum.picked + Number(item.pickedQuantity || 0),
  shipped: sum.shipped + Number(item.shippedQuantity || 0), cancelled: sum.cancelled + Number(item.cancelledQuantity || 0),
}), { ordered: 0, picked: 0, shipped: 0, cancelled: 0 }));
const payment = computed(() => {
  const order = selected.value;
  if (!order) return { label: 'Нет данных', detail: '', tone: 'neutral' };
  if (order.paymentStatus === 'NOT_REQUIRED') return { label: 'Оплата не требуется', detail: order.sourceChannel === 'PARTNER_GIFT' ? 'Подарочная отправка на 0 ₽' : 'По условиям заказа', tone: 'neutral' };
  if (order.source === 'B2B') {
    const finance = financeSummary.value;
    if (!access.can('order_finance.read')) return { label: 'Расчёты в 1С', detail: 'Нет доступа к финансовым данным', tone: 'neutral' };
    if (!finance?.snapshot) return { label: 'Нет подтверждения', detail: finance?.reason || 'Ожидаем финансовые данные 1С', tone: 'neutral' };
    if (finance.state !== 'CURRENT') return { label: 'Нужна сверка', detail: 'Последний ответ 1С требует обновления', tone: 'warning' };
    const snapshot = finance.snapshot;
    const paid = Number(snapshot.paid || 0) - Number(snapshot.refunded || 0);
    const paidInFull = Number(snapshot.total) > 0 && paid >= Number(snapshot.total) && Number(snapshot.debt) <= 0;
    return { label: paidInFull ? 'Оплачен' : Number(snapshot.debt) <= 0 ? 'Долга нет' : paid > 0 ? 'Частично оплачен' : 'Ожидает оплаты', detail: 'По данным 1С на ' + date(snapshot.asOf), tone: paidInFull || Number(snapshot.debt) <= 0 ? 'success' : 'warning' };
  }
  const labels: Record<string, string> = { SUCCEEDED: 'Оплачен', PAID: 'Оплачен', PENDING: 'Ожидает оплаты', UNPAID: 'Не оплачен', CANCELED: 'Платёж отменён', CANCELLED: 'Платёж отменён', REFUNDED: 'Возвращена', PARTIALLY_REFUNDED: 'Частичный возврат', FAILED: 'Ошибка оплаты', MARKETPLACE: 'Расчёты площадки' };
  return { label: labels[order.paymentStatus] || 'Нет подтверждения', detail: order.source === 'WEB' ? 'Статус платёжной системы' : 'По данным канала продаж', tone: ['SUCCEEDED', 'PAID'].includes(order.paymentStatus) ? 'success' : 'neutral' };
});
const reserve = computed(() => {
  const value = warehouseTotal(selected.value, 'reserved');
  return { label: value == null ? 'Нет данных 1С' : warehouseNumber(value) + ' ед.', detail: warehouseDateLabel.value, tone: warehouse.value?.isCurrent === false ? 'warning' : 'neutral' };
});
const picking = computed(() => { const value = warehouseTotal(selected.value, 'picked'); return value == null ? 'Нет данных 1С' : warehouseNumber(value) + ' из ' + quantities.value.ordered + ' единиц'; });
const shipping = computed(() => { const value = warehouseTotal(selected.value, 'shipped'); return value == null ? 'Нет данных 1С' : warehouseNumber(value) + ' из ' + quantities.value.ordered + ' единиц'; });
const nextAction = computed(() => {
  const order = selected.value;
  if (!detailLoaded.value) return { title: 'Загружаем данные заказа', text: 'Действия станут доступны после загрузки карточки.', label: '', tab: 'general' };
  if (order.items?.length && order.items.every((item: any) => item.productType === 'GIFT_CARD')) return { title: 'Электронный заказ', text: 'Подарочные карты не требуют отбора и отгрузки на складе.', label: '', tab: 'general' };
  if (order.marketplaceImportIssue) return { title: 'Проверьте расхождение с площадкой', text: 'Перед исполнением нужно проверить входящий состав и сопоставление товаров.', label: 'Проверить состав', tab: 'execution' };
  if (!order.managerId && canWrite.value) return { title: 'Назначьте ответственного менеджера', text: 'Он проверит состав и условия заказа перед передачей в 1С.', label: 'Назначить менеджера', tab: 'manager' };
  if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) return { title: names[order.status] || order.status, text: 'История исполнения и расчётов сохранена в карточке заказа.', label: 'История заказа', tab: 'history' };
  if (!order.execution && canWrite.value) return { title: 'Проверьте состав и условия', text: 'Подтвердите заказ для передачи в 1С. Резерв и складское задание затем подтверждает 1С.', label: 'Проверить и передать в 1С', tab: 'execution' };
  if (order.oneCSyncError) return { title: 'Передача в 1С требует проверки', text: transfer.value.detail, label: 'Проверить передачу', tab: 'execution' };
  if (warehouseNeedsReview(order)) return { title: 'Складские данные требуют проверки', text: warehouse.value?.isCurrent === false ? 'Показаны исторические данные. Ожидаем актуальное подтверждение 1С.' : warehouse.value?.error || 'Уточните состояние заказа у ответственного на складе.', label: 'Открыть склад 1С', tab: 'execution' };
  if (!warehouse.value) return { title: 'Ожидаем данные склада 1С', text: 'Приём заказа, резерв, отбор и отгрузка подтверждаются отдельно. Ручная сборка в CRM не выполняется.', label: 'Открыть склад 1С', tab: 'execution' };
  return { title: warehouseStatusLabel(warehouse.value.status), text: warehouseDateLabel.value + '. Исполнение ведётся на складе в 1С.', label: 'Открыть склад 1С', tab: 'execution' };
});
function followNextAction() {
  if (nextAction.value.tab === 'manager') { managerEditor.value = true; nextTick(() => document.getElementById('order-manager-select')?.focus()); }
  else detailTab.value = nextAction.value.tab;
}
const contactName = computed(() => selected.value?.buyerName || personName(selected.value?.customer || selected.value?.user));
const contactEmail = computed(() => selected.value?.buyerEmail || selected.value?.customer?.email || selected.value?.user?.email || '');
const contactPhone = computed(() => selected.value?.buyerPhone || selected.value?.customer?.phone || selected.value?.user?.phone || '');
const deliveryAddress = computed(() => {
  const value = selected.value?.shippingAddress;
  if (typeof value === 'string') return value || 'Адрес не указан';
  if (!value) return 'Адрес не указан';
  return value.fullAddress || value.address || [value.city, value.street, value.house, value.building, value.apartment].filter(Boolean).join(', ') || Object.values(value).filter(item => typeof item === 'string').join(', ') || 'Адрес не указан';
});
const itemSku = (item: any) => item.variant?.sku || item.externalSku || item.offerId || '';
const orderTimeline = computed(() => [
  ...(warehouseAt.value ? [{ id: 'warehouse-' + (warehouse.value?.revision || 'latest'), title: (warehouse.value?.isCurrent === false ? '1С, история: ' : '1С: ') + warehouseStatusLabel(warehouse.value?.status), detail: 'Складские данные' + (warehouse.value?.revision != null ? ' · версия ' + warehouse.value.revision : ''), createdAt: warehouseAt.value }] : []),
  ...(selected.value?.history || []).map((event: any) => ({ id: 'status-' + event.id, title: names[event.toStatus] || event.toStatus, detail: event.comment, createdAt: event.createdAt })),
  ...(selected.value?.executionOperations || []).map((event: any) => ({ id: 'operation-' + event.id, title: 'CRM: ' + (operationNames[event.kind] || event.kind), detail: event.actorName, createdAt: event.createdAt })),
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
const message = (e: any) => e?.data?.message || 'Не удалось выполнить действие. Повторите попытку.';
const request = (path: string, options: any = {}) => $fetch<any>(path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, ...options });
let version = 0, controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
async function load() {
  const current = ++version; controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  try {
    const result = await request('/oms/orders/list', { signal: controller.signal, query: { needsReview: needsReview.value ? 'true' : undefined, source: source.value || undefined, page: page.value, limit: 30, status: status.value || undefined, search: search.value.trim() || undefined } });
    if (current !== version) return;
    rows.value = result.items; total.value = result.total; pages.value = result.pages;
  } catch (e: any) { if (current === version) error.value = message(e); }
  finally { if (current === version) loading.value = false; }
}
function setOrder(order: any) {
  if (selected.value?.id !== order.id || selected.value?.updatedAt !== order.updatedAt) financeSummary.value = null;
  if (selected.value?.id !== order.id) managerEditor.value = false;
  selected.value = order;
  managerId.value = order.managerId || '';
  Object.assign(draft, { internalNotes: order.internalNotes || '', comment: '' });
  baseline.value = JSON.stringify(draft);
}
async function open(order: any) {
  if (saving.value || !leave()) return;
  detailTab.value = 'general';
  detailError.value = ''; detailLoaded.value = false; managerOptions.value = []; managerSearch.value = ''; managerError.value = ''; canUnassign.value = false; setOrder(order); saving.value = true;
  try { setOrder(await request(`/oms/orders/${encodeURIComponent(order.id)}`)); detailLoaded.value = true; await loadManagers(); }
  catch (e: any) { detailError.value = message(e); }
  finally { saving.value = false; }
}
async function openFinance(order: any) {
  await open(order);
  if (selected.value?.id === order.id && detailLoaded.value) detailTab.value = 'finance';
}
async function reloadSelected() {
  if (!selected.value) return;
  setOrder(await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`)); await load();
}
async function refreshSelected() {
  if (!leave()) return;
  saving.value = true;
  try { await reloadSelected(); detailError.value = ''; managerError.value = ''; }
  catch (e: any) { detailError.value = message(e); }
  finally { saving.value = false; }
}
function leave() { return !saving.value && (!dirty.value || window.confirm('Изменения заказа не сохранены. Выйти без сохранения?')); }
const panel = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;
watch(() => selected.value?.id, async (id, previous) => {
  if (id && !previous) { returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; await nextTick(); panel.value?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
});
function close() { if (leave()) { selected.value = null; nextTick(() => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); }); } }
function keyboard(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); close(); } }
async function save() {
  if (saving.value || !canWrite.value || !dirty.value) return;
  saving.value = true; detailError.value = '';
  try {
    await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`, { method: 'PATCH', body: { status: selected.value.status, ...draft, expectedUpdatedAt: selected.value.updatedAt } });
    setOrder(await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`)); await load();
  } catch (e: any) { detailError.value = message(e); }
  finally { saving.value = false; }
}
watch([search, needsReview, source, status], (next, previous) => {
  clearTimeout(timer); ++version; controller?.abort(); page.value = 1;
  if (next[0] !== previous[0]) timer = setTimeout(load, 300);
  else void load();
});
function turn(delta: number) { page.value += delta; load(); }
function unload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
async function openLinkedOrder() {
  const id = route.query.order;
  if (typeof id !== 'string' || !id || !leave()) return;
  error.value = '';
  try { const order = await request(`/oms/orders/${encodeURIComponent(id)}`); if (route.query.order !== id) return; source.value = order.source; await open(order); }
  catch (e: any) { error.value = message(e); }
}
watch(() => route.query.order, () => { if (import.meta.client) openLinkedOrder(); });
onMounted(() => { load(); openLinkedOrder(); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => { ++version; controller?.abort(); clearTimeout(timer); window.removeEventListener('beforeunload', unload); });
onBeforeRouteLeave(leave);
</script>

<template>
  <main class="crm-standard crm-directory crm-orders-page">
    <header v-if="!selected" class="crm-page-header"><div><h1>{{ props.fulfillment ? 'Сборка и отгрузка' : 'Заказы B2B' }}</h1><p>{{ props.fulfillment ? 'Монитор склада 1С: передача заказов, отбор, проверка и отгрузка' : 'Заказы партнёров: от согласования до подтверждённой отгрузки из 1С' }}</p></div><button v-if="registerTab === 'orders'" class="crm-button crm-button--refresh" :disabled="loading || saving" @click="load"><RefreshCw :size="18" />Обновить</button></header>
    <div v-show="!selected" class="crm-directory-content">
      <CrmCardTabs v-if="registerTabs.length > 1" v-model="registerTab" prefix="orders-register" :tabs="registerTabs" label="Разделы заказов B2B" />
      <section id="orders-register-orders-panel" v-show="registerTab === 'orders'" class="crm-surface crm-directory-register" role="tabpanel" :aria-labelledby="registerTabs.length > 1 ? 'orders-register-orders-tab' : undefined" aria-label="Реестр заказов">
        <div class="crm-directory-register-heading"><h2>Реестр заказов <span>{{ total }}</span></h2><small>Новые заказы сверху</small></div>
        <nav class="crm-directory-tabs" aria-label="Быстрые фильтры заказов"><button v-for="[value, label] in quickStatuses" :key="value" class="crm-button" :aria-pressed="status === value" @click="status = value">{{ label }}</button></nav>
        <div class="crm-directory-toolbar">
          <select v-if="props.fulfillment" v-model="source" class="crm-input" aria-label="Источник заказа"><option value="">Все каналы</option><option value="B2B">B2B</option><option value="WEB">Сайт</option><option value="MANUAL">Ручные и подарочные</option><option value="ONE_C">1С</option><option value="OZON">Ozon</option><option value="WILDBERRIES">Wildberries</option><option value="YANDEX_MARKET">Яндекс Маркет</option><option value="MEGAMARKET">Мегамаркет</option></select>
          <div class="crm-input-group crm-directory-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" :aria-label="props.fulfillment ? 'Поиск заказов' : 'Поиск B2B-заказов'" placeholder="Номер заказа, компания, ИНН или email" maxlength="200" /><button v-if="search" class="crm-directory-clear crm-button" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
          <select v-model="status" class="crm-input" aria-label="Статус заказа"><option value="">Все статусы</option><option v-for="(label, key) in names" :key="key" :value="key">{{ label }}</option></select>
          <button v-if="hasFilters" class="crm-button crm-button--text" @click="resetFilters"><X :size="16" /> Сбросить</button>
        </div>
        <label v-if="props.fulfillment" class="crm-orders-review-filter"><input class="crm-check" v-model="needsReview" type="checkbox" /> Только расхождения с площадкой</label>
        <p v-if="error" class="crm-orders-error" role="alert">{{ error }}</p>
        <div v-if="rows.length" class="crm-directory-columns crm-orders-columns" aria-hidden="true"><span>Заказ</span><span>Компания и менеджер</span><span>Статус и передача в 1С</span><span>Сумма заказа</span><span /></div>
        <div class="crm-directory-rows" :aria-busy="loading">
          <button v-for="order in rows" :key="order.id" class="crm-button crm-card-action crm-directory-row crm-orders-row" :disabled="saving" @click="open(order)">
            <span class="crm-directory-stack"><strong>{{ order.orderNumber }}</strong><small>{{ date(order.createdAt) }}</small><small>{{ orderSourceLabel(order) }} · позиций: {{ order.items?.length || 0 }}</small></span>
            <span class="crm-directory-stack"><strong>{{ company(order) }}</strong><small>{{ order.organization?.inn ? 'ИНН ' + order.organization.inn : order.buyerEmail || order.user?.email }}</small><span class="crm-directory-icon-line" :class="{ 'crm-directory-unassigned': !order.manager }"><UserRound :size="15" aria-hidden="true" /><small>{{ personName(order.manager) }}</small></span></span>
            <span class="crm-directory-stack"><span class="crm-badge" :data-status="order.status">{{ names[order.status] || order.status }}</span><small>{{ orderTransfer(order).label }}</small><small v-if="order.oneCSyncError || warehouseNeedsReview(order)" class="crm-orders-attention">Требует проверки</small><small v-if="order.marketplaceImportIssue" class="crm-orders-attention">Есть расхождение с площадкой</small></span>
            <span class="crm-directory-stack"><strong>{{ amount(order.finalAmount) }}</strong><small v-if="order.trackingNumber">Трек: {{ order.trackingNumber }}</small></span>
            <ArrowRight class="crm-directory-open" :size="18" aria-hidden="true" />
          </button>
        </div>
        <div v-if="!loading && !rows.length && !error" class="crm-directory-empty"><Search v-if="hasFilters" :size="28" /><PackageCheck v-else :size="28" /><strong>{{ hasFilters ? 'Заказы не найдены' : 'Заказов пока нет' }}</strong><p>{{ hasFilters ? 'Попробуйте другой номер или измените фильтры.' : props.fulfillment ? 'Здесь появятся заказы выбранного канала.' : 'Здесь появятся закупки из кабинетов B2B-клиентов.' }}</p><button v-if="hasFilters" class="crm-button" @click="resetFilters">Сбросить фильтры</button></div>
        <footer class="crm-directory-footer"><small role="status">{{ loading ? 'Загружаем заказы…' : 'Найдено: ' + total }}</small><nav v-if="pages > 1" class="crm-directory-pagination" aria-label="Страницы заказов"><button class="crm-button crm-button--icon" aria-label="Предыдущая страница" :disabled="page <= 1 || loading" @click="turn(-1)"><ArrowLeft :size="18" /></button><span>{{ page }} / {{ pages }}</span><button class="crm-button crm-button--icon" aria-label="Следующая страница" :disabled="page >= pages || loading" @click="turn(1)"><ArrowRight :size="18" /></button></nav><small v-else class="crm-directory-hint">Нажмите на заказ, чтобы открыть состав и действия</small></footer>
      </section>
      <section v-if="financeVisited && !props.fulfillment && access.can('order_finance.read')" id="orders-register-finance-panel" v-show="registerTab === 'finance'" role="tabpanel" aria-labelledby="orders-register-finance-tab">
        <CrmReceivables :refresh-key="selected?.updatedAt || ''" @open="openFinance" />
      </section>
    </div>
    <form v-if="selected" ref="panel" class="crm-approved-order" aria-labelledby="b2b-order-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <div class="crm-order-backline"><button class="crm-button crm-button--text" type="button" :disabled="saving" @click="close"><ArrowLeft :size="17" />К списку заказов</button><button class="crm-button crm-button--icon" type="button" aria-label="Обновить заказ" :disabled="saving" @click="refreshSelected"><RefreshCw :size="18" /></button></div>
      <header class="crm-order-identity">
        <div><div class="crm-order-title-line"><h1 id="b2b-order-title">Заказ {{ selected.orderNumber }}</h1><span class="crm-badge" :data-status="selected.status">{{ names[selected.status] || selected.status }}</span></div><strong class="crm-order-company">{{ company(selected) }}</strong><p class="crm-order-meta">{{ contactName }} <span>·</span> {{ orderSourceLabel(selected) }} <span>·</span> {{ date(selected.createdAt) }}</p></div>
        <div class="crm-order-total"><span>Сумма заказа</span><strong>{{ amount(selected.finalAmount) }}</strong><span v-if="Number(selected.discountAmount) > 0">Скидка {{ amount(selected.discountAmount) }}</span></div>
      </header>
      <p v-if="detailError" class="crm-order-notice crm-order-notice--danger" role="alert">{{ detailError }}</p>
      <p v-if="selected.marketplaceImportIssue" class="crm-order-notice crm-order-notice--warning" role="alert">{{ selected.marketplaceImportIssue }}</p>
      <div class="crm-order-stages" aria-label="Состояния исполнения заказа" :aria-busy="!detailLoaded">
        <div><span>Оплата</span><strong :data-tone="payment.tone"><Check v-if="payment.tone === 'success'" :size="16" />{{ payment.label }}</strong><small>{{ payment.detail }}</small></div>
        <div><span>Резерв</span><strong :data-tone="reserve.tone">{{ reserve.label }}</strong><small>{{ reserve.detail }}</small></div>
        <div><span>Сборка в 1С</span><strong>{{ picking }}</strong><small>{{ warehouseDateLabel }}</small></div>
        <div><span>Отгрузка из 1С</span><strong>{{ shipping }}</strong><small>{{ warehouseDateLabel }}{{ selected.trackingNumber ? ' · Трек: ' + selected.trackingNumber : '' }}</small></div>
      </div>
      <div class="crm-order-workspace">
        <div class="crm-order-primary">
          <div v-if="detailTab === 'general'" class="crm-order-next-action"><div><h2>{{ nextAction.title }}</h2><p>{{ nextAction.text }}</p></div><button v-if="nextAction.label" class="crm-button crm-button--primary" type="button" :disabled="saving || dirty" @click="followNextAction">{{ nextAction.label }}<ArrowRight :size="17" /></button></div>
          <CrmCardTabs v-model="detailTab" class="crm-order-tabs" prefix="order-detail" :tabs="detailTabs" label="Разделы заказа" />
          <div ref="detailBody" class="crm-order-content">
            <section id="order-detail-general-panel" role="tabpanel" aria-labelledby="order-detail-general-tab" :hidden="detailTab !== 'general'" :inert="detailTab !== 'general'">
              <div class="crm-order-table-panel"><div class="crm-order-section-heading"><h2>Состав заказа</h2><span>{{ selected.items?.length || 0 }} позиций · {{ quantities.ordered }} единиц</span></div>
                <div class="crm-order-table-scroll"><table class="crm-order-items-table"><thead><tr><th scope="col">Товар</th><th scope="col">Шт.</th><th scope="col">Собрано</th><th scope="col">Отгружено</th><th scope="col">Цена за шт.</th><th scope="col">Сумма</th></tr></thead><tbody><tr v-for="item in selected.items" :key="item.id"><td><strong>{{ item.productName }}</strong><small>{{ [item.variantName, itemSku(item)].filter(Boolean).join(' · ') }}</small><small v-if="(warehouseQuantity(selected, item.id, 'cancelled') || 0) > 0 || (warehouseQuantity(selected, item.id, 'returned') || 0) > 0">По данным 1С: отменено {{ warehouseNumber(warehouseQuantity(selected, item.id, 'cancelled')) }} · возвращено {{ warehouseNumber(warehouseQuantity(selected, item.id, 'returned')) }}</small></td><td data-label="Количество">{{ item.quantity }}</td><td data-label="Собрано">{{ warehouseNumber(warehouseQuantity(selected, item.id, 'picked')) }}</td><td data-label="Отгружено">{{ warehouseNumber(warehouseQuantity(selected, item.id, 'shipped')) }}</td><td data-label="Цена за шт.">{{ amount(item.price) }}</td><td data-label="Сумма"><strong>{{ amount(item.total) }}</strong></td></tr></tbody></table></div>
                <p v-if="!selected.items?.length" class="crm-order-empty">Состав заказа не передан.</p><p class="crm-warehouse-caption crm-order-item-source">Собрано и отгружено — по данным 1С. Прочерк означает, что подтверждение ещё не получено.<span v-if="warehouse?.isCurrent === false"> Показаны исторические количества; ожидаем обновление склада.</span></p>
                <div class="crm-order-calculation"><p>Цены и суммы позиций — из заказа.<span v-if="Number(selected.discountAmount) > 0"> Скидка учитывается в итоговой сумме заказа.</span></p><dl><div><dt>Сумма товаров</dt><dd>{{ amount(selected.totalAmount) }}</dd></div><div v-if="Number(selected.discountAmount) > 0"><dt>Скидка</dt><dd>−{{ amount(selected.discountAmount) }}</dd></div><div v-if="selected.shippingCost != null"><dt>Доставка</dt><dd>{{ amount(selected.shippingCost) }}</dd></div><div class="crm-order-calculation-total"><dt>Итого по заказу</dt><dd>{{ amount(selected.finalAmount) }}</dd></div></dl></div>
              </div>
              <section class="crm-order-delivery" aria-label="Получатель и доставка"><div><h2>Получатель</h2><strong>{{ contactName }}</strong><span v-if="contactEmail">{{ contactEmail }}</span><span v-if="contactPhone">{{ contactPhone }}</span></div><div><h2>Доставка</h2><strong>{{ selected.shippingProvider || 'Способ не указан' }}</strong><span>{{ deliveryAddress }}</span><span v-if="selected.trackingNumber">Трек: {{ selected.trackingNumber }}</span><span v-if="selected.execution?.deliveryTerms">{{ selected.execution.deliveryTerms }}</span></div></section>
            </section>
            <section id="order-detail-execution-panel" role="tabpanel" aria-labelledby="order-detail-execution-tab" :hidden="detailTab !== 'execution'" :inert="detailTab !== 'execution'" class="crm-order-operation-panel"><CrmOrderExecution :key="selected.id" :order="selected" :disabled="saving || dirty" :readonly="!canWrite" :reload="reloadSelected" @busy="saving = $event" /></section>
            <section v-if="access.can('order_finance.read')" id="order-detail-finance-panel" role="tabpanel" aria-labelledby="order-detail-finance-tab" :hidden="detailTab !== 'finance'" :inert="detailTab !== 'finance'" class="crm-order-operation-panel"><CrmOrderFinance :key="selected.id" :order="selected" :disabled="saving || !canWrite || dirty" :has-unsaved-changes="dirty" :reload="reloadSelected" @busy="saving = $event" @snapshot="financeSummary = $event" /></section>
            <section id="order-detail-history-panel" role="tabpanel" aria-labelledby="order-detail-history-tab" :hidden="detailTab !== 'history'" :inert="detailTab !== 'history'" class="crm-order-operation-panel"><h2>История заказа</h2><p v-if="!orderTimeline.length" class="crm-order-empty">Изменений пока нет.</p><ol class="crm-order-timeline crm-order-timeline--full"><li v-for="event in orderTimeline" :key="event.id"><time>{{ date(event.createdAt) }}</time><div><strong>{{ event.title }}</strong><p v-if="event.detail">{{ event.detail }}</p></div></li></ol><p v-if="selected.history?.length === 100 || selected.executionOperations?.length === 100" class="crm-order-muted">Показаны последние 100 событий каждого типа.</p></section>
            <section id="order-detail-settings-panel" role="tabpanel" aria-labelledby="order-detail-settings-tab" :hidden="detailTab !== 'settings'" :inert="detailTab !== 'settings'" class="crm-order-operation-panel"><h2>Условия и заметки</h2><p class="crm-order-muted">Статусы, трек-номер и складские количества поступают из 1С. Для отмены или возврата обратитесь к ответственному в 1С.</p><dl class="crm-warehouse-facts"><div><dt>Статус заказа</dt><dd>{{ names[selected.status] || selected.status }}</dd></div><div><dt>Трек-номер</dt><dd>{{ selected.trackingNumber || 'Не передан' }}</dd></div></dl><fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || !canWrite"><label class="crm-field">Внутренняя заметка<textarea v-model="draft.internalNotes" class="crm-input" rows="3" maxlength="5000" /></label><label class="crm-field">Комментарий к изменению<input v-model="draft.comment" class="crm-input" maxlength="1000" /></label><button v-if="canWrite" class="crm-button crm-button--primary" type="submit" :disabled="saving || !dirty">{{ saving ? 'Сохраняем…' : 'Сохранить заметки' }}</button></fieldset></section>
          </div>
          <div v-if="dirty" class="crm-order-unsaved" role="status"><span>Есть несохранённые изменения заказа</span><button class="crm-button crm-button--primary" type="submit" :disabled="saving || !canWrite">{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></div>
        </div>
        <aside class="crm-order-context" aria-label="Информация об исполнении">
          <section class="crm-order-sync" :data-confirmed="selected.isSynced1C"><div><h2>Передача в 1С</h2><span class="crm-order-state" :data-tone="transfer.tone">{{ selected.oneCSyncError ? 'Ошибка' : selected.isSynced1C ? 'Приём подтверждён' : 'Ожидаем ответ' }}</span></div><p>{{ transfer.detail }}</p><p v-if="selected.oneCSyncAt">Последнее подтверждение: {{ date(selected.oneCSyncAt) }}</p><p v-if="selected.oneCStatus">Общий статус: {{ warehouseStatusLabel(selected.oneCStatus) }}</p><button class="crm-button crm-button--text" type="button" @click="detailTab = 'execution'">Данные склада 1С<ArrowRight :size="15" /></button></section>
          <section class="crm-order-team"><div class="crm-order-section-heading"><h2>Ответственный</h2><button v-if="canWrite" class="crm-button crm-button--text" type="button" :aria-expanded="managerEditor" @click="managerEditor = !managerEditor">{{ managerEditor ? 'Свернуть' : 'Изменить' }}</button></div><p class="crm-order-manager"><UserRound :size="17" />{{ personName(selected.manager) }}</p><template v-if="managerEditor && canWrite"><p v-if="managerError" class="crm-order-notice crm-order-notice--danger" role="alert">{{ managerError }}</p><div class="crm-order-manager-search"><input v-model="managerSearch" class="crm-input" aria-label="Поиск менеджера" placeholder="Имя или фамилия" maxlength="100" :disabled="saving || managerLoading" @keydown.enter.prevent="loadManagers" /><button type="button" class="crm-button" :disabled="saving || managerLoading" @click="loadManagers">Найти</button></div><p v-if="moreManagers" class="crm-order-muted">Первые 100 сотрудников. Уточните поиск.</p><label class="crm-field">Менеджер<select id="order-manager-select" v-model="managerId" class="crm-input" aria-label="Назначить менеджера" :disabled="saving || managerLoading || dirty"><option value="" :disabled="!canUnassign">Не назначен</option><option v-if="selected.managerId && !managerOptions.some(person => person.id === selected.managerId)" :value="selected.managerId">{{ personName(selected.manager) }} (текущий)</option><option v-for="person in managerOptions" :key="person.id" :value="person.id">{{ personName(person) }}</option></select></label><p v-if="dirty" class="crm-order-muted">Сначала сохраните изменения заказа.</p><button type="button" class="crm-button" :disabled="saving || managerLoading || dirty || (managerId || null) === selected.managerId" @click="assignManager">Сохранить ответственного</button></template><div v-if="selected.execution" class="crm-order-task-facts"><span>Согласовано в CRM</span><strong>{{ date(selected.execution.confirmedAt) }}</strong><span v-if="selected.execution.paymentTerms">Оплата: {{ selected.execution.paymentTerms }}</span></div></section>
          <section class="crm-order-recent"><div class="crm-order-section-heading"><h2>Последние события</h2><button class="crm-button crm-button--text" type="button" @click="detailTab = 'history'">Все</button></div><p v-if="!orderTimeline.length" class="crm-order-muted">История пока пуста</p><ol class="crm-order-timeline"><li v-for="event in orderTimeline.slice(0, 3)" :key="event.id"><time>{{ date(event.createdAt) }}</time><div><strong>{{ event.title }}</strong><p v-if="event.detail">{{ event.detail }}</p></div></li></ol></section>
          <section class="crm-order-documents"><h2>Документы</h2><button class="crm-button" type="button" @click="detailTab = 'execution'"><FileText :size="18" /><span>Данные и документы склада 1С</span><ArrowRight :size="16" /></button><button class="crm-button" v-if="access.can('order_finance.read')" type="button" @click="detailTab = 'finance'"><FileText :size="18" /><span>Расчёты из 1С <small v-if="financeSummary?.snapshot?.documents?.length">{{ financeSummary.snapshot.documents.length }} получено</small></span><ArrowRight :size="16" /></button><p v-if="!warehouse" class="crm-order-muted">Складские документы ещё не получены из 1С.</p></section>
        </aside>
      </div>
    </form>
  </main>
</template>
