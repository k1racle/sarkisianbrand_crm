<script setup lang="ts">
import { Plus, Save, RefreshCw, Shuffle, Pencil, Eye, X, Power, Copy, Gift, History } from '@lucide/vue';

const props = defineProps<{ apiBase: string; token: string; role?: string }>();
const canManageCards = computed(() => ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR'].includes(props.role || ''));
type Card = { id: string; maskedCode: string; faceValue: number | string; balance: number | string; reserved: number | string; issuedAt: string; expiresAt: string; isActive: boolean; revision: number; label?: string };
type ProductDraft = { nameRu: string; descriptionRu: string; denominations: Array<{ key: string; value: string }>; validityDays: string; isActive: boolean; imageUrl: string };
const tab = ref<'product' | 'cards'>('product');
const product = ref<ProductDraft | null>(null);
const productBaseline = ref('');
const cards = ref<Card[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 30;
const search = ref('');
const loading = ref(false);
const busy = ref(false);
const notice = ref('');
const error = ref('');
const issue = ref<{ nominal: string; validityDays: string; code: string; label: string; reason: string } | null>(null);
const cardEditor = ref<{ id: string; maskedCode: string; revision: number; label: string; expiresAt: string; originalExpiresAt: string; isActive: boolean } | null>(null);
const editorBaseline = ref('');
const dialog = ref<{ kind: 'deactivate' | 'reveal' | 'history'; card: Card } | null>(null);
type HistoryItem = { id: string; amount: string | number; status: string; createdAt: string; appliedAt: string | null; releasedAt: string | null; orderNumber: string | null };
type HistoryCard = Pick<Card, 'id' | 'maskedCode' | 'faceValue' | 'balance' | 'reserved' | 'expiresAt' | 'isActive'>;
const historyCard = ref<HistoryCard | null>(null);
const historyItems = ref<HistoryItem[]>([]);
const historyLoading = ref(false);
const historyPage = ref(1);
const historyTotal = ref(0);
const historyLimit = 30;
const historyPageCount = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyLimit)));
let historyVersion = 0;
const historyStatuses: Record<string, string> = { RESERVED: 'Зарезервировано', APPLIED: 'Списано', RELEASED: 'Резерв снят' };
const historyStatus = (value: string) => historyStatuses[value] || 'Неизвестный статус';
const dialogEl = ref<HTMLElement | null>(null);
const secret = ref('');
const revealedForId = ref('');
const editorEl = ref<HTMLElement | null>(null);
const controllers = new Set<AbortController>();
let secretTimer: ReturnType<typeof setTimeout> | undefined;
let loadVersion = 0;
let identityVersion = 0;
let mounted = false;
let previousFocus: HTMLElement | null = null;
let previousOverflow = '';
const productDirty = computed(() => Boolean(product.value && JSON.stringify(product.value) !== productBaseline.value));
const editorDirty = computed(() => Boolean((issue.value || cardEditor.value) && JSON.stringify(issue.value || cardEditor.value) !== editorBaseline.value));
const dirty = computed(() => productDirty.value || editorDirty.value);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const visibleCards = computed(() => cards.value.filter(card => `${card.maskedCode} ${card.label || ''}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const money = (value: unknown) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value: string) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'Не указано';
const localDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};
const status = (card: Card) => !card.isActive ? 'Выключена' : new Date(card.expiresAt).getTime() <= Date.now() ? 'Истекла' : Number(card.balance) <= 0 ? 'Израсходована' : 'Активна';
function failure(caught: any, fallback: string) {
  const code = caught?.statusCode || caught?.response?.status;
  if (code === 401) return 'Сессия завершилась. Войдите в рабочее пространство заново.';
  if (code === 403) return 'Недостаточно прав для управления подарочными картами.';
  if (code === 409) return 'Карта изменена другим сотрудником или такой код уже существует. Обновите список и проверьте сохранённую версию.';
  const raw = caught?.data?.message;
  const text = Array.isArray(raw) ? raw.join('. ') : raw;
  return typeof text === 'string' && /[а-яё]/i.test(text) ? text : fallback;
}
async function request<T>(url: string, options: Record<string, any> = {}) {
  if (!props.token) throw new Error('Необходим вход в рабочее пространство');
  const controller = new AbortController();
  controllers.add(controller);
  try { return await $fetch<T>(url, { baseURL: props.apiBase, headers: { Authorization: `Bearer ${props.token}` }, signal: controller.signal, timeout: 15000, ...options }); }
  finally { controllers.delete(controller); }
}
async function load(force = false) {
  if (busy.value) return;
  if (force && tab.value === 'product' && productDirty.value && !window.confirm('Загрузить сохранённые настройки и отменить локальные изменения?')) return;
  const version = ++loadVersion;
  const currentTab = tab.value;
  loading.value = true; error.value = '';
  try {
    if (currentTab === 'product') {
      const result = await request<any>('/gift-cards/product');
      if (version !== loadVersion) return;
      product.value = { nameRu: result.nameRu || '', descriptionRu: result.descriptionRu || '', denominations: (Array.isArray(result.denominations) ? result.denominations : []).map((value: number, index: number) => ({ key: `saved-${index}`, value: String(value) })), validityDays: String(result.validityDays || 365), isActive: result.isActive === true, imageUrl: result.imageUrl || '' };
      productBaseline.value = JSON.stringify(product.value);
    } else {
      const result = await request<{ items: any[]; total: number }>('/gift-cards', { query: { page: page.value, limit: pageSize } });
      if (version !== loadVersion) return;
      if (!Array.isArray(result.items)) throw new Error('Неверный ответ списка');
      total.value = result.total ?? result.items.length;
      if (page.value > pageCount.value) { page.value = pageCount.value; await load(); return; }
      // Never fall back to raw code: even an accidental API full-code field must stay hidden.
      cards.value = result.items.map(item => ({ id: item.id, maskedCode: item.maskedCode || item.codeMasked || item.codePreview || '••••', faceValue: item.faceValue, balance: item.balance, reserved: item.reserved, issuedAt: item.issuedAt, expiresAt: item.expiresAt, isActive: item.isActive, revision: item.revision, label: item.label || '' }));
    }
  } catch (caught) { if (version === loadVersion) error.value = failure(caught, 'Не удалось загрузить подарочные карты. Обновите список.'); }
  finally { if (version === loadVersion) loading.value = false; }
}
async function selectTab(value: 'product' | 'cards') {
  if (value === 'cards' && !canManageCards.value) return;
  if (busy.value || value === tab.value || (dirty.value && !window.confirm('Перейти в другую вкладку без сохранения изменений?'))) return;
  if (productDirty.value) { product.value = null; productBaseline.value = ''; }
  issue.value = null; cardEditor.value = null; editorBaseline.value = '';
  clearSecret(); tab.value = value; notice.value = ''; error.value = ''; await load();
}
function number(value: string | number, label: string) {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 1000000) throw new Error(`${label}: укажите целое число рублей от 1 до 1 000 000.`);
  return Number(raw);
}
function days(value: string) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 3650) throw new Error('Срок действия: целое число от 1 до 3650 дней.');
  return Number(value);
}
function validityPreset(value: string) { return ['90', '180', '365', '730'].includes(value) ? value : 'custom'; }
function selectValidity(target: { validityDays: string }, value: string) { if (value !== 'custom') target.validityDays = value; else if (validityPreset(target.validityDays) !== 'custom') target.validityDays = '30'; }
function safeImage(value: string) {
  const path = value.trim();
  if (path && (!/^\/(?!\/)/.test(path) || /[\\\s?#]/.test(path))) throw new Error('Для изображения укажите путь локального файла, например /uploads/gift-card.webp.');
  return path;
}
async function saveProduct() {
  if (!product.value || busy.value) return;
  let body: any;
  error.value = ''; notice.value = '';
  try {
    if (!product.value.nameRu.trim()) throw new Error('Введите название подарочной карты.');
    const denominations = product.value.denominations.map(item => number(item.value, 'Номинал'));
    if (!denominations.length) throw new Error('Добавьте хотя бы один номинал.');
    if (new Set(denominations).size !== denominations.length) throw new Error('Номиналы не должны повторяться.');
    body = { nameRu: product.value.nameRu.trim(), descriptionRu: product.value.descriptionRu.trim(), denominations: denominations.sort((a, b) => a - b), validityDays: days(product.value.validityDays), isActive: product.value.isActive, imageUrl: safeImage(product.value.imageUrl) || null };
  } catch (caught: any) { error.value = caught.message || 'Проверьте настройки товара.'; return; }
  busy.value = true;
  const identity = identityVersion;
  try { await request('/gift-cards/product', { method: 'PUT', body }); if (identity !== identityVersion) return; productBaseline.value = JSON.stringify(product.value); notice.value = 'Настройки подарочной карты сохранены.'; }
  catch (caught) { if (identity === identityVersion) error.value = failure(caught, 'Не удалось сохранить настройки подарочной карты.'); }
  finally { if (identity === identityVersion) busy.value = false; }
  if (!error.value && identity === identityVersion) await load();
}
function addDenomination() { if (product.value && !busy.value) product.value.denominations.push({ key: crypto.randomUUID(), value: '' }); }
function closeEditor() { if (!busy.value && (!editorDirty.value || window.confirm('Закрыть редактор без сохранения изменений?'))) { issue.value = null; cardEditor.value = null; editorBaseline.value = ''; } }
async function openEditor(card?: Card) {
  if (!canManageCards.value) return;
  if (busy.value || (editorDirty.value && !window.confirm('Отменить несохранённые изменения?'))) return;
  clearSecret(); error.value = ''; notice.value = '';
  issue.value = card ? null : { nominal: '', validityDays: product.value?.validityDays || '365', code: '', label: '', reason: '' };
  cardEditor.value = card ? { id: card.id, maskedCode: card.maskedCode, revision: card.revision, label: card.label || '', expiresAt: localDate(card.expiresAt), originalExpiresAt: card.expiresAt, isActive: card.isActive } : null;
  editorBaseline.value = JSON.stringify(issue.value || cardEditor.value);
  await nextTick();
  editorEl.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  editorEl.value?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}
async function generate() {
  if (!canManageCards.value) return;
  if (!issue.value || busy.value) return;
  busy.value = true; error.value = '';
  const identity = identityVersion;
  try { const result = await request<{ code: string }>('/gift-cards/generate', { method: 'POST', body: {} }); if (identity === identityVersion && issue.value) issue.value.code = result.code; }
  catch (caught) { if (identity === identityVersion) error.value = failure(caught, 'Не удалось сгенерировать код.'); }
  finally { if (identity === identityVersion) busy.value = false; }
}
async function saveCard() {
  if (!canManageCards.value) return;
  if (busy.value || (!issue.value && !cardEditor.value)) return;
  let body: any;
  error.value = ''; notice.value = '';
  try {
    if (issue.value) {
      if (!issue.value.reason.trim()) throw new Error('Укажите причину ручной выдачи. Она останется в финансовой истории.');
      const code = issue.value.code.trim().toUpperCase();
      if (code && !/^(?:[A-F0-9]-?){31}[A-F0-9]$/.test(code)) throw new Error('Код: 32 символа от 0 до 9 и от A до F; между символами допустим дефис. Используйте генерацию кода.');
      if (issue.value.reason.trim().length > 500) throw new Error('Причина ручной выдачи: не более 500 символов.');
      body = { nominal: number(issue.value.nominal, 'Номинал'), validityDays: days(issue.value.validityDays), label: issue.value.label.trim(), reason: issue.value.reason.trim(), ...(code ? { code } : {}) };
    } else {
      const item = cardEditor.value!;
      if (!item.expiresAt) throw new Error('Укажите дату окончания действия карты.');
      const expiresAt = new Date(item.expiresAt).toISOString();
      if (item.isActive && new Date(expiresAt).getTime() <= Date.now()) throw new Error('Нельзя включить карту с истёкшим сроком. Измените дату окончания.');
      body = { revision: item.revision, isActive: item.isActive, label: item.label.trim(), ...(item.expiresAt !== localDate(item.originalExpiresAt) ? { expiresAt } : {}) };
    }
  } catch (caught: any) { error.value = /[а-яё]/i.test(caught.message) ? caught.message : 'Проверьте срок действия и остальные поля.'; return; }
  busy.value = true;
  const identity = identityVersion;
  const issuing = Boolean(issue.value);
  try {
    // Discard the issuance response: a full code must only be requested explicitly through reveal.
    await request(issuing ? '/gift-cards' : `/gift-cards/${encodeURIComponent(cardEditor.value!.id)}`, { method: issuing ? 'POST' : 'PATCH', body });
    if (identity !== identityVersion) return;
    issue.value = null; cardEditor.value = null; editorBaseline.value = ''; clearSecret();
    notice.value = issuing ? 'Карта выдана. Полный код можно открыть отдельной кнопкой в списке.' : 'Изменения карты сохранены.';
  } catch (caught) { if (identity === identityVersion) error.value = failure(caught, 'Не удалось сохранить карту.'); }
  finally { if (identity === identityVersion) busy.value = false; }
  if (!error.value && identity === identityVersion) await load();
}
function clearSecret() { if (secretTimer) clearTimeout(secretTimer); secretTimer = undefined; secret.value = ''; revealedForId.value = ''; }
function clearHistory() { ++historyVersion; historyCard.value = null; historyItems.value = []; historyLoading.value = false; historyPage.value = 1; historyTotal.value = 0; }
async function loadHistory(targetPage = 1) {
  if (!canManageCards.value || dialog.value?.kind !== 'history' || historyLoading.value) return;
  const cardId = dialog.value.card.id;
  const identity = identityVersion;
  const version = ++historyVersion;
  historyLoading.value = true; historyItems.value = []; error.value = '';
  try {
    const result = await request<{ card: HistoryCard; items: HistoryItem[]; total: number; page: number; limit: number }>(`/gift-cards/${encodeURIComponent(cardId)}/history`, { query: { page: targetPage, limit: historyLimit } });
    if (version !== historyVersion || identity !== identityVersion || dialog.value?.kind !== 'history' || dialog.value.card.id !== cardId) return;
    if (result.card?.id !== cardId || !Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0) throw new Error('Invalid history response');
    // Select only financial fields: never retain raw codes or freeform personal data.
    const card = result.card;
    historyCard.value = { id: card.id, maskedCode: card.maskedCode, faceValue: card.faceValue, balance: card.balance, reserved: card.reserved, expiresAt: card.expiresAt, isActive: card.isActive };
    historyItems.value = result.items.map(item => ({ id: item.id, amount: item.amount, status: item.status, createdAt: item.createdAt, appliedAt: item.appliedAt || null, releasedAt: item.releasedAt || null, orderNumber: item.orderNumber || null }));
    historyTotal.value = result.total; historyPage.value = targetPage;
  } catch (caught) { if (version === historyVersion && identity === identityVersion) error.value = failure(caught, 'Не удалось загрузить историю карты. Попробуйте ещё раз.'); }
  finally { if (version === historyVersion && identity === identityVersion) historyLoading.value = false; }
}
async function openDialog(kind: 'deactivate' | 'reveal' | 'history', card: Card) {
  if (!canManageCards.value) return;
  if (busy.value || dialog.value) return;
  clearSecret(); clearHistory(); error.value = '';
  previousFocus = document.activeElement as HTMLElement; previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden'; dialog.value = { kind, card };
  await nextTick(); dialogEl.value?.querySelector<HTMLButtonElement>('button')?.focus();
  if (kind === 'history') await loadHistory();
}
function closeDialog(force = false) { if (busy.value && !force) return; clearSecret(); clearHistory(); dialog.value = null; document.documentElement.style.overflow = previousOverflow; previousFocus?.focus({ preventScroll: true }); }
async function applyDialog() {
  if (!canManageCards.value) return;
  if (!dialog.value || dialog.value.kind === 'history' || busy.value) return;
  const { kind, card } = dialog.value;
  busy.value = true; error.value = '';
  const identity = identityVersion;
  try {
    if (kind === 'reveal') {
      const result = await request<{ code: string }>(`/gift-cards/${encodeURIComponent(card.id)}/reveal`, { method: 'POST', body: {} });
      if (identity !== identityVersion || dialog.value?.card.id !== card.id) return;
      if (typeof result.code !== 'string' || !result.code) throw new Error('Invalid reveal');
      secret.value = result.code; revealedForId.value = card.id;
      secretTimer = setTimeout(() => clearSecret(), 60000);
    } else {
      await request(`/gift-cards/${encodeURIComponent(card.id)}`, { method: 'PATCH', body: { revision: card.revision, isActive: false } });
      if (identity !== identityVersion) return;
      if (cardEditor.value?.id === card.id) { cardEditor.value = null; editorBaseline.value = ''; }
      notice.value = 'Карта выключена. Баланс и финансовая история сохранены.'; closeDialog(true);
    }
  } catch (caught) { if (identity === identityVersion) error.value = failure(caught, 'Не удалось выполнить действие с картой.'); }
  finally { if (identity === identityVersion) busy.value = false; }
  if (kind === 'deactivate' && !error.value && identity === identityVersion) await load();
}
async function copyCode() { if (!secret.value) return; try { await navigator.clipboard.writeText(secret.value); notice.value = 'Код скопирован. Передавайте его только получателю карты.'; } catch { error.value = 'Браузер не разрешил копирование. Выделите код и скопируйте вручную.'; } }
function dialogKeys(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
  if (event.key !== 'Tab' || !dialogEl.value) return;
  const focusable = [...dialogEl.value.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')];
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
async function changePage(value: number) { if (busy.value || loading.value) return; clearSecret(); page.value = value; await load(); }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
function escapeDialog(event: KeyboardEvent) { if (event.key === 'Escape' && dialog.value) { event.preventDefault(); closeDialog(); } }
onMounted(() => { mounted = true; load(); window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', escapeDialog); });
watch(() => [props.apiBase, props.token, props.role], () => { if (!mounted) return; ++identityVersion; ++loadVersion; controllers.forEach(controller => controller.abort()); busy.value = false; loading.value = false; clearSecret(); if (dialog.value) closeDialog(true); if (!canManageCards.value) tab.value = 'product'; product.value = null; productBaseline.value = ''; cards.value = []; issue.value = null; cardEditor.value = null; editorBaseline.value = ''; page.value = 1; notice.value = ''; error.value = ''; load(); });
onBeforeUnmount(() => { ++identityVersion; ++loadVersion; controllers.forEach(controller => controller.abort()); clearSecret(); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', escapeDialog); if (dialog.value) document.documentElement.style.overflow = previousOverflow; });
onBeforeRouteLeave(() => !dirty.value || window.confirm('Уйти без сохранения настроек подарочных карт?'));
onBeforeRouteUpdate(() => !dirty.value || window.confirm('Перейти в другой раздел без сохранения изменений?'));
defineExpose({ load: () => load(true), busy: computed(() => busy.value || loading.value) });
</script>

<template>
  <section class="sb-gift-admin" aria-label="Управление подарочными картами">
    <nav class="sb-gift-tabs" aria-label="Разделы подарочных карт"><button class="crm-button" :class="{ active: tab === 'product' }" :aria-current="tab === 'product' ? 'page' : undefined" :disabled="busy" @click="selectTab('product')">Товар и номиналы</button><button class="crm-button" v-if="canManageCards" :class="{ active: tab === 'cards' }" :aria-current="tab === 'cards' ? 'page' : undefined" :disabled="busy" @click="selectTab('cards')">Выданные карты</button></nav>
    <p v-if="notice" class="sb-gift-notice" role="status">{{ notice }}</p><p v-if="error && !dialog" class="sb-gift-notice" role="alert">{{ error }}</p>
    <p v-if="loading" class="sb-gift-notice" role="status">Загружаем подарочные карты…</p>
    <form v-if="tab === 'product' && product && !loading" class="sb-gift-product-form" novalidate @submit.prevent="saveProduct">
      <section class="sb-gift-panel sb-gift-form sb-gift-product-block crm-surface" aria-label="Настройки товара подарочной карты">
      <header class="sb-gift-form-head"><div><h3>Подарочная карта в каталоге</h3><small>{{ productDirty ? 'Есть несохранённые изменения' : 'Настройки загружены' }}</small></div></header>
      <fieldset :disabled="busy" class="sb-gift-fields"><label class="sb-gift-field sb-gift-wide"><span>Название товара</span><input class="crm-input" v-model="product.nameRu" maxlength="160" required /></label><label class="sb-gift-field sb-gift-wide"><span>Описание для покупателей</span><textarea class="crm-input" v-model="product.descriptionRu" maxlength="20000" rows="4" /></label><div class="sb-gift-field sb-gift-wide"><AdminMediaPicker v-model="product.imageUrl" :disabled="busy" label="Изображение карты" /></div>

      <label class="sb-gift-field"><span>Срок действия после выдачи</span><select class="crm-input" :value="validityPreset(product.validityDays)" @change="selectValidity(product, ($event.target as HTMLSelectElement).value)"><option value="90">90 дней</option><option value="180">180 дней</option><option value="365">1 год — 365 дней</option><option value="730">2 года — 730 дней</option><option value="custom">Другой срок</option></select></label><label class="sb-gift-field"><span>Срок действия, дней</span><input class="crm-input" v-model="product.validityDays" inputmode="numeric" required /><small>От 1 до 3650 дней. Срок уже выданных карт здесь не меняется.</small></label><label class="sb-gift-checkbox sb-gift-wide"><input class="crm-check" v-model="product.isActive" type="checkbox" /> Подарочная карта продаётся на сайте</label></fieldset>
      </section>
      <section class="sb-gift-panel sb-gift-form sb-gift-denomination-block crm-surface" aria-label="Номиналы подарочной карты"><fieldset :disabled="busy" class="sb-gift-fields">
      <section class="sb-gift-wide sb-gift-denominations"><header class="sb-gift-form-head"><h3>Номиналы, ₽</h3><button type="button" class="sb-gift-button sb-gift-button--white crm-button" :disabled="product.denominations.length >= 30" @click="addDenomination"><Plus :size="18" /> Добавить номинал</button></header><div v-for="(item, index) in product.denominations" :key="item.key" class="sb-gift-denomination"><label class="sb-gift-field"><span>Номинал {{ index + 1 }}, ₽</span><input class="crm-input" v-model="item.value" type="number" inputmode="numeric" min="1" max="1000000" step="1" placeholder="1000" /></label><button type="button" class="sb-gift-icon-button crm-button" :aria-label="`Убрать номинал ${index + 1}`" @click="product.denominations.splice(index, 1)"><X :size="18" /></button></div><small>Целые рубли от 1 до 1 000 000, без повторов. Хотя бы один номинал. Изменения применятся только после сохранения.</small></section>
      </fieldset></section>
      <footer class="sb-gift-actions"><button type="submit" class="sb-gift-button crm-button crm-button--primary" :disabled="busy"><Save :size="18" /> {{ busy ? 'Сохраняем…' : 'Сохранить настройки' }}</button></footer>
    </form>
    <div v-if="tab === 'cards' && canManageCards" class="sb-gift-panel sb-gift-list crm-surface"><header class="sb-gift-list-head"><label class="sb-gift-field"><span>Поиск на текущей странице</span><input class="crm-input" v-model="search" type="search" maxlength="160" placeholder="Код или заметка" /></label><button class="sb-gift-button crm-button crm-button--primary" :disabled="busy || loading" @click="openEditor()"><Plus :size="18" /> Выдать карту</button></header>
      <table v-if="visibleCards.length" class="sb-gift-table"><caption class="sb-gift-sr-only">Выданные карты и их балансы</caption><thead><tr><th>Карта</th><th>Номинал и баланс</th><th>Выдача и срок</th><th>Статус</th><th>Действия</th></tr></thead><tbody><tr v-for="card in visibleCards" :key="card.id"><td data-label="Карта"><div class="sb-gift-cell"><strong>{{ card.maskedCode }}</strong><span v-if="card.label">{{ card.label }}</span><small>Версия {{ card.revision }}</small></div></td><td data-label="Баланс"><div class="sb-gift-cell"><strong>{{ money(card.balance) }}</strong><small>Номинал: {{ money(card.faceValue) }}</small><small>Зарезервировано: {{ money(card.reserved) }}</small></div></td><td data-label="Срок"><div class="sb-gift-cell"><small>Выдана: {{ date(card.issuedAt) }}</small><small>Действует до: {{ date(card.expiresAt) }}</small></div></td><td data-label="Статус"><span class="sb-gift-badge">{{ status(card) }}</span></td><td data-label="Действия"><div class="sb-gift-row-actions"><button class="sb-gift-icon-button crm-button" :disabled="busy" :aria-label="`Редактировать карту ${card.maskedCode}`" title="Редактировать" @click="openEditor(card)"><Pencil :size="18" /></button><button class="sb-gift-icon-button crm-button" :disabled="busy" :aria-label="`Открыть код карты ${card.maskedCode}`" title="Открыть полный код" @click="openDialog('reveal', card)"><Eye :size="18" /></button><button class="sb-gift-button sb-gift-button--white sb-gift-history-button crm-button" :disabled="busy" :aria-label="`История карты ${card.maskedCode}`" @click="openDialog('history', card)"><History :size="18" /> История</button><button v-if="card.isActive" class="sb-gift-icon-button crm-button" :disabled="busy" :aria-label="`Выключить карту ${card.maskedCode}`" title="Выключить с сохранением истории" @click="openDialog('deactivate', card)"><Power :size="18" /></button></div></td></tr></tbody></table>
      <div v-else-if="!loading" class="sb-gift-empty"><Gift :size="32" /><p>{{ search ? 'На этой странице карты не найдены.' : 'Выданных карт пока нет.' }}</p></div>
      <nav v-if="pageCount > 1" class="sb-gift-actions sb-gift-pagination" aria-label="Страницы выданных карт"><button class="sb-gift-button sb-gift-button--white crm-button" :disabled="busy || loading || page === 1" @click="changePage(page - 1)">Назад</button><span>Страница {{ page }} из {{ pageCount }}</span><button class="sb-gift-button sb-gift-button--white crm-button" :disabled="busy || loading || page >= pageCount" @click="changePage(page + 1)">Далее</button></nav>
    </div>
    <form v-if="tab === 'cards' && canManageCards && (issue || cardEditor)" ref="editorEl" class="sb-gift-panel sb-gift-form crm-surface" novalidate @submit.prevent="saveCard"><header class="sb-gift-form-head"><div><h3>{{ issue ? 'Ручная выдача карты' : `Карта ${cardEditor?.maskedCode}` }}</h3><small>{{ editorDirty ? 'Есть несохранённые изменения' : 'Заполните параметры и сохраните' }}</small></div><button type="button" class="sb-gift-icon-button crm-button crm-button--icon" :disabled="busy" aria-label="Закрыть редактор карты" @click="closeEditor"><X :size="20" /></button></header>
      <fieldset :disabled="busy" class="sb-gift-fields"><template v-if="issue"><p class="sb-gift-note sb-gift-wide">Ручная выдача создаёт финансовое обязательство компании. Укажите основание; это не тестовый предпросмотр и не продажа с оплатой.</p><label class="sb-gift-field"><span>Номинал, ₽</span><input class="crm-input" v-model="issue.nominal" type="number" inputmode="numeric" min="1" max="1000000" step="1" placeholder="1000" required /></label><label class="sb-gift-field"><span>Срок действия, дней</span><input class="crm-input" v-model="issue.validityDays" inputmode="numeric" required /></label><label class="sb-gift-field sb-gift-wide"><span>Код карты</span><div class="sb-gift-code-input"><input class="crm-input" v-model="issue.code" maxlength="63" spellcheck="false" autocapitalize="characters" placeholder="Сгенерируется при выдаче" /><button type="button" class="sb-gift-button sb-gift-button--white crm-button" @click="generate"><Shuffle :size="18" /> Сгенерировать</button></div><small>Генерация кода сама по себе не выдаёт карту. Код скрывается после сохранения.</small></label><label class="sb-gift-field sb-gift-wide"><span>Заметка</span><input class="crm-input" v-model="issue.label" maxlength="160" placeholder="Получатель или назначение" /></label><label class="sb-gift-field sb-gift-wide"><span>Причина ручной выдачи</span><textarea class="crm-input" v-model="issue.reason" rows="3" maxlength="500" placeholder="Например, компенсация по согласованию руководителя" required /><small>Обязательное поле для финансовой истории.</small></label></template>
      <template v-else-if="cardEditor"><label class="sb-gift-field sb-gift-wide"><span>Заметка</span><input class="crm-input" v-model="cardEditor.label" maxlength="160" /></label><label class="sb-gift-field"><span>Действует до</span><input class="crm-input" v-model="cardEditor.expiresAt" type="datetime-local" required /></label><label class="sb-gift-checkbox"><input class="crm-check" v-model="cardEditor.isActive" type="checkbox" /> Карта включена</label><p class="sb-gift-note sb-gift-wide">Номинал и баланс не редактируются вручную. Финансовая история не удаляется. Изменения проверяются по версии карты.</p></template></fieldset>
      <footer class="sb-gift-actions"><button type="submit" class="sb-gift-button crm-button crm-button--primary" :disabled="busy"><Save :size="18" /> {{ busy ? 'Сохраняем…' : issue ? 'Выдать карту' : 'Сохранить изменения' }}</button><button type="button" class="sb-gift-button sb-gift-button--white crm-button" :disabled="busy" @click="closeEditor"><X :size="18" /> Отмена</button></footer>
    </form>
    <Teleport to="body"><Transition name="sb-gift-dialog">
      <div v-if="dialog" class="sb-gift-dialog-layer admin-dialog-backdrop" @click.self="closeDialog()" @keydown="dialogKeys">
        <section ref="dialogEl" class="sb-gift-admin sb-gift-panel sb-gift-dialog admin-dialog admin-dialog--modal crm-surface" :class="{ 'sb-gift-dialog--history': dialog.kind === 'history' }" role="dialog" aria-modal="true" aria-labelledby="sb-gift-dialog-title" aria-describedby="sb-gift-dialog-description">
          <header class="sb-gift-form-head">
            <h3 id="sb-gift-dialog-title">{{ dialog.kind === 'history' ? 'История карты' : dialog.kind === 'reveal' ? 'Полный код карты' : 'Выключить карту?' }}</h3>
            <button class="sb-gift-icon-button crm-button crm-button--icon" :disabled="busy" aria-label="Закрыть окно карты" @click="closeDialog()"><X :size="20" /></button>
          </header>
          <p id="sb-gift-dialog-description">{{ dialog.kind === 'history' ? `Карта ${dialog.card.maskedCode}. Резервирование и применение средств по заказам. Только просмотр.` : dialog.kind === 'reveal' ? 'Код даёт доступ к средствам карты. Открывайте его только для передачи получателю. Через минуту код снова скроется.' : `Карта ${dialog.card.maskedCode} будет недоступна для новых применений. Баланс, резервы и история сохранятся.` }}</p>
          <template v-if="dialog.kind === 'history'">
            <dl v-if="historyCard" class="sb-gift-history-summary">
              <div><dt>Номинал</dt><dd>{{ money(historyCard.faceValue) }}</dd></div>
              <div><dt>Баланс</dt><dd>{{ money(historyCard.balance) }}</dd></div>
              <div><dt>Зарезервировано</dt><dd>{{ money(historyCard.reserved) }}</dd></div>
            </dl>
            <p v-if="historyCard" class="sb-gift-history-meta">{{ historyCard.isActive ? 'Карта включена' : 'Карта выключена' }} · Действует до {{ date(historyCard.expiresAt) }}</p>
            <p v-if="historyLoading" class="sb-gift-notice" role="status">Загружаем историю…</p>
            <ol v-else-if="historyItems.length" class="sb-gift-history-list" aria-label="Финансовые операции карты">
              <li v-for="item in historyItems" :key="item.id">
                <div class="sb-gift-history-operation"><strong>{{ money(item.amount) }}</strong><span class="sb-gift-badge">{{ historyStatus(item.status) }}</span></div>
                <p class="sb-gift-history-order">{{ item.orderNumber ? `Заказ № ${item.orderNumber}` : 'Номер заказа не указан' }}</p>
                <dl class="sb-gift-history-times">
                  <div><dt>Создано</dt><dd>{{ date(item.createdAt) }}</dd></div>
                  <div v-if="item.appliedAt"><dt>Списано</dt><dd>{{ date(item.appliedAt) }}</dd></div>
                  <div v-if="item.releasedAt"><dt>Резерв снят</dt><dd>{{ date(item.releasedAt) }}</dd></div>
                </dl>
              </li>
            </ol>
            <p v-else-if="!error" class="sb-gift-notice">Операций по карте пока нет.</p>
            <nav v-if="historyPageCount > 1" class="sb-gift-actions sb-gift-pagination" aria-label="Страницы истории карты">
              <button class="sb-gift-button sb-gift-button--white crm-button" :disabled="historyLoading || historyPage === 1" @click="loadHistory(historyPage - 1)">Назад</button>
              <span>Страница {{ historyPage }} из {{ historyPageCount }}</span>
              <button class="sb-gift-button sb-gift-button--white crm-button" :disabled="historyLoading || historyPage === historyPageCount" @click="loadHistory(historyPage + 1)">Далее</button>
            </nav>
          </template>
          <div v-if="secret && revealedForId === dialog.card.id" class="sb-gift-secret"><code tabindex="0">{{ secret }}</code><button class="sb-gift-button sb-gift-button--white crm-button" @click="copyCode"><Copy :size="18" /> Копировать код</button></div>
          <p v-if="error" class="sb-gift-notice" role="alert">{{ error }}</p>
          <footer class="sb-gift-actions">
            <button v-if="dialog.kind === 'history' && error" class="sb-gift-button sb-gift-button--white crm-button crm-button--refresh" :disabled="historyLoading" @click="loadHistory(historyPage)"><RefreshCw :size="18" /> Повторить</button>
            <button v-if="dialog.kind !== 'history' && !secret" class="sb-gift-button crm-button crm-button--primary" :disabled="busy" @click="applyDialog">{{ busy ? 'Выполняем…' : dialog.kind === 'reveal' ? 'Показать полный код' : 'Выключить карту' }}</button>
            <button class="sb-gift-button sb-gift-button--white crm-button" :disabled="busy" @click="closeDialog()">{{ dialog.kind === 'history' ? 'Закрыть' : secret ? 'Скрыть и закрыть' : 'Отмена' }}</button>
          </footer>
        </section>
      </div>
    </Transition></Teleport>
  </section>
</template>
