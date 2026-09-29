<script setup lang="ts">
import { CalendarFold, ChevronLeft, ChevronRight, Plus, RefreshCw, X } from '@lucide/vue';
import CrmSchedulePatterns from '~/components/crm/CrmSchedulePatterns.vue';
import { employeeCountLabel, intersectsScheduleDay, workingEmployeeCount } from '~/shared/crm-work-schedule';
useHead({ title: 'Графики работы — SARKISIAN CRM' });
type Person = { id: string; firstName?: string; lastName?: string; departmentId: string | null; canAssign?: boolean };
type Schedule = { id: string; patternId?: string; patternLabel?: string; employeeId: string; employee: Person; departmentName: string; kind: string; startLocal: string; endLocal: string; timezone: string; breakMinutes: number; plannedMinutes: number; note: string; status: string; version: number; canEdit: boolean; canPublish: boolean; canCancel: boolean; events?: { version: number; action: string; actorName: string; reason: string; createdAt: string }[] };
type CalendarData = { items: Schedule[]; totals: { entries: number; draftMinutes: number; publishedMinutes: number }; canCreate: boolean; canPublishPatterns?: boolean; patterns?: any[]; warnings?: { patternId: string; date: string; message: string }[] };
const patternPanel = ref<{ open: (id: string) => Promise<void> } | null>(null);
const session = useWorkspaceSession(), config = useRuntimeConfig();
const request = <T,>(path = '', options: any = {}) => $fetch<T>('/crm/work-schedule' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 15000, retry: 0, ...options });
const month = ref(''), departmentId = ref(''), employeeId = ref(''), status = ref(''), day = ref('');
const section = ref('calendar'), onShiftDate = ref(''), showNonWorking = ref(false);
const data = ref<CalendarData | null>(null), people = ref<Person[]>([]), departments = ref<{ id: string; name: string }[]>([]);
const loading = ref(false), opening = ref(false), saving = ref(false), error = ref(''), formError = ref('');
const opened = ref(false), selected = ref<Schedule | null>(null), tab = ref('general'), reason = ref(''), baseline = ref(''), requestKey = ref('');
const draft = reactive({ employeeId: '', kind: 'SHIFT', startLocal: '', endLocal: '', timezone: 'Europe/Moscow', breakMinutes: 60, note: '' });
const dirty = computed(() => opened.value && (JSON.stringify(draft) !== baseline.value || Boolean(reason.value.trim())));
const editable = computed(() => selected.value ? selected.value.canEdit : data.value?.canCreate);
const candidates = computed(() => people.value.filter(person => person.canAssign));
const personName = (person: Person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || `Сотрудник ${person.id.slice(0, 6)}`;
const kinds: Record<string, string> = { SHIFT: 'Рабочая смена', DAY_OFF: 'Выходной', ABSENCE: 'Отсутствие' };
const statuses: Record<string, string> = { DRAFT: 'Черновик', PUBLISHED: 'Опубликовано', CANCELLED: 'Отменено' };
const actions: Record<string, string> = { CREATE: 'Создан черновик', UPDATE: 'Изменён черновик', PUBLISHED: 'Опубликовано', CANCELLED: 'Отменено' };
const hours = (minutes: number) => `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
const dateLabel = (date: string) => new Date(date.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const nextDay = (date: string) => new Date(Date.parse(date + 'T00:00Z') + 86400000).toISOString().slice(0, 10);
const visible = computed(() => (data.value?.items || []).filter(row => (showNonWorking.value || row.kind === 'SHIFT') && (!day.value || intersectsScheduleDay(row, day.value))));
const onShift = computed(() => {
  const groups = new Map<string, { employee: Person; rows: Schedule[] }>();
  for (const row of data.value?.items || []) {
    if (row.kind !== 'SHIFT' || row.status !== 'PUBLISHED' || !onShiftDate.value || !intersectsScheduleDay(row, onShiftDate.value)) continue;
    if (!groups.has(row.employeeId)) groups.set(row.employeeId, { employee: row.employee, rows: [] });
    groups.get(row.employeeId)!.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => personName(a.employee).localeCompare(personName(b.employee), 'ru'));
});
const cells = computed(() => {
  if (!/^\d{4}-\d{2}$/.test(month.value)) return [];
  const [year, m] = month.value.split('-').map(Number), offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const number = i - offset + 1, key = number > 0 && number <= days ? `${month.value}-${String(number).padStart(2, '0')}` : '';
    return { number, key, count: key ? workingEmployeeCount(data.value?.items || [], key) : 0 };
  });
});
const message = (e: any, fallback: string) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || fallback;
let loadVersion = 0, detailVersion = 0;
async function load() {
  const version = ++loadVersion; loading.value = true; error.value = ''; day.value = '';
  try {
    const [calendar, options] = await Promise.all([
      request<CalendarData>('', { query: { month: month.value, ...(departmentId.value ? { departmentId: departmentId.value } : {}), ...(employeeId.value ? { employeeId: employeeId.value } : {}), ...(section.value === 'on-shift' ? { status: 'PUBLISHED' } : section.value === 'calendar' && status.value ? { status: status.value } : {}) } }),
      request<{ people: Person[]; departments: { id: string; name: string }[] }>('/options'),
    ]);
    if (version === loadVersion) { data.value = calendar; people.value = options.people; departments.value = options.departments; }
  } catch (e) { if (version === loadVersion) { data.value = null; people.value = []; departments.value = []; error.value = message(e, 'Не удалось загрузить графики. Повторите попытку.'); } }
  finally { if (version === loadVersion) loading.value = false; }
}
function moveMonth(delta: number) {
  const [year, m] = month.value.split('-').map(Number);
  month.value = new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7); load();
}
function loadShiftDate() {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(onShiftDate.value)) return;
  month.value = onShiftDate.value.slice(0, 7); load();
}
watch(section, () => { if (section.value === 'on-shift') loadShiftDate(); else load(); });
function fill(row: Schedule | null) {
  selected.value = row; reason.value = ''; formError.value = ''; tab.value = 'general';
  const date = day.value || month.value + '-01';
  Object.assign(draft, { employeeId: row?.employeeId || (candidates.value.some(p => p.id === employeeId.value) ? employeeId.value : candidates.value[0]?.id || ''),
    kind: row?.kind || 'SHIFT', startLocal: row?.startLocal || date + 'T09:00', endLocal: row?.endLocal || date + 'T18:00',
    timezone: row?.timezone || 'Europe/Moscow', breakMinutes: row?.breakMinutes ?? 60, note: row?.note || '' });
  baseline.value = JSON.stringify(draft);
}
function create() { if (!data.value?.canCreate || opening.value) return; fill(null); requestKey.value = crypto.randomUUID(); opened.value = true; }
async function open(row: Schedule) {
  if (row.patternId) { await patternPanel.value?.open(row.patternId); return; }
  if (opening.value) return;
  const version = ++detailVersion; opening.value = true; error.value = '';
  try { const result = await request<Schedule>('/' + row.id); if (version === detailVersion) { fill(result); opened.value = true; } }
  catch (e) { if (version === detailVersion) error.value = message(e, 'Запись графика недоступна'); }
  finally { if (version === detailVersion) opening.value = false; }
}
function leave() { return !saving.value && (!dirty.value || window.confirm('Изменения графика не сохранены. Закрыть без сохранения?')); }
function close() { if (leave()) opened.value = false; }
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
function setKind() {
  const date = draft.startLocal.slice(0, 10) || month.value + '-01';
  if (draft.kind !== 'SHIFT') { draft.startLocal = date + 'T00:00'; draft.endLocal = nextDay(date) + 'T00:00'; draft.breakMinutes = 0; }
  else { draft.startLocal = date + 'T09:00'; draft.endLocal = date + 'T18:00'; draft.breakMinutes = 60; }
}
function setAbsenceDate(event: Event) { const value = (event.target as HTMLInputElement).value; if (value) { draft.startLocal = value + 'T00:00'; draft.endLocal = nextDay(value) + 'T00:00'; } }
async function save() {
  if (saving.value || !editable.value || tab.value !== 'general') return;
  saving.value = true; formError.value = '';
  try {
    const { employeeId: target, ...fields } = draft;
    await request(selected.value ? '/' + selected.value.id : '', { method: selected.value ? 'PATCH' : 'POST', body: { ...fields, breakMinutes: Number(fields.breakMinutes), ...(selected.value ? { version: selected.value.version, reason: reason.value.trim() } : { employeeId: target, requestKey: requestKey.value }) } });
    opened.value = false; await load();
  } catch (e) { formError.value = message(e, 'Не удалось сохранить график. Черновик оставлен в форме.'); }
  finally { saving.value = false; }
}
async function transition(target: string) {
  if (!selected.value || saving.value) return;
  formError.value = '';
  if (baseline.value !== JSON.stringify(draft)) { formError.value = 'Сначала сохраните изменения черновика.'; return; }
  if (!reason.value.trim()) { formError.value = 'Укажите причину публикации или отмены.'; return; }
  if (!window.confirm(target === 'PUBLISHED' ? 'Опубликовать график? Сотрудник увидит эту запись в CRM.' : 'Отменить запись графика? Она останется в истории.')) return;
  saving.value = true;
  try { await request('/' + selected.value.id + '/status', { method: 'POST', body: { status: target, version: selected.value.version, reason: reason.value.trim() } }); opened.value = false; await load(); }
  catch (e) { formError.value = message(e, 'Не удалось изменить состояние графика. Обновите карточку перед повтором.'); }
  finally { saving.value = false; }
}
async function reloadCard() {
  if (!selected.value || !leave()) return;
  saving.value = true;
  try { fill(await request<Schedule>('/' + selected.value.id)); }
  catch (e) { formError.value = message(e, 'Не удалось обновить карточку'); }
  finally { saving.value = false; }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => leave());
onMounted(() => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); onShiftDate.value = ['year','month','day'].map(key => parts.find(p => p.type === key)!.value).join('-'); month.value = onShiftDate.value.slice(0, 7); load(); window.addEventListener('beforeunload', beforeUnload); });
onBeforeUnmount(() => { ++loadVersion; ++detailVersion; window.removeEventListener('beforeunload', beforeUnload); });
</script>

<template>
  <main class="crm-standard">
    <header class="crm-page-header"><div><h1>Графики работы</h1><p>Планируйте смены, смотрите состав команды на день и назначайте постоянные графики.</p></div><div class="crm-action-bar"><button class="crm-button crm-button--refresh" :disabled="loading" @click="load"><RefreshCw :size="18" />Обновить</button><button v-if="data?.canCreate && section === 'calendar'" class="crm-button crm-button--primary" :disabled="loading || opening" @click="create"><Plus :size="18" />Новая запись</button></div></header>
    <div class="crm-page-content crm-page-content--stack">
      <CrmCardTabs v-model="section" prefix="work-schedule-view" :tabs="[['calendar','График'],['on-shift','Кто на смене'],['patterns','Шаблоны']]" label="Разделы графиков работы" />
      <form class="crm-toolbar crm-filter-form" aria-label="Фильтры графика" @submit.prevent="load">
        <label v-if="section === 'calendar'" class="crm-field">Месяц<input v-model="month" class="crm-input" type="month" min="2000-01" max="2099-12" required @change="load" /></label>
        <label v-if="section === 'on-shift'" class="crm-field">Дата смены<input v-model="onShiftDate" class="crm-input" type="date" min="2000-01-01" max="2099-12-31" required @change="loadShiftDate" /></label>
        <label class="crm-field">Отдел<select v-model="departmentId" class="crm-input" @change="load"><option value="">Все доступные</option><option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</option></select></label>
        <label class="crm-field">Сотрудник<select v-model="employeeId" class="crm-input" @change="load"><option value="">Все доступные</option><option v-for="person in people" :key="person.id" :value="person.id">{{ personName(person) }}</option></select></label>
        <button class="crm-button" :disabled="loading" type="submit">Показать</button>
      </form>
      <p v-if="error" role="alert">{{ error }}</p><p v-if="loading" role="status">Загружаем графики…</p><p v-if="opening" role="status">Открываем карточку…</p>
      <template v-if="data && !loading">
        <div v-show="section === 'patterns'" id="work-schedule-view-patterns-panel" role="tabpanel" aria-labelledby="work-schedule-view-patterns-tab"><CrmSchedulePatterns ref="patternPanel" :patterns="data.patterns || []" :people="people" :can-create="data.canCreate" :can-publish="Boolean(data.canPublishPatterns)" :month="month" @changed="load" /></div>
        <div v-if="data.warnings?.length" class="crm-surface crm-register crm-stack" role="alert"><strong>Не все даты шаблона рассчитаны — итоги неполные.</strong><p v-for="warning in data.warnings" :key="warning.patternId + warning.date">{{ dateLabel(warning.date) }}: {{ warning.message }}. Уточните график или добавьте ручную запись.</p></div>
        <div v-if="section === 'calendar'" id="work-schedule-view-calendar-panel" role="tabpanel" aria-labelledby="work-schedule-view-calendar-tab" class="crm-stack">
        <section class="crm-surface" aria-label="Сводка графика"><header class="crm-panel-header"><div><p>ПЛАН, НЕ ФАКТИЧЕСКОЕ ВРЕМЯ</p><h2>Доступные графики</h2></div></header><div class="crm-register crm-summary-grid"><div><small>Записей в выборке</small><strong>{{ data.totals.entries }}</strong></div><div><small>Сотрудников в выборке</small><strong>{{ new Set(data.items.map(row => row.employeeId)).size }}</strong></div><div><small>Опубликованный план</small><strong>{{ hours(data.totals.publishedMinutes) }}</strong></div><div><small>В черновиках</small><strong>{{ hours(data.totals.draftMinutes) }}</strong></div></div></section>
        <section class="crm-surface" aria-label="Календарь команды">
          <header class="crm-panel-header"><div class="crm-action-bar"><button class="crm-button crm-button--icon" aria-label="Предыдущий месяц" :disabled="month <= '2000-01'" @click="moveMonth(-1)"><ChevronLeft :size="18" /></button><h2>{{ new Date(month + '-01T12:00:00Z').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }}</h2><button class="crm-button crm-button--icon" aria-label="Следующий месяц" :disabled="month >= '2099-12'" @click="moveMonth(1)"><ChevronRight :size="18" /></button></div></header>
          <div class="crm-register crm-stack">
            <div class="crm-action-bar crm-view-switch" role="group" aria-label="Состояние графика"><button v-for="[key,label] in [['','Действующие'],['DRAFT','Черновики'],['PUBLISHED','Опубликованные'],['CANCELLED','Отменённые']]" :key="key" class="crm-button" :aria-pressed="status === key" @click="status = key; load()">{{ label }}</button></div>
            <p class="crm-inline-note">В календаре — сотрудники с рабочей сменой: каждый учитывается один раз за день. Выходные, отсутствия и отменённые смены не считаются. Даты и время — в часовом поясе записи; ночная смена видна в обоих днях.</p>
            <div class="crm-month-grid" aria-label="Даты графика"><span v-for="weekday in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="weekday" class="crm-month-weekday">{{ weekday }}</span><template v-for="(cell,index) in cells" :key="index"><button v-if="cell.key" class="crm-button crm-month-day" :aria-pressed="day === cell.key" :aria-label="`${dateLabel(cell.key)}: ${employeeCountLabel(cell.count)}`" @click="day = day === cell.key ? '' : cell.key"><strong>{{ cell.number }}</strong><small v-if="cell.count" class="crm-month-count"><span class="crm-month-count--compact">{{ cell.count }} чел.</span><span class="crm-month-count--full">{{ employeeCountLabel(cell.count) }}</span></small></button><span v-else aria-hidden="true" /></template></div>
            <label class="crm-toggle-row"><span>Показывать выходные и отсутствия в списке</span><input v-model="showNonWorking" class="crm-check" type="checkbox" /></label>
            <div class="crm-action-bar crm-action-bar--spread"><h3>{{ day ? dateLabel(day) : 'Записи месяца' }} · {{ visible.length }}</h3><button v-if="day" class="crm-button crm-button--text" @click="day = ''">Все даты</button></div>
            <article v-for="row in visible" :key="row.id" class="crm-item-card crm-record"><span><strong>{{ personName(row.employee) }}</strong><small>{{ kinds[row.kind] }} · {{ row.departmentName || 'Без отдела' }}</small><small v-if="row.patternId">По шаблону {{ row.patternLabel }}</small><small>{{ dateLabel(row.startLocal) }} {{ row.startLocal.slice(11) }} — {{ dateLabel(row.endLocal) }} {{ row.endLocal.slice(11) }} · {{ row.timezone }}</small></span><span><strong>{{ row.kind === 'SHIFT' ? hours(row.plannedMinutes) : 'Не рабочее время' }}</strong><small><span class="crm-badge" :data-status="row.status">{{ statuses[row.status] }}</span></small></span><button class="crm-button" :disabled="opening" :aria-label="`Открыть график ${personName(row.employee)}, ${row.startLocal}`" @click="open(row)">Открыть</button></article>
            <div v-if="!visible.length" class="crm-empty"><CalendarFold :size="28" /><h3>{{ showNonWorking ? 'Записей по этим условиям нет' : 'Рабочих смен по этим условиям нет' }}</h3><p>{{ data.canCreate ? 'Добавьте смену или выберите другой период.' : 'Ваш опубликованный график появится здесь после назначения.' }}</p></div>
          </div>
        </section>
        <p class="crm-inline-note">Итоги относятся ко всей отфильтрованной выборке, до выбора дня. Переходящие через границу месяца смены включены целиком. Это план занятости, не табель и не расчёт зарплаты. Публикация пока без автоматических уведомлений.</p>
        </div>
        <section v-if="section === 'on-shift'" id="work-schedule-view-on-shift-panel" role="tabpanel" aria-labelledby="work-schedule-view-on-shift-tab" class="crm-surface">
          <header class="crm-panel-header"><div><p>ПО ОПУБЛИКОВАННОМУ ГРАФИКУ</p><h2>{{ dateLabel(onShiftDate) }} · {{ employeeCountLabel(onShift.length) }}</h2></div></header>
          <div class="crm-register crm-stack"><p class="crm-inline-note">Сотрудники с рабочей сменой на выбранную дату. Это план, а не подтверждение фактического выхода. Выходные, отсутствия, черновики и отменённые смены не показаны.</p>
            <article v-for="group in onShift" :key="group.employee.id" class="crm-item-card"><header class="crm-record"><strong>{{ personName(group.employee) }}</strong></header><div v-for="row in group.rows" :key="row.id" class="crm-record"><span><small>{{ row.departmentName || 'Без отдела' }}</small><span>{{ dateLabel(row.startLocal) }} {{ row.startLocal.slice(11) }} — {{ dateLabel(row.endLocal) }} {{ row.endLocal.slice(11) }}</span><small>{{ row.timezone }} · {{ hours(row.plannedMinutes) }}<template v-if="row.patternId"> · По шаблону {{ row.patternLabel }}</template></small></span><button class="crm-button" :disabled="opening" :aria-label="`Открыть график ${personName(row.employee)}, ${row.startLocal}`" @click="open(row)">Открыть</button></div></article>
            <div v-if="!onShift.length" class="crm-empty"><CalendarFold :size="28" /><h3>На эту дату смены не назначены</h3><p>Выберите другую дату или опубликуйте график.</p></div>
          </div>
        </section>
      </template>
    </div>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="schedule-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>График работы</p><h2 id="schedule-title">{{ selected ? personName(selected.employee) : 'Новая запись' }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть карточку" :disabled="saving" @click="close"><X :size="18" /></button></header>
      <CrmCardTabs v-if="selected" v-model="tab" prefix="schedule" :tabs="[['general','Общее'],['history','История изменений']]" />
      <div :id="`schedule-${tab}-panel`" :role="selected ? 'tabpanel' : undefined" :aria-labelledby="selected ? `schedule-${tab}-tab` : undefined" class="admin-dialog-body crm-detail-body crm-stack">
        <div v-if="formError" class="crm-stack" role="alert"><p>{{ formError }}</p><button v-if="selected" class="crm-button" type="button" :disabled="saving" @click="reloadCard">Загрузить актуальную карточку</button></div>
        <template v-if="tab === 'general'">
          <p v-if="selected"><span class="crm-badge" :data-status="selected.status">{{ statuses[selected.status] }}</span> · Версия {{ selected.version }}</p>
          <p v-if="selected && !editable" class="crm-inline-note">Запись доступна для просмотра. Для изменения опубликованного графика уполномоченный сотрудник отменяет запись с причиной и создаёт новую.</p>
          <fieldset class="ui-fieldset-reset crm-stack" :disabled="saving || !editable">
            <label class="crm-field">Сотрудник<select v-model="draft.employeeId" class="crm-input" required :disabled="Boolean(selected)"><option value="" disabled>Выберите сотрудника</option><option v-for="person in selected ? [selected.employee] : candidates" :key="person.id" :value="person.id">{{ personName(person) }}</option></select></label>
            <label class="crm-field">Тип записи<select v-model="draft.kind" class="crm-input" @change="setKind"><option v-for="(label,key) in kinds" :key="key" :value="key">{{ label }}</option></select></label>
            <div v-if="draft.kind === 'SHIFT'" class="two"><label class="crm-field">Начало смены<input v-model="draft.startLocal" class="crm-input" type="datetime-local" required /></label><label class="crm-field">Окончание смены<input v-model="draft.endLocal" class="crm-input" type="datetime-local" required /></label></div>
            <label v-else class="crm-field">Дата<input :value="draft.startLocal.slice(0,10)" class="crm-input" type="date" required @change="setAbsenceDate" /></label>
            <div class="two"><label class="crm-field">Часовой пояс<input v-model="draft.timezone" class="crm-input" required maxlength="80" list="schedule-zones" /></label><label v-if="draft.kind === 'SHIFT'" class="crm-field">Перерыв, минут<input v-model="draft.breakMinutes" class="crm-input" type="number" min="0" max="1439" required /></label></div>
            <datalist id="schedule-zones"><option value="Europe/Moscow" /><option value="Europe/Kaliningrad" /><option value="Asia/Yekaterinburg" /><option value="Asia/Novosibirsk" /><option value="Asia/Vladivostok" /><option value="UTC" /></datalist>
            <p class="crm-inline-note">Для ночной смены укажите окончание на следующий день. Перерыв вычитается из плановой длительности. Выходной и отсутствие занимают один полный день и не добавляют рабочие часы.</p>
            <label class="crm-field">Примечание<textarea v-model="draft.note" class="crm-input" rows="3" maxlength="1000" placeholder="Место работы или условия смены. Не указывайте медицинские диагнозы." /></label>
          </fieldset>
          <label v-if="selected && (editable || selected.canPublish || selected.canCancel)" class="crm-field">Причина изменения<input v-model="reason" class="crm-input" maxlength="500" :disabled="saving" placeholder="Обязательна для изменения, публикации или отмены" /></label>
          <div v-if="selected?.canPublish || selected?.canCancel" class="crm-action-bar"><button v-if="selected.canPublish" class="crm-button" type="button" :disabled="saving" @click="transition('PUBLISHED')">Опубликовать</button><button v-if="selected.canCancel" class="crm-button crm-button--danger" type="button" :disabled="saving" @click="transition('CANCELLED')">Отменить запись</button></div>
        </template>
        <section v-else class="crm-stack" aria-label="История графика"><h3>История изменений</h3><p class="crm-inline-note">Последние 50 событий. Сотруднику доступны события публикации и отмены своего графика.</p><article v-for="event in selected?.events" :key="event.version" class="crm-item-card crm-stack"><strong>{{ actions[event.action] }} · Версия {{ event.version }}</strong><span>{{ event.actorName }} · {{ new Date(event.createdAt).toLocaleString('ru-RU') }}</span><p>{{ event.reason }}</p></article><p v-if="!selected?.events?.length">Событий пока нет.</p></section>
      </div>
      <footer class="crm-detail-footer"><button class="crm-button" type="button" :disabled="saving" @click="close">Закрыть</button><button v-if="editable && tab === 'general'" class="crm-button crm-button--primary" type="submit" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Сохранить черновик' }}</button></footer>
    </form></div></Teleport>
  </main>
</template>
