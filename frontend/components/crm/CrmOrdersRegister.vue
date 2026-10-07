<script setup lang="ts">
import { ArrowLeft, ArrowRight, PackageCheck, RefreshCw, Search, UserRound, X } from '@lucide/vue';
const props = withDefaults(defineProps<{ fulfillment?: boolean }>(), { fulfillment: false });
const source = ref('B2B'), needsReview = ref(false);
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
const hasFilters = computed(() => Boolean(search.value || status.value || needsReview.value));
function resetFilters() { search.value = ''; status.value = ''; needsReview.value = false; }
const draft = reactive({ status: '', trackingNumber: '', internalNotes: '', comment: '' });
const baseline = ref(''), dirty = computed(() => !!selected.value && JSON.stringify(draft) !== baseline.value);
const detailLoaded = ref(false);
const detailTab = ref('general'), detailBody = ref<HTMLElement | null>(null);
const detailTabs = computed<ReadonlyArray<readonly [string, string]>>(() => [
  ['general', 'Основное'], ['items', 'Состав'], ['execution', 'Сборка и возвраты'],
  ...(access.can('order_finance.read') ? [['finance', 'Расчёты 1С'] as const] : []), ['history', 'История'],
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
const transitions: Record<string, string[]> = { NEW: ['CONFIRMED', 'PAYMENT_WAITING', 'PAID', 'CANCELLED'], CONFIRMED: ['PAYMENT_WAITING', 'PAID', 'ASSEMBLING', 'CANCELLED'], PAYMENT_WAITING: ['PAID', 'CANCELLED'], PAID: ['ASSEMBLING'], ASSEMBLING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'] };
const availableStatuses = computed(() => {
  const order = selected.value;
  if (!order) return [];
  if (order.fulfillmentManaged) {
    if (order.status === 'SHIPPED') return order.items?.some((item: any) => item.cancelledQuantity > 0 || item.returnedQuantity > 0) && !order.closure?.allowed ? [] : ['DELIVERED'];
    if (order.items.some((item: any) => item.cancelledQuantity > 0 || item.returnedQuantity > 0)) return [];
    if (order.items.some((item: any) => item.shippedQuantity > 0) || ['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(order.status)) return [];
    return [];
  }
  return (transitions[order.status] || []).filter(value => !(order.source === 'B2B' && (['PAID', 'REFUNDED'].includes(value) || (order.reservationState === 'ACTIVE' && ['ASSEMBLING', 'SHIPPED'].includes(value)))));
});
const amount = (value: any) => Number(value || 0).toLocaleString('ru-RU') + ' ₽';
const company = (order: any) => order.organization?.name || order.buyerName || [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || 'Компания не указана';
const date = (value: string) => new Date(value).toLocaleString('ru-RU');
const message = (e: any) => e?.data?.message || 'Не удалось выполнить действие. Повторите попытку.';
const request = (path: string, options: any = {}) => $fetch<any>(path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, ...options });
let version = 0, controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
async function load() {
  const current = ++version; controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  try {
    const result = await request('/oms/orders/list', { signal: controller.signal, query: { needsReview: needsReview.value ? 'true' : undefined, source: source.value, page: page.value, limit: 30, status: status.value || undefined, search: search.value.trim() || undefined } });
    if (current !== version) return;
    rows.value = result.items; total.value = result.total; pages.value = result.pages;
  } catch (e: any) { if (current === version) error.value = message(e); }
  finally { if (current === version) loading.value = false; }
}
function setOrder(order: any) {
  selected.value = order;
  managerId.value = order.managerId || '';
  Object.assign(draft, { status: order.status, trackingNumber: order.trackingNumber || '', internalNotes: order.internalNotes || '', comment: '' });
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
function close() { if (leave()) selected.value = null; }
const { panel, keyboard } = useCatalogDialog(computed(() => !!selected.value), close);
async function save() {
  if (saving.value || !canWrite.value || !dirty.value) return;
  if (draft.status === 'CANCELLED' && draft.status !== selected.value.status) {
    if (!draft.comment.trim()) { detailError.value = 'Укажите причину отмены в комментарии к изменению.'; return; }
    if (!window.confirm('Отменить заказ и снять резерв товаров?')) return;
  }
  saving.value = true; detailError.value = '';
  try {
    await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`, { method: 'PATCH', body: { ...draft, expectedUpdatedAt: selected.value.updatedAt } });
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
    <header class="crm-page-header"><div><h1>{{ props.fulfillment ? 'Сборка и отгрузка' : 'Заказы B2B' }}</h1><p>{{ props.fulfillment ? 'Комплектация, отгрузка и контроль исполнения заказов' : 'Заказы партнёров: от подтверждения до доставки' }}</p></div><button v-if="registerTab === 'orders'" class="crm-button crm-button--refresh" :disabled="loading || saving" @click="load"><RefreshCw :size="18" />Обновить</button></header>
    <div class="crm-directory-content">
      <CrmCardTabs v-if="registerTabs.length > 1" v-model="registerTab" prefix="orders-register" :tabs="registerTabs" label="Разделы заказов B2B" />
      <section id="orders-register-orders-panel" v-show="registerTab === 'orders'" class="crm-surface crm-directory-register" role="tabpanel" :aria-labelledby="registerTabs.length > 1 ? 'orders-register-orders-tab' : undefined" aria-label="Реестр заказов">
        <div class="crm-directory-register-heading"><h2>Реестр заказов <span>{{ total }}</span></h2><small>Новые заказы сверху</small></div>
        <nav class="crm-directory-tabs" aria-label="Быстрые фильтры заказов"><button v-for="[value, label] in quickStatuses" :key="value" class="crm-button" :aria-pressed="status === value" @click="status = value">{{ label }}</button></nav>
        <div class="crm-directory-toolbar">
          <select v-if="props.fulfillment" v-model="source" class="crm-input" aria-label="Источник заказа"><option value="B2B">B2B</option><option value="WEB">Сайт</option><option value="OZON">Ozon</option><option value="WILDBERRIES">Wildberries</option><option value="YANDEX_MARKET">Яндекс Маркет</option><option value="MEGAMARKET">Мегамаркет</option></select>
          <div class="crm-input-group crm-directory-search"><Search :size="18" aria-hidden="true" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск B2B-заказов" placeholder="Номер заказа, компания, ИНН или email" maxlength="200" /><button v-if="search" class="crm-directory-clear" aria-label="Очистить поиск" @click="search = ''"><X :size="16" /></button></div>
          <select v-model="status" class="crm-input" aria-label="Статус заказа"><option value="">Все статусы</option><option v-for="(label, key) in names" :key="key" :value="key">{{ label }}</option></select>
          <button v-if="hasFilters" class="crm-button crm-button--text" @click="resetFilters"><X :size="16" /> Сбросить</button>
        </div>
        <label v-if="props.fulfillment" class="crm-orders-review-filter"><input v-model="needsReview" type="checkbox" /> Только расхождения с площадкой</label>
        <p v-if="error" class="crm-orders-error" role="alert">{{ error }}</p>
        <div v-if="rows.length" class="crm-directory-columns crm-orders-columns" aria-hidden="true"><span>Заказ</span><span>Компания и менеджер</span><span>Статус и обмен с 1С</span><span>Сумма заказа</span><span /></div>
        <div class="crm-directory-rows" :aria-busy="loading">
          <button v-for="order in rows" :key="order.id" class="crm-button crm-card-action crm-directory-row crm-orders-row" :disabled="saving" @click="open(order)">
            <span class="crm-directory-stack"><strong>{{ order.orderNumber }}</strong><small>{{ date(order.createdAt) }}</small><small>Позиций: {{ order.items?.length || 0 }}</small></span>
            <span class="crm-directory-stack"><strong>{{ company(order) }}</strong><small>{{ order.organization?.inn ? 'ИНН ' + order.organization.inn : order.buyerEmail || order.user?.email }}</small><span class="crm-directory-icon-line" :class="{ 'crm-directory-unassigned': !order.manager }"><UserRound :size="15" aria-hidden="true" /><small>{{ personName(order.manager) }}</small></span></span>
            <span class="crm-directory-stack"><span class="crm-badge" :data-status="order.status">{{ names[order.status] || order.status }}</span><small>{{ order.isSynced1C ? 'Обмен с 1С подтверждён' : 'Обмен с 1С не подтверждён' }}</small><small v-if="order.marketplaceImportIssue" class="crm-orders-attention">Есть расхождение с площадкой</small></span>
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
    </div>    <Teleport to="body"><div v-if="selected" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="b2b-order-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>ЗАКАЗ {{ selected.source === 'WEB' ? 'САЙТА' : selected.source }}</p><h2 id="b2b-order-title">{{ selected.orderNumber }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть заказ" :disabled="saving" @click="close"><X :size="18" /></button></header>
      <CrmCardTabs v-model="detailTab" prefix="order-detail" :tabs="detailTabs" label="Разделы заказа" />
      <div ref="detailBody" class="admin-dialog-body crm-detail-body crm-stack"><p v-if="detailError" role="alert">{{ detailError }}</p>
       <section id="order-detail-general-panel" role="tabpanel" aria-labelledby="order-detail-general-tab" :hidden="detailTab !== 'general'" :inert="detailTab !== 'general'" class="crm-order-tab-panel">
        <div><strong>{{ company(selected) }}</strong><p>{{ selected.user?.email }} · {{ amount(selected.finalAmount) }}</p></div>
        <section class="crm-stack" aria-label="Ответственный менеджер">
          <h3>Ответственный менеджер</h3><p>{{ personName(selected.manager) }}</p>
          <template v-if="canWrite">
            <p v-if="managerError" role="alert">{{ managerError }}</p>
            <div class="crm-toolbar crm-manager-search"><input v-model="managerSearch" class="crm-input" aria-label="Поиск менеджера" placeholder="Имя или фамилия" maxlength="100" :disabled="saving || managerLoading" @keydown.enter.prevent="loadManagers" /><button type="button" class="crm-button" :disabled="saving || managerLoading" @click="loadManagers">Найти</button></div>
            <p v-if="moreManagers">Показаны первые 100 сотрудников. Уточните поиск.</p>
            <label class="crm-field">Назначить менеджера<select v-model="managerId" class="crm-input" aria-label="Назначить менеджера" :disabled="saving || managerLoading || dirty"><option value="" :disabled="!canUnassign">Не назначен</option><option v-if="selected.managerId && !managerOptions.some(person => person.id === selected.managerId)" :value="selected.managerId">{{ personName(selected.manager) }} (текущий)</option><option v-for="person in managerOptions" :key="person.id" :value="person.id">{{ personName(person) }}</option></select></label>
            <p v-if="dirty">Сначала сохраните изменения заказа.</p>
            <button type="button" class="crm-button" :disabled="saving || managerLoading || dirty || (managerId || null) === selected.managerId" @click="assignManager">Сохранить ответственного</button>
          </template>
        </section>
        <p v-if="selected.marketplaceImportIssue" role="alert">{{ selected.marketplaceImportIssue }}</p><p>Обмен с 1С: {{ selected.isSynced1C ? 'подтверждён' : 'не подтверждён' }}</p>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || !canWrite"><label class="crm-field">Статус<select v-model="draft.status" class="crm-input"><option v-for="value in [selected.status, ...availableStatuses]" :key="value" :value="value">{{ names[value] || value }}</option></select></label><label class="crm-field">Трек-номер<input v-model="draft.trackingNumber" class="crm-input" maxlength="200" /></label><label class="crm-field">Внутренняя заметка<textarea v-model="draft.internalNotes" class="crm-input" rows="3" maxlength="5000" /></label><label class="crm-field">Комментарий к изменению<input v-model="draft.comment" class="crm-input" maxlength="1000" /></label></fieldset>
       </section>
       <section id="order-detail-items-panel" role="tabpanel" aria-labelledby="order-detail-items-tab" :hidden="detailTab !== 'items'" :inert="detailTab !== 'items'" class="crm-order-tab-panel">
        <h3>Состав заказа</h3><div v-for="item in selected.items" :key="item.id" class="crm-item-card crm-record"><span><strong>{{ item.productName }}</strong><small>{{ item.variantName }}</small></span><span>{{ item.quantity }} × {{ amount(item.price) }}</span><strong>{{ amount(item.total) }}</strong></div>
       </section>
       <section id="order-detail-execution-panel" role="tabpanel" aria-labelledby="order-detail-execution-tab" :hidden="detailTab !== 'execution'" :inert="detailTab !== 'execution'" class="crm-order-tab-panel">
        <CrmOrderExecution :key="selected.id" :order="selected" :disabled="saving || !canWrite || dirty" :reload="reloadSelected" @busy="saving = $event" />
       </section>
       <section v-if="access.can('order_finance.read')" id="order-detail-finance-panel" role="tabpanel" aria-labelledby="order-detail-finance-tab" :hidden="detailTab !== 'finance'" :inert="detailTab !== 'finance'" class="crm-order-tab-panel">
        <CrmOrderFinance :key="selected.id" :order="selected" :disabled="saving || !canWrite || dirty" :has-unsaved-changes="dirty" :reload="reloadSelected" @busy="saving = $event" />
       </section>
       <section id="order-detail-history-panel" role="tabpanel" aria-labelledby="order-detail-history-tab" :hidden="detailTab !== 'history'" :inert="detailTab !== 'history'" class="crm-order-tab-panel">
        <h3>История заказа</h3><p v-if="!selected.history?.length">Изменений статуса пока нет.</p><div v-for="event in selected.history" :key="event.id" class="crm-item-card crm-record"><span><strong>{{ names[event.toStatus] || event.toStatus }}</strong><small>{{ date(event.createdAt) }}</small><p v-if="event.comment">{{ event.comment }}</p></span></div>
       </section>
      </div><footer class="crm-detail-footer"><button type="button" class="crm-button crm-button--icon" aria-label="Обновить карточку" title="Обновить карточку" :disabled="saving" @click="refreshSelected"><RefreshCw :size="18" /></button><span>{{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}</span><button v-if="canWrite" class="crm-button crm-button--primary" type="submit" :disabled="saving || !dirty">{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
