<script setup lang="ts">
import { Plus, RefreshCw, Save, Shuffle, Pencil, Trash2, X, Power, Search, Ticket } from '@lucide/vue';

const props = defineProps<{ apiBase: string; token: string }>();
type Promo = { code: string; title: string; discountType: 'PERCENT' | 'FIXED'; amount: number | string; minimumAmount?: number | string; maximumDiscount?: number | string | null; usageLimit?: number | null; perCustomerLimit?: number | null; isActive: boolean; startsAt?: string | null; endsAt?: string | null; revision: number; usageCount?: number; reservedCount?: number; appliedCount?: number };
type Draft = { code: string; title: string; discountType: 'PERCENT' | 'FIXED'; amount: string; minimumAmount: string; maximumDiscount: string; usageLimit: string; perCustomerLimit: string; startsAt: string; endsAt: string; isActive: boolean; revision?: number; existing: boolean };
const items = ref<Promo[]>([]);
const search = ref('');
const statusFilter = ref('all');
const loading = ref(false);
const busy = ref(false);
const loaded = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 50;
let loadVersion = 0;
let filterTimer: ReturnType<typeof setTimeout> | undefined;
const notice = ref('');
const error = ref('');
const draft = ref<Draft | null>(null);
const baseline = ref('');
const formEl = ref<HTMLElement | null>(null);
const dialogEl = ref<HTMLElement | null>(null);
const confirmation = ref('');
const action = ref<{ kind: 'delete' | 'deactivate'; item: Promo } | null>(null);
let previousFocus: HTMLElement | null = null;
let previousOverflow = '';
let mounted = false;
const requests = new Set<AbortController>();
const dirty = computed(() => draft.value !== null && JSON.stringify(draft.value) !== baseline.value);
const filtered = computed(() => items.value);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const money = (value: unknown) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(Number(value || 0));
const uses = (item: Promo) => Math.max(Number((item as any).historyCount || 0), Number(item.usageCount || 0), Number(item.reservedCount || 0) + Number(item.appliedCount || 0));
function localDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function displayDate(value?: string | null) { return value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'Не ограничено'; }
function promoStatus(item: Promo) {
  if (!item.isActive) return 'Выключен';
  if (item.endsAt && new Date(item.endsAt).getTime() <= Date.now()) return 'Истёк';
  if (item.startsAt && new Date(item.startsAt).getTime() > Date.now()) return 'Запланирован';
  return 'Активен';
}
function failure(caught: any, fallback: string) {
  const status = caught?.statusCode || caught?.response?.status;
  if (status === 401) return 'Сессия завершилась. Войдите в рабочее пространство заново.';
  if (status === 403) return 'Недостаточно прав для управления промокодами.';
  if (status === 409) return action.value?.kind === 'delete' ? 'У промокода есть история использования. Его нельзя удалить — выключите его, чтобы сохранить историю.' : 'Промокод изменён другим сотрудником либо такой код уже существует. Обновите список и проверьте сохранённую версию.';
  const message = caught?.data?.message;
  const text = Array.isArray(message) ? message.join('. ') : message;
  return typeof text === 'string' && /[а-яё]/i.test(text) ? text : fallback;
}
async function request<T>(path: string, options: Record<string, any> = {}) {
  if (!props.token) throw new Error('Войдите в рабочее пространство для управления промокодами.');
  const controller = new AbortController();
  requests.add(controller);
  try { return await $fetch<T>(path, { baseURL: props.apiBase, headers: { Authorization: `Bearer ${props.token}` }, signal: controller.signal, timeout: 15000, ...options }); }
  finally { requests.delete(controller); }
}
async function load() {
  if (busy.value) return;
  const version = ++loadVersion;
  loading.value = true;
  error.value = '';
  try {
    const result = await request<{ items: any[]; total?: number }>('/promotions', { query: { search: search.value.trim() || undefined, status: statusFilter.value, page: page.value, limit: pageSize } });
    if (version !== loadVersion) return;
    if (!Array.isArray(result.items)) throw new Error('Некорректный ответ сервера');
    if (page.value > 1 && result.total != null && !result.items.length) {
      page.value = Math.max(1, Math.ceil(result.total / pageSize));
      await load();
      return;
    }
    items.value = result.items.map(item => ({ ...item, discountType: item.discountType || item.type, usageCount: item.usageCount ?? item.usage?.total ?? 0, reservedCount: item.reservedCount ?? item.usage?.reserved ?? 0, appliedCount: item.appliedCount ?? item.usage?.applied ?? 0, historyCount: item.usage?.history ?? 0 }));
    total.value = result.total ?? result.items.length;
    loaded.value = true;
  } catch (caught) { if (version === loadVersion) error.value = failure(caught, 'Не удалось загрузить промокоды. Попробуйте обновить список.'); }
  finally { if (version === loadVersion) loading.value = false; }
}
async function edit(item?: Promo) {
  if (busy.value || (dirty.value && !window.confirm('Открыть другой промокод без сохранения изменений?'))) return;
  draft.value = item ? { code: item.code, title: item.title, discountType: item.discountType, amount: String(item.amount), minimumAmount: String(item.minimumAmount || 0), maximumDiscount: item.maximumDiscount == null ? '' : String(item.maximumDiscount), usageLimit: item.usageLimit == null ? '' : String(item.usageLimit), perCustomerLimit: item.perCustomerLimit == null ? '' : String(item.perCustomerLimit), startsAt: localDate(item.startsAt), endsAt: localDate(item.endsAt), isActive: item.isActive, revision: item.revision, existing: true } : { code: '', title: '', discountType: 'PERCENT', amount: '', minimumAmount: '0', maximumDiscount: '', usageLimit: '', perCustomerLimit: '1', startsAt: '', endsAt: '', isActive: false, existing: false };
  baseline.value = JSON.stringify(draft.value);
  notice.value = ''; error.value = '';
  await nextTick();
  formEl.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  formEl.value?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
}
function closeEditor() {
  if (busy.value || (dirty.value && !window.confirm('Закрыть редактор без сохранения изменений?'))) return;
  draft.value = null; baseline.value = '';
}
async function generate() {
  if (!draft.value || busy.value || draft.value.existing) return;
  busy.value = true; error.value = '';
  try { const result = await request<{ code: string }>('/promotions/generate', { method: 'POST', body: {} }); draft.value.code = result.code; }
  catch (caught) { error.value = failure(caught, 'Не удалось сгенерировать код. Можно ввести его вручную.'); }
  finally { busy.value = false; }
}
function decimal(value: string, label: string, minimum: number, optional = false): number | null {
  const text = value.trim().replace(',', '.');
  if (optional && !text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) < minimum || Number(text) > 100000000) throw new Error(`${label}: укажите число от ${minimum.toLocaleString('ru-RU')} с точностью до копеек.`);
  return Number(text);
}
function limit(value: string, label: string, optional = true): number | null {
  if (!value.trim() && optional) return null;
  if (!/^\d+$/.test(value.trim()) || Number(value) < 1 || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw new Error(`${label}: укажите целое число от 1${optional ? ' или оставьте поле пустым' : ''}.`);
  return Number(value);
}
function payload(item: Draft) {
  if (!item.title.trim() || item.title.trim().length > 160) throw new Error('Введите название акции до 160 символов.');
  const code = item.code.trim().toUpperCase();
  if (code && !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) throw new Error('Код: 3–40 латинских букв, цифр, дефисов или подчёркиваний. Первый символ — буква или цифра.');
  const amount = decimal(item.amount, 'Размер скидки', .01)!;
  if (item.discountType === 'PERCENT' && amount > 100) throw new Error('Процентная скидка не может превышать 100%.');
  const startsAt = item.startsAt ? new Date(item.startsAt).toISOString() : null;
  const endsAt = item.endsAt ? new Date(item.endsAt).toISOString() : null;
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('Окончание акции должно быть позже её начала.');
  return { title: item.title.trim(), type: item.discountType, amount, minimumAmount: decimal(item.minimumAmount || '0', 'Минимальная сумма заказа', 0), maximumDiscount: item.discountType === 'PERCENT' ? decimal(item.maximumDiscount, 'Максимальная скидка', .01, true) : null, usageLimit: limit(item.usageLimit, 'Общий лимит'), perCustomerLimit: limit(item.perCustomerLimit, 'Лимит на клиента', false), startsAt, endsAt, isActive: item.isActive, ...(item.existing ? { revision: item.revision } : code ? { code } : {}) };
}
async function save() {
  if (!draft.value || busy.value) return;
  error.value = ''; notice.value = '';
  let body: ReturnType<typeof payload>;
  try { body = payload(draft.value); } catch (caught: any) { error.value = caught.message || 'Проверьте заполнение полей.'; return; }
  busy.value = true;
  try {
    await request(draft.value.existing ? `/promotions/${encodeURIComponent(draft.value.code)}` : '/promotions', { method: draft.value.existing ? 'PATCH' : 'POST', body });
    draft.value = null; baseline.value = ''; notice.value = 'Промокод сохранён.';
  } catch (caught) { error.value = failure(caught, 'Не удалось сохранить промокод. Проверьте параметры и повторите попытку.'); }
  finally { busy.value = false; }
  if (!draft.value) await load();
}
async function openAction(kind: 'delete' | 'deactivate', item: Promo) {
  if (busy.value) return;
  if (draft.value?.code === item.code && dirty.value && !window.confirm('Продолжить без сохранения изменений в редакторе?')) return;
  previousFocus = document.activeElement as HTMLElement;
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  action.value = { kind, item }; confirmation.value = ''; error.value = '';
  await nextTick();
  (dialogEl.value?.querySelector('input') || dialogEl.value?.querySelector('button'))?.focus();
}
function closeAction(force = false) {
  if (busy.value && !force) return;
  action.value = null; confirmation.value = '';
  document.documentElement.style.overflow = previousOverflow;
  previousFocus?.focus({ preventScroll: true });
}
function dialogKeys(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeAction(); }
  if (event.key !== 'Tab' || !dialogEl.value) return;
  const focusable = Array.from(dialogEl.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'));
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
async function applyAction() {
  if (!action.value || busy.value || (action.value.kind === 'delete' && confirmation.value !== action.value.item.code)) return;
  const { kind, item } = action.value;
  busy.value = true; error.value = '';
  try {
    await request(`/promotions/${encodeURIComponent(item.code)}`, kind === 'delete' ? { method: 'DELETE', body: { confirmation: confirmation.value } } : { method: 'PATCH', body: { isActive: false, revision: item.revision } });
    if (draft.value?.code === item.code) { draft.value = null; baseline.value = ''; }
    notice.value = kind === 'delete' ? 'Промокод удалён.' : 'Промокод выключен. История использования сохранена.';
    closeAction(true);
  } catch (caught) { error.value = failure(caught, 'Не удалось выполнить действие. Обновите список и повторите попытку.'); }
  finally { busy.value = false; }
  if (!action.value) await load();
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => { mounted = true; load(); window.addEventListener('beforeunload', beforeUnload); });
watch([search, statusFilter], () => { if (filterTimer) clearTimeout(filterTimer); filterTimer = setTimeout(() => { page.value = 1; load(); }, 250); });
async function changePage(value: number) { if (busy.value || loading.value) return; page.value = value; await load(); }
watch(() => [props.apiBase, props.token], () => {
  if (!mounted) return;
  requests.forEach(controller => controller.abort());
  ++loadVersion; loading.value = false; page.value = 1;
  items.value = []; draft.value = null; baseline.value = ''; loaded.value = false;
  if (action.value) closeAction(true);
  if (!loading.value && !busy.value) load();
});
onBeforeUnmount(() => { ++loadVersion; if (filterTimer) clearTimeout(filterTimer); requests.forEach(controller => controller.abort()); window.removeEventListener('beforeunload', beforeUnload); if (action.value) document.documentElement.style.overflow = previousOverflow; });
onBeforeRouteLeave(() => !dirty.value || window.confirm('Уйти без сохранения параметров промокода?'));
onBeforeRouteUpdate(() => !dirty.value || window.confirm('Перейти в другой раздел без сохранения параметров промокода?'));
</script>

<template>
  <section class="sb-promotions-admin" aria-label="Управление промокодами">
    <header class="sb-promo-panel sb-promo-hero">
      <div><p class="sb-promo-eyebrow">АКЦИИ САЙТА</p><h2>Промокоды</h2><p>Скидки, сроки и ограничения использования. Все условия проверяются при оформлении заказа.</p></div>
      <div class="sb-promo-actions"><button class="sb-promo-button sb-promo-button--white" :disabled="busy || loading" @click="load"><RefreshCw :size="18" /> Обновить</button><button class="sb-promo-button" :disabled="busy" @click="edit()"><Plus :size="18" /> Новый промокод</button></div>
    </header>
    <p v-if="notice" class="sb-promo-notice" role="status">{{ notice }}</p>
    <p v-if="error && !action" class="sb-promo-notice" role="alert">{{ error }}</p>
    <div class="sb-promo-panel sb-promo-list">
      <div class="sb-promo-filters"><label class="sb-promo-search"><Search :size="18" /><input v-model="search" :disabled="busy" maxlength="160" aria-label="Поиск промокода" type="search" placeholder="Поиск по коду или названию" /></label><label class="sb-promo-status-filter"><span>Показывать</span><select v-model="statusFilter" :disabled="busy" aria-label="Статус промокодов"><option value="all">Все промокоды</option><option value="active">Активные</option><option value="inactive">Выключенные</option><option value="scheduled">Запланированные</option><option value="expired">Истёкшие</option></select></label></div>
      <p v-if="loading" class="sb-promo-empty" role="status">Загружаем промокоды…</p>
      <table v-else-if="filtered.length" class="sb-promo-table"><caption class="sb-promo-sr-only">Промокоды, условия и статистика использования</caption><thead><tr><th>Промокод</th><th>Скидка и условия</th><th>Срок действия</th><th>Использование</th><th>Действия</th></tr></thead><tbody>
        <tr v-for="item in filtered" :key="item.code">
          <td data-label="Промокод"><div class="sb-promo-cell"><strong class="sb-promo-code">{{ item.code }}</strong><span>{{ item.title }}</span><span class="sb-promo-badge">{{ promoStatus(item) }}</span></div></td>
          <td data-label="Условия"><div class="sb-promo-cell"><strong>{{ item.discountType === 'PERCENT' ? `${Number(item.amount)}%` : money(item.amount) }}</strong><small>Заказ от {{ money(item.minimumAmount) }}</small><small v-if="item.maximumDiscount">Скидка до {{ money(item.maximumDiscount) }}</small><small>На клиента: {{ item.perCustomerLimit || 'без лимита' }}</small></div></td>
          <td data-label="Срок"><div class="sb-promo-cell"><small>Начало: {{ item.startsAt ? displayDate(item.startsAt) : 'сразу после включения' }}</small><small>Окончание: {{ displayDate(item.endsAt) }}</small></div></td>
          <td data-label="Использование"><div class="sb-promo-cell"><strong>Применено: {{ item.appliedCount || 0 }}</strong><small>Зарезервировано: {{ item.reservedCount || 0 }}</small><small>Использований: {{ item.usageCount || 0 }} / {{ item.usageLimit || 'без лимита' }}</small></div></td>
          <td data-label="Действия"><div class="sb-promo-row-actions"><button class="sb-promo-icon-button" :disabled="busy" :aria-label="`Редактировать ${item.code}`" title="Редактировать" @click="edit(item)"><Pencil :size="18" /></button><button v-if="item.isActive" class="sb-promo-icon-button" :disabled="busy" :aria-label="`Выключить ${item.code}`" title="Выключить и сохранить историю" @click="openAction('deactivate', item)"><Power :size="18" /></button><button class="sb-promo-icon-button" :disabled="busy" :aria-label="`Удалить ${item.code}`" title="Удалить с подтверждением" @click="openAction('delete', item)"><Trash2 :size="18" /></button></div></td>
        </tr>
      </tbody></table>
      <div v-else-if="loaded" class="sb-promo-empty"><Ticket :size="32" /><p>{{ search || statusFilter !== 'all' ? 'По выбранным условиям ничего не найдено.' : 'Промокодов пока нет. Создайте первый и задайте условия акции.' }}</p><button v-if="search || statusFilter !== 'all'" class="sb-promo-button sb-promo-button--white" @click="search = ''; statusFilter = 'all'"><X :size="18" /> Сбросить поиск</button></div>
      <nav v-if="pageCount > 1" class="sb-promo-pagination sb-promo-actions" aria-label="Страницы промокодов"><button class="sb-promo-button sb-promo-button--white" :disabled="busy || loading || page === 1" @click="changePage(page - 1)">Назад</button><span>Страница {{ page }} из {{ pageCount }}</span><button class="sb-promo-button sb-promo-button--white" :disabled="busy || loading || page >= pageCount" @click="changePage(page + 1)">Далее</button></nav>
    </div>
    <form v-if="draft" ref="formEl" class="sb-promo-panel sb-promo-form" novalidate @submit.prevent="save">
      <header class="sb-promo-form-head"><div><h3>{{ draft.existing ? `Промокод ${draft.code}` : 'Новый промокод' }}</h3><small>{{ dirty ? 'Есть несохранённые изменения' : draft.existing ? `Сохранённая версия ${draft.revision}` : 'Заполните условия и сохраните' }}</small></div><button type="button" class="sb-promo-icon-button" :disabled="busy" aria-label="Закрыть редактор" @click="closeEditor"><X :size="20" /></button></header>
      <fieldset :disabled="busy" class="sb-promo-fields">
        <label class="sb-promo-field sb-promo-field--wide"><span>Название акции</span><input v-model="draft.title" maxlength="160" placeholder="Например, приветственная скидка" required /><small>Внутреннее название для сотрудников.</small></label>
        <label class="sb-promo-field sb-promo-field--wide"><span>Код для покупателя</span><div class="sb-promo-code-input"><input v-model="draft.code" :disabled="draft.existing" maxlength="40" placeholder="WELCOME10" autocapitalize="characters" spellcheck="false" @blur="draft.code = draft.code.trim().toUpperCase()" /><button v-if="!draft.existing" type="button" class="sb-promo-button sb-promo-button--white" @click="generate"><Shuffle :size="18" /> Сгенерировать</button></div><small>{{ draft.existing ? 'Код существующего промокода не меняется.' : '3–40 символов: латинские буквы, цифры, дефис или подчёркивание. Пустой код сгенерируется при сохранении.' }}</small></label>
        <label class="sb-promo-field"><span>Тип скидки</span><select v-model="draft.discountType"><option value="PERCENT">Процент от суммы товаров</option><option value="FIXED">Фиксированная сумма, ₽</option></select></label>
        <label class="sb-promo-field"><span>{{ draft.discountType === 'PERCENT' ? 'Размер скидки, %' : 'Размер скидки, ₽' }}</span><input v-model="draft.amount" inputmode="decimal" placeholder="10" required /><small>{{ draft.discountType === 'PERCENT' ? 'От 0,01 до 100%.' : 'Сумма в рублях, до двух знаков после запятой.' }}</small></label>
        <label class="sb-promo-field"><span>Минимальная сумма заказа, ₽</span><input v-model="draft.minimumAmount" inputmode="decimal" placeholder="0" /><small>0 — без минимальной суммы.</small></label>
        <label v-if="draft.discountType === 'PERCENT'" class="sb-promo-field"><span>Максимальная скидка, ₽</span><input v-model="draft.maximumDiscount" inputmode="decimal" placeholder="Без ограничения" /><small>Ограничивает сумму процентной скидки. Необязательное поле.</small></label>
        <label class="sb-promo-field"><span>Общий лимит использований</span><input v-model="draft.usageLimit" inputmode="numeric" placeholder="Без ограничения" /><small>Пустое поле — без лимита. Бронь при оформлении тоже учитывается.</small></label>
        <label class="sb-promo-field"><span>Лимит на одного клиента</span><input v-model="draft.perCustomerLimit" inputmode="numeric" placeholder="1" required /><small>Обязательное поле. Например, 1 для однократной скидки.</small></label>
        <label class="sb-promo-field"><span>Начало действия</span><input v-model="draft.startsAt" type="datetime-local" /><small>Часовой пояс вашего устройства. Пусто — сразу после включения.</small></label>
        <label class="sb-promo-field"><span>Окончание действия</span><input v-model="draft.endsAt" type="datetime-local" /><small>Пусто — без ограничения по дате.</small></label>
        <label class="sb-promo-checkbox sb-promo-field--wide"><input v-model="draft.isActive" type="checkbox" /> Промокод включён</label>
      </fieldset>
      <footer class="sb-promo-actions"><button type="submit" class="sb-promo-button" :disabled="busy"><Save :size="18" /> {{ busy ? 'Сохраняем…' : 'Сохранить промокод' }}</button><button type="button" class="sb-promo-button sb-promo-button--white" :disabled="busy" @click="closeEditor"><X :size="18" /> Отмена</button></footer>
    </form>
    <Teleport to="body"><Transition name="sb-promo-dialog"><div v-if="action" class="sb-promo-dialog-layer" @click.self="closeAction()" @keydown="dialogKeys"><section ref="dialogEl" class="sb-promotions-admin sb-promo-panel sb-promo-dialog" role="dialog" aria-modal="true" aria-labelledby="sb-promo-dialog-title" aria-describedby="sb-promo-dialog-description">
      <header class="sb-promo-form-head"><h3 id="sb-promo-dialog-title">{{ action.kind === 'delete' ? 'Удалить промокод?' : 'Выключить промокод?' }}</h3><button class="sb-promo-icon-button" :disabled="busy" aria-label="Закрыть подтверждение" @click="closeAction()"><X :size="20" /></button></header>
      <p id="sb-promo-dialog-description">{{ action.kind === 'delete' ? `Промокод ${action.item.code} будет удалён без возможности восстановления. При наличии истории использования сервер запретит удаление.` : `Промокод ${action.item.code} больше не будет доступен для новых применений. История использования сохранится.` }}</p>
      <p v-if="action.kind === 'delete' && uses(action.item)" class="sb-promo-notice">Есть использования или резервы. Рекомендуем выключить промокод вместо удаления.</p>
      <label v-if="action.kind === 'delete'" class="sb-promo-field"><span>Введите код {{ action.item.code }} для подтверждения</span><input v-model="confirmation" :disabled="busy" autocomplete="off" spellcheck="false" :placeholder="action.item.code" @keydown.enter.prevent="applyAction" /><small>Код должен совпадать полностью, включая регистр.</small></label>
      <p v-if="error" class="sb-promo-notice" role="alert">{{ error }}</p>
      <footer class="sb-promo-actions"><button class="sb-promo-button" :disabled="busy || (action.kind === 'delete' && confirmation !== action.item.code)" @click="applyAction">{{ busy ? 'Выполняем…' : action.kind === 'delete' ? 'Удалить промокод' : 'Выключить промокод' }}</button><button v-if="action.kind === 'delete' && action.item.isActive && uses(action.item)" class="sb-promo-button sb-promo-button--white" :disabled="busy" @click="action.kind = 'deactivate'; confirmation = ''; error = ''"><Power :size="18" /> Выключить вместо удаления</button><button class="sb-promo-button sb-promo-button--white" :disabled="busy" @click="closeAction()">Отмена</button></footer>
    </section></div></Transition></Teleport>
  </section>
</template>
