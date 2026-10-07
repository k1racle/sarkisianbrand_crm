<script setup lang="ts">
import { requestKey as createRequestKey } from '~/shared/request-key';
import { Plus, RefreshCw, Trash2, X } from '@lucide/vue';
import { workTimeDuration, workTimeLocal, type TimeCorrection, type WorkTimeSession } from '~/shared/crm-work-time';
const props = defineProps<{ visible: boolean; scope: 'MINE' | 'REVIEW'; canCreate: boolean; canReview: boolean; timezone: string; month: string }>();
const emit = defineEmits<{ changed: [] }>();
const { token } = useWorkspaceSession(), config = useRuntimeConfig();
const request = <T,>(path: string, options: any = {}) => $fetch<T>('/crm/work-time' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 15000, retry: 0, ...options });
const listing = ref<{ items: TimeCorrection[]; page: number; pages: number; total: number } | null>(null), page = ref(1), status = ref('PENDING'), loading = ref(false), error = ref('');
const unclosed = ref<any>(null), unclosedPage = ref(1);
const opened = ref(false), busy = ref(false), formError = ref(''), selected = ref<TimeCorrection | null>(null), source = ref<WorkTimeSession | null>(null), note = ref('');
const pending = ref<{ path: string; body: any } | null>(null), requestKey = ref(''), baseline = ref('');
const draft = reactive({ startLocal: '', endLocal: '', timezone: 'Europe/Moscow', reason: '', breaks: [] as { startLocal: string; endLocal: string }[] });
const labels: Record<string,string> = { PENDING: 'На проверке', APPROVED: 'Принято', REJECTED: 'Отклонено', CANCELLED: 'Отозвано' };
const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Нет подтверждения от сервера. Введённые данные сохранены в форме.';
const person = (row: any) => [row.firstName,row.lastName].filter(Boolean).join(' ') || 'Сотрудник';
const date = (value: string | null, timezone = props.timezone) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: timezone, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Не завершён';
const dirty = computed(() => opened.value && (pending.value || (selected.value ? Boolean(note.value.trim()) : baseline.value !== JSON.stringify(draft))));
let alive = true, loadVersion = 0, openVersion = 0;
async function load() {
  if (!props.visible || !alive) return;
  const version = ++loadVersion, identity = token.value; loading.value = true; error.value = ''; listing.value = null; unclosed.value = null;
  try {
    const [rows, open] = await Promise.all([
      request<any>('/corrections', { query: { scope: props.scope, page: page.value, ...(status.value ? { status: status.value } : {}) } }),
      props.scope === 'REVIEW' && props.canReview ? request<any>('/unclosed', { query: { page: unclosedPage.value } }) : null,
    ]);
    if (alive && version === loadVersion && identity === token.value) { listing.value = rows; unclosed.value = open; }
  } catch (e) { if (alive && version === loadVersion && identity === token.value) error.value = message(e); }
  finally { if (alive && version === loadVersion && identity === token.value) loading.value = false; }
}
function leave() { return !busy.value && (!dirty.value || window.confirm('Изменения формы не сохранены или ещё не подтверждены сервером. Закрыть форму?')); }
function close() { if (leave()) { opened.value = false; ++openVersion; } }
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
function create(row: WorkTimeSession | null = null) {
  if (!props.canCreate || !leave()) return;
  source.value = row; selected.value = null; pending.value = null; note.value = ''; formError.value = ''; requestKey.value = createRequestKey();
  const tz = row?.timezone || props.timezone;
  Object.assign(draft, { startLocal: row ? workTimeLocal(row.startedAt,tz) : props.month + '-01T09:00', endLocal: row?.endedAt ? workTimeLocal(row.endedAt,tz) : '', timezone: tz, reason: '',
    breaks: row?.breaks.map(pause => ({ startLocal: workTimeLocal(pause.startedAt,tz), endLocal: pause.endedAt ? workTimeLocal(pause.endedAt,tz) : '' })) || [] });
  baseline.value = JSON.stringify(draft); opened.value = true;
}
async function open(id: string) {
  if (!leave()) return;
  const version = ++openVersion, identity = token.value; busy.value = true; error.value = ''; formError.value = '';
  try { const row = await request<TimeCorrection>('/corrections/' + id); if (alive && version === openVersion && identity === token.value) { selected.value = row; source.value = null; note.value = ''; pending.value = null; opened.value = true; } }
  catch (e) { if (alive && version === openVersion && identity === token.value) { if (opened.value) formError.value = message(e); else error.value = message(e); } }
  finally { if (alive && version === openVersion && identity === token.value) busy.value = false; }
}
async function send() {
  if (!pending.value || busy.value) return;
  const identity = token.value; busy.value = true; formError.value = '';
  try {
    await request(pending.value.path, { method: 'POST', body: pending.value.body });
    if (!alive || identity !== token.value) return;
    pending.value = null; opened.value = false; emit('changed'); await load();
  } catch (e: any) {
    if (!alive || identity !== token.value) return;
    formError.value = message(e);
    if ([400,401,403,404,409,422].includes(e?.statusCode || e?.status)) pending.value = null;
  } finally { if (alive && identity === token.value) busy.value = false; }
}
function submit() {
  if (selected.value || busy.value || !props.canCreate) return;
  if (!pending.value) pending.value = { path: '/corrections', body: { ...JSON.parse(JSON.stringify(draft)), requestKey: requestKey.value, ...(source.value ? { sessionId: source.value.id, baseVersion: source.value.version } : {}) } };
  send();
}
function decide(action: 'APPROVE'|'REJECT'|'CANCEL') {
  const row = selected.value;
  if (!row || busy.value || pending.value || !(action === 'APPROVE' ? row.canApprove : action === 'REJECT' ? row.canReject : row.canCancel)) return;
  if (note.value.trim().length < 3) { formError.value = 'Укажите комментарий к решению (не менее 3 символов).'; return; }
  if (!window.confirm(action === 'APPROVE' ? 'Принять исправление? Фактические часы будут пересчитаны, исходные отметки останутся в истории.' : action === 'REJECT' ? 'Отклонить заявку без изменения часов?' : 'Отозвать заявку?')) return;
  pending.value = { path: '/corrections/' + row.id + '/decision', body: { action, version: row.version, note: note.value.trim(), requestKey: createRequestKey() } }; send();
}
function changePage(delta: number) { page.value += delta; load(); }
function unload(e: BeforeUnloadEvent) { if (dirty.value || busy.value) { e.preventDefault(); e.returnValue = ''; } }
watch(() => [props.visible, props.scope], () => { ++loadVersion; listing.value = null; unclosed.value = null; page.value = 1; unclosedPage.value = 1; if (props.visible) load(); });
watch(token, () => { ++loadVersion; ++openVersion; opened.value = false; busy.value = false; pending.value = null; selected.value = null; source.value = null; listing.value = null; unclosed.value = null; load(); });
onMounted(() => { load(); window.addEventListener('beforeunload',unload); });
onBeforeRouteLeave(() => leave());
onUnmounted(() => { alive = false; ++loadVersion; ++openVersion; window.removeEventListener('beforeunload',unload); });
defineExpose({ create, open, refresh: load });
</script>
<template>
  <div v-if="visible" class="crm-page-content--stack">
    <section class="crm-surface" :aria-label="scope === 'REVIEW' ? 'Проверка исправлений' : 'Мои исправления'">
      <header class="crm-panel-header"><div><p>{{ scope === 'REVIEW' ? 'ПРОВЕРКА ВРЕМЕНИ' : 'МОИ ЗАЯВКИ' }}</p><h2>{{ scope === 'REVIEW' ? 'Исправления сотрудников' : 'Запросы на исправление' }}</h2></div><button v-if="scope === 'MINE' && canCreate" class="crm-button crm-button--primary" :disabled="busy" @click="create()"><Plus :size="18" />Добавить пропущенный день</button></header>
      <div class="crm-register crm-page-content--stack">
        <p class="crm-inline-note">{{ scope === 'REVIEW' ? 'Сравните исходные и предложенные отметки. Подтвердить свои часы нельзя; при изменении исходной отметки нужна новая заявка.' : 'Часы изменятся только после принятия другим руководителем. Здесь видны заявки за все месяцы. Для изменения существующей отметки откройте её в истории.' }}</p>
        <div class="crm-filter-form crm-filter-form--compact"><label>Состояние заявки<select v-model="status" class="crm-input" @change="page = 1; load()"><option value="">Все состояния</option><option v-for="(label,key) in labels" :key="key" :value="key">{{ label }}</option></select></label><button class="crm-button crm-button--refresh" :disabled="loading || busy" @click="load"><RefreshCw :size="18" />Обновить заявки</button></div>
        <p v-if="loading" role="status">Загружаем заявки…</p><p v-if="error" role="alert">{{ error }}</p>
        <template v-if="listing"><p v-if="!listing.items.length">Заявок с выбранным состоянием пока нет.</p>
          <article v-for="row in listing.items" :key="row.id" class="crm-item-card crm-record"><span><strong>{{ scope === 'REVIEW' ? person(row.employee) : date(row.proposal.startedAt,row.proposal.timezone) }}</strong><small>{{ row.reason }}</small><small>{{ date(row.proposal.startedAt,row.proposal.timezone) }} — {{ date(row.proposal.endedAt,row.proposal.timezone) }}</small><small v-if="row.stale">Исходная отметка уже изменена</small></span><span class="crm-badge">{{ labels[row.status] }}</span><button class="crm-button" :disabled="busy" :aria-label="'Открыть заявку: ' + row.reason" @click="open(row.id)">Открыть</button></article>
          <div class="crm-action-bar crm-action-bar--spread"><span>Всего заявок: {{ listing.total }} · {{ listing.page }} / {{ listing.pages }}</span><div class="crm-action-bar"><button class="crm-button" :disabled="loading || page <= 1" @click="changePage(-1)">Назад</button><button class="crm-button" :disabled="loading || page >= listing.pages" @click="changePage(1)">Далее</button></div></div>
        </template>
      </div>
    </section>
    <section v-if="scope === 'REVIEW' && unclosed" class="crm-surface" aria-label="Незакрытые дни команды"><header class="crm-panel-header"><div><p>НУЖНО ПРОВЕРИТЬ</p><h2>Дни, открытые больше 24 часов</h2></div></header><div class="crm-register crm-page-content--stack"><p class="crm-inline-note">Возможны забытые отметки. Попросите сотрудника отправить исправление из истории времени. Эти часы нельзя автоматически считать достоверными для зарплаты.</p><p v-if="!unclosed.items.length">Таких дней у доступных сотрудников нет.</p><article v-for="row in unclosed.items" :key="row.id" class="crm-item-card crm-record"><span><strong>{{ person(row.employee) }}</strong><small>Открыт {{ date(row.startedAt,row.timezone) }} · {{ row.timezone }}</small></span><span>{{ workTimeDuration(row.totals.workedMs) }} по незакрытым отметкам</span></article><div class="crm-action-bar crm-action-bar--spread"><span>Всего: {{ unclosed.total }} · {{ unclosed.page }} / {{ unclosed.pages }}</span><div class="crm-action-bar"><button class="crm-button" :disabled="loading || unclosedPage <= 1" @click="unclosedPage--; load()">Предыдущие дни</button><button class="crm-button" :disabled="loading || unclosedPage >= unclosed.pages" @click="unclosedPage++; load()">Следующие дни</button></div></div></div></section>
  </div>
  <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="time-correction-title" tabindex="-1" @keydown="keyboard" @submit.prevent="submit">
    <header><div><p>Рабочее время</p><h2 id="time-correction-title">{{ selected ? 'Проверка исправления' : source ? 'Исправить отметку' : 'Добавить пропущенный день' }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть исправление" :disabled="busy" @click="close"><X :size="18" /></button></header>
    <div class="admin-dialog-body crm-detail-body crm-stack">
      <p v-if="formError" role="alert">{{ formError }}</p><p v-if="pending && !busy" class="crm-inline-note">Ответ не подтверждён. «Проверить сохранение» повторит прежний запрос, не создавая второй.</p>
      <template v-if="!selected">
        <p class="crm-inline-note">{{ draft.timezone }} · Точность исправления — минута. Заполните фактический законченный интервал, не план. Прежние отметки сохранятся в истории.</p>
        <fieldset class="ui-fieldset-reset crm-stack" :disabled="busy || Boolean(pending)">
          <div class="two"><label class="crm-field">Начало работы<input v-model="draft.startLocal" class="crm-input" type="datetime-local" required /></label><label class="crm-field">Окончание работы<input v-model="draft.endLocal" class="crm-input" type="datetime-local" required /></label></div>
          <h3>Перерывы</h3><p v-if="!draft.breaks.length" class="crm-inline-note">Перерывов нет. Если они были, добавьте каждый интервал.</p>
          <div v-for="(pause,index) in draft.breaks" :key="index" class="crm-stack"><div class="two"><label class="crm-field">Начало перерыва {{ index+1 }}<input v-model="pause.startLocal" class="crm-input" type="datetime-local" required /></label><label class="crm-field">Конец перерыва {{ index+1 }}<input v-model="pause.endLocal" class="crm-input" type="datetime-local" required /></label></div><button class="crm-button crm-button--text" type="button" @click="draft.breaks.splice(index,1)"><Trash2 :size="18" />Удалить перерыв {{ index+1 }}</button></div>
          <button class="crm-button" type="button" :disabled="draft.breaks.length >= 24" @click="draft.breaks.push({startLocal:'',endLocal:''})"><Plus :size="18" />Добавить перерыв</button>
          <label class="crm-field">Причина исправления<textarea v-model="draft.reason" class="crm-input" rows="3" minlength="5" maxlength="1000" required placeholder="Например, забыл завершить день после смены" /></label>
        </fieldset>
      </template>
      <template v-else>
        <p><strong>{{ person(selected.employee) }}</strong> · <span class="crm-badge">{{ labels[selected.status] }}</span></p><p>{{ selected.reason }}</p><p class="crm-inline-note">Часовой пояс: {{ selected.proposal.timezone }}</p>
        <section class="crm-stack" aria-label="Исходные отметки"><h3>Было</h3><template v-if="selected.original"><p>{{ date(selected.original.startedAt,selected.original.timezone) }} — {{ date(selected.original.endedAt,selected.original.timezone) }}</p><p v-for="(pause,index) in selected.original.breaks" :key="index" class="crm-inline-note">Перерыв: {{ date(pause.startedAt,selected.original.timezone) }} — {{ date(pause.endedAt,selected.original.timezone) }}</p></template><p v-else>Отметки нет — запрошен пропущенный день.</p></section>
        <section class="crm-stack" aria-label="Предложенные отметки"><h3>Предложено</h3><p>{{ date(selected.proposal.startedAt,selected.proposal.timezone) }} — {{ date(selected.proposal.endedAt,selected.proposal.timezone) }}</p><p v-for="(pause,index) in selected.proposal.breaks" :key="index" class="crm-inline-note">Перерыв: {{ date(pause.startedAt,selected.proposal.timezone) }} — {{ date(pause.endedAt,selected.proposal.timezone) }}</p><strong>Работа: {{ workTimeDuration(selected.proposal.totals.workedMs) }} · Перерывы: {{ workTimeDuration(selected.proposal.totals.breakMs) }}</strong></section>
        <p v-if="selected.stale" role="alert">После подачи заявки исходная отметка изменилась. Подтвердить прежние значения нельзя: нужна новая заявка.</p>
        <p v-if="selected.reviewerName" class="crm-inline-note">{{ selected.reviewerName }} · {{ date(selected.reviewedAt) }} · {{ selected.reviewNote }}</p>
        <label v-if="selected.canApprove || selected.canReject || selected.canCancel" class="crm-field">Комментарий к решению<textarea v-model="note" class="crm-input" rows="3" minlength="3" maxlength="1000" :disabled="busy || Boolean(pending)" /></label>
        <button v-if="formError && !pending" class="crm-button" type="button" :disabled="busy" @click="open(selected.id)">Обновить заявку</button>
      </template>
    </div>
    <footer class="crm-detail-footer"><button class="crm-button" type="button" :disabled="busy" @click="close">Закрыть</button><button v-if="pending && !busy" class="crm-button crm-button--primary" type="button" @click="send">Проверить сохранение</button><template v-else-if="selected"><button v-if="selected.canCancel" class="crm-button" type="button" :disabled="busy" @click="decide('CANCEL')">Отозвать заявку</button><button v-if="selected.canReject" class="crm-button crm-button--danger" type="button" :disabled="busy" @click="decide('REJECT')">Отклонить</button><button v-if="selected.canApprove" class="crm-button crm-button--primary" type="button" :disabled="busy" @click="decide('APPROVE')">Принять исправление</button></template><button v-else class="crm-button crm-button--primary" type="submit" :disabled="busy || !canCreate">{{ busy ? 'Отправляем…' : 'Отправить на проверку' }}</button></footer>
  </form></div></Teleport>
</template>
