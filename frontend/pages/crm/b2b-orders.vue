<script setup lang="ts">
import { ArrowLeft, ArrowRight, PackageCheck, RefreshCw, Search, X } from '@lucide/vue';
useHead({ title: 'Заказы B2B — SARKISIAN CRM' });
const config = useRuntimeConfig(), session = useWorkspaceSession(), access = useWorkspaceAccess();
const rows = ref<any[]>([]), total = ref(0), pages = ref(1), page = ref(1), search = ref(''), status = ref('');
const loading = ref(false), saving = ref(false), error = ref(''), detailError = ref(''), selected = ref<any>(null);
const draft = reactive({ status: '', trackingNumber: '', internalNotes: '', comment: '' });
const baseline = ref(''), dirty = computed(() => !!selected.value && JSON.stringify(draft) !== baseline.value);
const canWrite = computed(() => access.can('oms.write'));
const names: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплаты', PAID: 'Оплачен', ASSEMBLING: 'В сборке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const transitions: Record<string, string[]> = { NEW: ['CONFIRMED', 'PAYMENT_WAITING', 'PAID', 'CANCELLED'], CONFIRMED: ['PAYMENT_WAITING', 'PAID', 'ASSEMBLING', 'CANCELLED'], PAYMENT_WAITING: ['PAID', 'CANCELLED'], PAID: ['ASSEMBLING', 'REFUNDED'], ASSEMBLING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'REFUNDED'], DELIVERED: ['REFUNDED'] };
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
    const result = await request('/oms/orders/list', { signal: controller.signal, query: { source: 'B2B', page: page.value, limit: 30, status: status.value || undefined, search: search.value.trim() || undefined } });
    if (current !== version) return;
    rows.value = result.items; total.value = result.total; pages.value = result.pages;
  } catch (e: any) { if (current === version) error.value = message(e); }
  finally { if (current === version) loading.value = false; }
}
function setOrder(order: any) {
  selected.value = order;
  Object.assign(draft, { status: order.status, trackingNumber: order.trackingNumber || '', internalNotes: order.internalNotes || '', comment: '' });
  baseline.value = JSON.stringify(draft);
}
async function open(order: any) {
  if (saving.value || !leave()) return;
  detailError.value = ''; setOrder(order); saving.value = true;
  try { setOrder(await request(`/oms/orders/${encodeURIComponent(order.id)}`)); }
  catch (e: any) { detailError.value = message(e); }
  finally { saving.value = false; }
}
function leave() { return !saving.value && (!dirty.value || window.confirm('Изменения заказа не сохранены. Выйти без сохранения?')); }
function close() { if (leave()) selected.value = null; }
const { panel, keyboard } = useCatalogDialog(computed(() => !!selected.value), close);
async function save() {
  if (saving.value || !canWrite.value || !dirty.value) return;
  if (['CANCELLED', 'REFUNDED'].includes(draft.status) && draft.status !== selected.value.status && !window.confirm('Подтвердить отмену или возврат заказа? Остатки и связанные операции обработает сервер.')) return;
  saving.value = true; detailError.value = '';
  try {
    await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`, { method: 'PATCH', body: { ...draft } });
    setOrder(await request(`/oms/orders/${encodeURIComponent(selected.value.id)}`)); await load();
  } catch (e: any) { detailError.value = message(e); }
  finally { saving.value = false; }
}
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load(); }, 300); });
watch(status, () => { page.value = 1; load(); });
function turn(delta: number) { page.value += delta; load(); }
function unload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { load(); window.addEventListener('beforeunload', unload); });
onBeforeUnmount(() => { ++version; controller?.abort(); clearTimeout(timer); window.removeEventListener('beforeunload', unload); });
onBeforeRouteLeave(leave);
</script>

<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Заказы B2B</h1><p>Закупки компаний: состав, оплата, доставка и история обработки.</p></div><button class="crm-button crm-button--refresh" :disabled="loading || saving" @click="load"><RefreshCw :size="18" />Обновить</button></header>
    <p v-if="error" role="alert">{{ error }}</p>
    <section class="crm-surface crm-register">
      <div class="crm-toolbar">
        <label class="crm-input-group"><Search :size="18" /><input v-model="search" class="crm-input" type="search" aria-label="Поиск B2B-заказов" placeholder="Номер, компания, ИНН или email" maxlength="200" /></label>
        <select v-model="status" class="crm-input" aria-label="Статус заказа"><option value="">Все статусы</option><option v-for="(label, key) in names" :key="key" :value="key">{{ label }}</option></select>
        <span role="status">{{ loading ? 'Загрузка…' : `Найдено: ${total}` }}</span>
      </div>
      <div class="crm-record-list" :aria-busy="loading"><button v-for="order in rows" :key="order.id" class="crm-button crm-card-action crm-item-card crm-record" @click="open(order)"><span><strong>{{ order.orderNumber }}</strong><small>{{ date(order.createdAt) }}</small></span><span><strong>{{ company(order) }}</strong><small>{{ order.organization?.inn ? `ИНН ${order.organization.inn}` : order.user?.email }}</small></span><span><strong>{{ amount(order.finalAmount) }}</strong><span class="crm-badge" :data-status="order.status">{{ names[order.status] || order.status }}</span></span><ArrowRight :size="18" /></button></div>
      <div v-if="!loading && !rows.length" class="crm-empty"><PackageCheck :size="28" /><h2>Заказов пока нет</h2><p>{{ search || status ? 'Попробуйте изменить фильтры.' : 'Здесь появятся закупки из кабинетов B2B-клиентов.' }}</p></div>
      <footer class="crm-pagination"><button class="crm-button crm-button--icon" aria-label="Предыдущая страница" :disabled="page <= 1 || loading" @click="turn(-1)"><ArrowLeft :size="18" /></button><span>{{ page }} / {{ pages }}</span><button class="crm-button crm-button--icon" aria-label="Следующая страница" :disabled="page >= pages || loading" @click="turn(1)"><ArrowRight :size="18" /></button></footer>
    </section>
    <Teleport to="body"><div v-if="selected" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="b2b-order-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>ЗАКАЗ B2B</p><h2 id="b2b-order-title">{{ selected.orderNumber }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть заказ" :disabled="saving" @click="close"><X :size="18" /></button></header>
      <div class="admin-dialog-body crm-detail-body crm-stack"><p v-if="detailError" role="alert">{{ detailError }}</p><div><strong>{{ company(selected) }}</strong><p>{{ selected.user?.email }} · {{ amount(selected.finalAmount) }}</p></div>
        <h3>Состав заказа</h3><div v-for="item in selected.items" :key="item.id" class="crm-item-card crm-record"><span><strong>{{ item.productName }}</strong><small>{{ item.variantName }}</small></span><span>{{ item.quantity }} × {{ amount(item.price) }}</span><strong>{{ amount(item.total) }}</strong></div>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || !canWrite"><label class="crm-field">Статус<select v-model="draft.status" class="crm-input"><option v-for="value in [selected.status, ...(transitions[selected.status] || [])]" :key="value" :value="value">{{ names[value] || value }}</option></select></label><label class="crm-field">Трек-номер<input v-model="draft.trackingNumber" class="crm-input" maxlength="200" /></label><label class="crm-field">Внутренняя заметка<textarea v-model="draft.internalNotes" class="crm-input" rows="3" maxlength="5000" /></label><label class="crm-field">Комментарий к изменению<input v-model="draft.comment" class="crm-input" maxlength="1000" /></label></fieldset>
        <h3>История статусов</h3><div v-for="event in selected.history" :key="event.id" class="crm-item-card crm-record"><span><strong>{{ names[event.toStatus] || event.toStatus }}</strong><small>{{ date(event.createdAt) }}</small><p v-if="event.comment">{{ event.comment }}</p></span></div>
      </div><footer class="crm-detail-footer"><span>{{ dirty ? 'Есть несохранённые изменения' : 'Изменения сохранены' }}</span><button v-if="canWrite" class="crm-button crm-button--primary" type="submit" :disabled="saving || !dirty">{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
