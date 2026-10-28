<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, Gift, Package, Plus, RefreshCw, Search, Trash2 } from '@lucide/vue';
import { orderTransfer, warehouseExecution, warehouseFactAt, warehouseNeedsReview, warehouseStatusLabel } from '~/shared/warehouse-execution';

type GiftLine = { variantId: string; quantity: number };
const config = useRuntimeConfig();
const { token, user } = useWorkspaceSession();
const access = useWorkspaceAccess();
const workspace = ref<any>(null), loading = ref(false), saving = ref(false), error = ref(''), notice = ref('');
const creating = ref(false), search = ref('');
const createPanel = ref<HTMLElement | null>(null);
const form = reactive({ participantId: '', recipientName: '', recipientPhone: '', recipientEmail: '', deliveryAddress: '', deliveryService: '', note: '' });
const pendingRequest = ref<{ signature: string; key: string } | null>(null);
const dirty = computed(() => Object.values(form).some(Boolean) || lines.value.some(line => line.variantId || line.quantity !== 1));
function closeCreate() { if (!saving.value && (!dirty.value || window.confirm('Закрыть без создания подарочной отправки?'))) creating.value = false; }
onBeforeRouteLeave(() => !saving.value && (!creating.value || !dirty.value || window.confirm('Уйти без создания подарочной отправки?')));
const lines = ref<GiftLine[]>([{ variantId: '', quantity: 1 }]);
const canCreate = computed(() => access.can('partners.write') && ['ADMIN', 'SUPERVISOR'].includes(user.value?.role || ''));
const products = computed<any[]>(() => workspace.value?.products || []);
function productAvailability(product: any) {
  if (product?.availabilityStatus !== 'CURRENT' || typeof product.available !== 'number') return 'Остатки 1С не подтверждены';
  return product.available > 0 ? `Подтверждено 1С: ${product.available} шт.` : 'Нет в наличии';
}
const availabilityIssue = computed(() => {
  const totals = new Map<string, number>();
  for (const line of lines.value) if (line.variantId) totals.set(line.variantId, (totals.get(line.variantId) || 0) + Number(line.quantity || 0));
  for (const [id, quantity] of totals) {
    const product = products.value.find(item => item.id === id);
    if (product?.availabilityStatus !== 'CURRENT' || typeof product.available !== 'number') return product?.availabilityMessage || 'Остатки 1С не подтверждены. Обновите данные или выберите другую позицию.';
    if (product.available <= 0) return `${product.productName}: нет в наличии.`;
    if (quantity > product.available) return `${product.productName}: подтверждено 1С ${product.available} шт. Уменьшите общее количество этой позиции.`;
  }
  return '';
});
const gifts = computed<any[]>(() => workspace.value?.shipments || []);
const filteredGifts = computed(() => { const query = search.value.trim().toLocaleLowerCase('ru-RU'); return gifts.value.filter(gift => !query || [gift.order.orderNumber, gift.participant.displayName, gift.order.buyerName, ...gift.order.items.map((item: any) => item.productName)].join(' ').toLocaleLowerCase('ru-RU').includes(query)); });
const activeGifts = computed(() => gifts.value.filter(gift => !['DELIVERED','CANCELLED'].includes(gift.order.status)).length);
function openCreate() { creating.value = true; nextTick(() => { createPanel.value?.scrollIntoView({ block: 'start' }); createPanel.value?.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true }); }); }
const statusLabels: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', ASSEMBLING: 'В сборке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён' };
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Moscow' }) : 'Время не передано';
function requestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
function api(path: string, options: any = {}) { return $fetch<any>(`/partners/admin/gifts${path}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 30000, ...options }); }
async function load() { loading.value = true; error.value = ''; try { workspace.value = await api(''); } catch (e: any) { error.value = e?.data?.message || 'Не удалось загрузить подарочные отправки'; } finally { loading.value = false; } }
function addLine() { lines.value.push({ variantId: '', quantity: 1 }); }
function removeLine(index: number) { if (lines.value.length > 1) lines.value.splice(index, 1); }
const orderTotal = (items: any[]) => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
async function createGift() {
  if (saving.value || !canCreate.value) return;
  if (availabilityIssue.value) { error.value = availabilityIssue.value; return; }
  saving.value = true; error.value = ''; notice.value = '';
  try {
    const body = { ...form, items: lines.value.map(line => ({ variantId: line.variantId, quantity: Number(line.quantity) })) };
    const signature = JSON.stringify(body);
    if (pendingRequest.value?.signature !== signature) pendingRequest.value = { signature, key: requestKey() };
    const result = await api('', { method: 'POST', body: { requestKey: pendingRequest.value!.key, ...body } });
    pendingRequest.value = null;
    notice.value = `${result.orderNumber}: подарочная отправка на 0 ₽ подготовлена. Приём заказа, резерв и складское задание ожидают подтверждения 1С.`;
    Object.assign(form, { participantId: '', recipientName: '', recipientPhone: '', recipientEmail: '', deliveryAddress: '', deliveryService: '', note: '' });
    lines.value = [{ variantId: '', quantity: 1 }];
    creating.value = false;
    await load();
  } catch (e: any) { error.value = Array.isArray(e?.data?.message) ? e.data.message.join(' · ') : e?.data?.message || 'Не удалось создать подарочную отправку'; }
  finally { saving.value = false; }
}
onMounted(load);
</script>

<template>
  <main class="partner-gifts crm-standard crm-management-workspace">
    <header class="crm-page-header"><div><h1>Подарки партнёрам</h1><p>Подготовьте получателя и товары. Резерв, сборку и расход подтверждает склад 1С.</p></div><div class="partner-actions"><button type="button" class="crm-button" :disabled="loading || saving" @click="load"><RefreshCw :size="16" :class="{spin:loading}"/> Обновить</button><button v-if="canCreate && !creating" type="button" class="crm-button crm-button--primary" :disabled="loading || !workspace" @click="openCreate"><Plus :size="17"/> Новая отправка</button></div></header>
    <p v-if="error && workspace" class="gift-feedback gift-error" role="alert">{{ error }}</p><p v-if="notice" class="gift-feedback gift-notice" role="status">{{ notice }}</p>
    <section v-if="creating && canCreate" ref="createPanel" class="gift-create crm-surface" aria-labelledby="gift-create-title">
      <header class="gift-create-header"><button type="button" class="crm-button" :disabled="saving" @click="closeCreate"><ArrowLeft :size="16"/> К отправкам</button><div><h2 id="gift-create-title">Новая подарочная отправка</h2><p>Подготовьте заказ на 0 ₽ для передачи в 1С. Резерв и задание на склад появятся после подтверждения 1С.</p></div></header>
      <form class="gift-form" @submit.prevent="createGift">
        <fieldset :disabled="saving" class="gift-form-section gift-wide"><legend>Получатель</legend><div class="gift-form-grid">
          <label class="gift-wide">Партнёр<select aria-label="Партнёр" v-model="form.participantId" class="crm-input" required><option value="" disabled>Выберите партнёра</option><option v-for="person in workspace?.participants" :key="person.id" :value="person.id">{{ person.displayName }} · {{ person.code }}</option></select></label>
          <label>Имя получателя<input v-model.trim="form.recipientName" class="crm-input" autocomplete="name" maxlength="180" required placeholder="Кому отправляем"/></label>
          <label>Телефон<input v-model.trim="form.recipientPhone" class="crm-input" type="tel" autocomplete="tel" maxlength="40" required placeholder="+7 …"/></label>
          <label class="gift-wide">Email получателя<input v-model.trim="form.recipientEmail" class="crm-input" type="email" autocomplete="email" maxlength="180" placeholder="Необязательно"/></label>
        </div></fieldset>
        <fieldset :disabled="saving" class="gift-form-section gift-wide"><legend>Доставка</legend><div class="gift-form-grid">
          <label class="gift-wide">Адрес доставки<textarea v-model.trim="form.deliveryAddress" class="crm-input" rows="3" minlength="10" maxlength="500" required placeholder="Город, улица, дом, квартира или адрес пункта выдачи"/></label>
          <label>Служба доставки<input v-model.trim="form.deliveryService" class="crm-input" maxlength="100" placeholder="Например, СДЭК"/></label>
          <label>Комментарий<input v-model.trim="form.note" class="crm-input" maxlength="1000" placeholder="Повод или пожелания к отправке"/></label>
        </div></fieldset>
        <div class="gift-lines gift-wide"><div class="gift-lines-heading"><div><h3>Состав подарка</h3><p>Укажите товары и количество. Возможность резерва подтвердит 1С.</p></div><button class="crm-button" type="button" @click="addLine"><Plus :size="15"/> Добавить товар</button></div>
          <div v-for="(line,index) in lines" :key="index" class="gift-line"><label>Товар и вариант<select aria-label="Товар и вариант" v-model="line.variantId" class="crm-input" required><option value="" disabled>Выберите товар</option><option v-for="item in products" :key="item.id" :value="item.id">{{ item.productName }} · {{ item.variantName }} · {{ item.sku }} · {{ productAvailability(item) }}</option></select></label><label>Количество<input v-model.number="line.quantity" class="crm-input" type="number" min="1" max="100" required/></label><div class="gift-line-availability">{{ line.variantId ? productAvailability(products.find(item => item.id === line.variantId)) : 'Выберите позицию' }}</div><button class="crm-button crm-button--icon" type="button" :disabled="lines.length===1" :aria-label="'Удалить позицию '+(index+1)" @click="removeLine(index)"><Trash2 :size="16"/></button></div>
        </div>
        <p v-if="availabilityIssue" class="gift-empty-note gift-wide" role="status">{{ availabilityIssue }}</p><div class="gift-submit gift-wide"><div><strong>Итого для получателя: 0 ₽ · оплата не требуется</strong><span>Расход оформляется в 1С. Документ и результат обработки появятся после подтверждения.</span></div><button type="submit" class="crm-button crm-button--primary" :disabled="saving || !workspace?.participants?.length || !products.length || !!availabilityIssue"><Gift :size="16"/> {{ saving ? 'Подготавливаем…' : 'Подготовить отправку' }}</button></div>
      </form>
      <p v-if="!workspace?.participants?.length && !loading" class="gift-empty-note">Нет активных партнёров, которым можно оформить отправку.</p>
      <p v-if="!products.length && !loading" class="gift-empty-note">В каталоге нет доступных физических товаров.</p>
    </section>

    <template v-else>
      <section v-if="workspace" class="gift-overview" aria-label="Сводка подарочных отправок"><div><span>Всего отправок</span><strong>{{gifts.length}}</strong></div><div><span>Не завершены</span><strong>{{activeGifts}}</strong></div><p><Package :size="19"/><span>Приём заказа, резерв и складские документы показаны по подтверждениям 1С.</span></p></section>
      <section class="gift-history crm-surface" aria-labelledby="gift-history-title">
        <header v-if="workspace" class="gift-history-head"><div><h2 id="gift-history-title">Подарочные отправки <span class="gift-count">{{gifts.length}}</span></h2><p>Найдите подарок по партнёру, номеру заказа или товару.</p></div><label class="gift-search crm-input-group"><Search :size="17"/><input v-model="search" class="crm-input" type="search" placeholder="Поиск отправки" aria-label="Поиск подарочных отправок"/></label></header>
        <div v-if="loading && !workspace" class="gift-empty" role="status"><RefreshCw :size="24" class="spin"/><p>Загружаем отправки…</p></div>
        <div v-else-if="error && !workspace" class="gift-empty crm-management-error" role="alert"><Gift :size="32"/><h3>Отправки недоступны</h3><p>{{error}}</p><button type="button" class="crm-button" @click="load"><RefreshCw :size="16"/> Повторить загрузку</button></div>
        <div v-else-if="!filteredGifts.length" class="gift-empty"><Gift :size="32"/><h3>{{search?'Отправки не найдены':'Подготовьте первый подарок'}}</h3><p>{{search?'Попробуйте имя партнёра, номер заказа или название товара.':'Выберите партнёра и товары. Статусы склада появятся после подтверждения заказа в 1С.'}}</p><button v-if="search" type="button" class="crm-button" @click="search=''">Сбросить поиск</button><button v-else-if="canCreate" type="button" class="crm-button" @click="openCreate"><Plus :size="16"/> Новая отправка</button></div>
        <article v-for="gift in filteredGifts" :key="gift.id" class="gift-card"><div class="gift-card-main"><div class="gift-card-heading"><strong>{{ gift.order.orderNumber }}</strong><span class="gift-status" :data-status="gift.order.status">{{ statusLabels[gift.order.status] || gift.order.status }}</span></div><h3>{{gift.participant.displayName}}</h3><p>{{gift.order.buyerName}} · {{gift.participant.code}}</p><ul><li v-for="item in gift.order.items" :key="item.id">{{ item.productName }} · {{ item.variantName }} <b>{{ item.quantity }} шт.</b></li></ul><small>{{ date(gift.createdAt) }} · {{orderTotal(gift.order.items)}} шт. · 0 ₽</small></div><div class="gift-card-side"><span :class="['gift-sync', { 'is-synced': gift.order.isSynced1C && !gift.order.oneCSyncError }]">{{ orderTransfer(gift.order).label }}</span><small>Оплата не требуется · подарок партнёру</small><small v-if="warehouseExecution(gift.order)">{{ warehouseExecution(gift.order)?.isCurrent === false ? 'Исторический статус склада' : 'Склад 1С' }}: {{ warehouseStatusLabel(warehouseExecution(gift.order)?.status) }}</small><small v-else>Подтверждённые складские данные ещё не получены.</small><small v-if="warehouseFactAt(gift.order)">Данные на {{ date(warehouseFactAt(gift.order)!) }}</small><small v-if="warehouseNeedsReview(gift.order)" class="gift-sync-error">{{ warehouseExecution(gift.order)?.isCurrent === false ? 'Требуется новое подтверждение склада: прежние данные относятся к прошлой версии заказа или устарели.' : warehouseExecution(gift.order)?.error || 'Складское исполнение требует проверки.' }}</small><small v-if="warehouseExecution(gift.order)?.documentNumber || warehouseExecution(gift.order)?.documentId || gift.order.warehouseDocumentId" class="gift-warehouse-document">Документ 1С: {{ warehouseExecution(gift.order)?.documentNumber || warehouseExecution(gift.order)?.documentId || gift.order.warehouseDocumentId }}</small><small v-if="gift.order.oneCSyncError" class="gift-sync-error">{{ gift.order.oneCSyncError }}</small><NuxtLink class="crm-button" :to="'/crm/fulfillment?order='+encodeURIComponent(gift.order.id)">Монитор склада 1С <ArrowUpRight :size="15"/></NuxtLink></div></article>
      </section>
    </template>
  </main>
</template>
