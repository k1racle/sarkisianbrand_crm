<script setup lang="ts">
import { requestKey as createRequestKey } from '~/shared/request-key';
import { Plus, X } from '@lucide/vue';
type Person = { id: string; firstName?: string; lastName?: string; canAssign?: boolean };
type Pattern = { id: string; employeeId: string; employee: Person; departmentName: string; label: string; pattern: string; startDate: string; endDate: string | null; startTime: string; endTime: string; timezone: string; breakMinutes: number; note: string; status: string; version: number; today: string; canPublish: boolean; canEnd: boolean; canCancel: boolean; events?: { version: number; action: string; actorName: string; reason: string; createdAt: string }[] };
type Preview = { from: string; to: string; permanent: boolean; label: string; issues: { date: string; message: string }[]; items: { occurrenceDate: string; kind: string; startLocal: string; endLocal: string; plannedMinutes: number; overridden: boolean }[] };
const props = defineProps<{ patterns: Pattern[]; people: Person[]; canCreate: boolean; canPublish: boolean; month: string }>();
const emit = defineEmits(['changed']);
const session = useWorkspaceSession(), config = useRuntimeConfig();
const request = <T,>(path = '', options: any = {}) => $fetch<T>('/crm/work-schedule/patterns' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 15000, retry: 0, ...options });
const labels: Record<string, string> = { WEEKDAYS: '5/2 — понедельник–пятница', CYCLE_5_2: '5/2 — цикл от даты начала', CYCLE_2_2: '2/2 — два рабочих, два выходных', CYCLE_3_3: '3/3 — три рабочих, три выходных' };
const statuses: Record<string, string> = { DRAFT: 'Черновик', PUBLISHED: 'Опубликован', CANCELLED: 'Отменён' };
const actions: Record<string, string> = { CREATE: 'Создан шаблон', PUBLISH: 'Применён график', END: 'Задано окончание', CANCEL: 'Отменён шаблон' };
const opened = ref(false), busy = ref(false), error = ref(''), formError = ref(''), selected = ref<Pattern | null>(null), tab = ref('general');
const baseline = ref(''), requestKey = ref(''), preview = ref<Preview | null>(null), previewSignature = ref(''), reason = ref(''), lastDate = ref('');
const draft = reactive({ employeeId: '', pattern: 'WEEKDAYS', startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', timezone: 'Europe/Moscow', breakMinutes: 60, note: '', status: 'PUBLISHED' });
const dirty = computed(() => opened.value && (selected.value ? Boolean(reason.value.trim()) || lastDate.value !== (selected.value.endDate || (selected.value.startDate > selected.value.today ? selected.value.startDate : selected.value.today)) : baseline.value !== JSON.stringify(draft)));
const previewCurrent = computed(() => preview.value && previewSignature.value === JSON.stringify(draft));
const candidates = computed(() => props.people.filter(person => person.canAssign));
const personName = (person: Person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || `Сотрудник ${person.id.slice(0,6)}`;
const dateLabel = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Не удалось выполнить действие. Введённые данные сохранены в форме.';
function fill(row: Pattern | null) {
  selected.value = row; formError.value = ''; reason.value = ''; preview.value = null; previewSignature.value = ''; tab.value = 'general';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = ['year','month','day'].map(key => parts.find(p => p.type === key)!.value).join('-');
  Object.assign(draft, { employeeId: row?.employeeId || candidates.value[0]?.id || '', pattern: row?.pattern || 'WEEKDAYS', startDate: row?.startDate || (props.month === today.slice(0,7) ? today : props.month + '-01'), endDate: row?.endDate || '', startTime: row?.startTime || '09:00', endTime: row?.endTime || '18:00', timezone: row?.timezone || 'Europe/Moscow', breakMinutes: row?.breakMinutes ?? 60, note: row?.note || '', status: row?.status || (props.canPublish ? 'PUBLISHED' : 'DRAFT') });
  lastDate.value = row ? row.endDate || (row.startDate > row.today ? row.startDate : row.today) : '';
  baseline.value = JSON.stringify(draft);
}
function create() { if (!props.canCreate || busy.value) return; fill(null); requestKey.value = createRequestKey(); opened.value = true; }
async function open(id: string) {
  if (busy.value) return; busy.value = true; error.value = '';
  try { fill(await request<Pattern>('/' + id)); opened.value = true; } catch (e) { error.value = message(e); } finally { busy.value = false; }
}
defineExpose({ open });
function leave() { return !busy.value && (!dirty.value || window.confirm('Изменения шаблона не сохранены. Закрыть без сохранения?')); }
function close() { if (leave()) opened.value = false; }
const { panel, keyboard } = useCatalogDialog(computed(() => opened.value), close);
function body() { return { ...draft, endDate: draft.endDate || null, breakMinutes: Number(draft.breakMinutes), requestKey: requestKey.value }; }
async function showPreview() {
  if (busy.value || selected.value) return; busy.value = true; formError.value = ''; preview.value = null;
  try { preview.value = await request<Preview>('/preview', { method: 'POST', body: body() }); previewSignature.value = JSON.stringify(draft); }
  catch (e) { formError.value = message(e); } finally { busy.value = false; }
}
async function save() {
  if (busy.value || selected.value || !previewCurrent.value || preview.value!.issues.length) return;
  if (!window.confirm(draft.status === 'PUBLISHED' ? 'Применить повторяющийся график? Он будет действовать с выбранной даты, ручные опубликованные записи сохранятся.' : 'Сохранить повторяющийся график как черновик?')) return;
  busy.value = true; formError.value = '';
  try { await request('', { method: 'POST', body: body() }); opened.value = false; emit('changed'); }
  catch (e) { formError.value = message(e); } finally { busy.value = false; }
}
async function action(target: string) {
  if (!selected.value || busy.value) return; formError.value = '';
  if (!reason.value.trim()) { formError.value = 'Укажите причину изменения шаблона.'; return; }
  if (!window.confirm(target === 'END' ? `Завершить график после ${dateLabel(lastDate.value)}? Предыдущие даты сохранятся.` : target === 'PUBLISH' ? 'Опубликовать постоянный график для сотрудника?' : 'Отменить этот шаблон?')) return;
  busy.value = true;
  try { await request('/' + selected.value.id + '/action', { method: 'POST', body: { action: target, version: selected.value.version, reason: reason.value.trim(), ...(target === 'END' ? { endDate: lastDate.value } : {}) } }); opened.value = false; emit('changed'); }
  catch (e) { formError.value = message(e); } finally { busy.value = false; }
}
async function reload() { if (selected.value && leave()) { const id = selected.value.id; busy.value = true; try { fill(await request<Pattern>('/' + id)); } catch (e) { formError.value = message(e); } finally { busy.value = false; } } }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(() => leave());
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
</script>

<template>
  <section class="crm-surface" aria-label="Повторяющиеся графики">
    <header class="crm-panel-header"><div><p>5/2 · 2/2 · 3/3</p><h2>Повторяющиеся графики</h2></div><button v-if="canCreate" class="crm-button crm-button--primary" :disabled="busy" @click="create"><Plus :size="18" />Применить шаблон</button></header>
    <div class="crm-register crm-stack">
      <p class="crm-inline-note">Назначьте шаблон один раз: смены и отдых появятся во всех следующих месяцах. Без даты окончания график действует постоянно. Здесь показаны все доступные шаблоны, независимо от выбранного месяца и состояния записей.</p>
      <p v-if="error" role="alert">{{ error }}</p><p v-if="busy && !opened" role="status">Открываем шаблон…</p>
      <article v-for="pattern in patterns" :key="pattern.id" class="crm-item-card crm-record"><span><strong>{{ personName(pattern.employee) }} · {{ pattern.label }}</strong><small>С {{ dateLabel(pattern.startDate) }}{{ pattern.endDate ? ' по ' + dateLabel(pattern.endDate) : ' · Постоянно' }}</small><small>{{ pattern.startTime }}–{{ pattern.endTime }} · {{ pattern.timezone }} · Перерыв {{ pattern.breakMinutes }} мин</small></span><span class="crm-badge" :data-status="pattern.status">{{ statuses[pattern.status] }}</span><button class="crm-button" :disabled="busy" :aria-label="`Открыть шаблон ${personName(pattern.employee)}, ${pattern.startDate}`" @click="open(pattern.id)">Открыть</button></article>
      <p v-if="!patterns.length" class="crm-empty">{{ canCreate ? 'Шаблоны пока не назначены. Выберите сотрудника, режим и первый день.' : 'Ваш опубликованный шаблон появится здесь после назначения.' }}</p>
    </div>
    <Teleport to="body"><div v-if="opened" class="admin-dialog-backdrop crm-detail-backdrop" @click.self="close"><form ref="panel" class="admin-dialog admin-dialog--drawer crm-detail-card" role="dialog" aria-modal="true" aria-labelledby="pattern-title" tabindex="-1" @keydown="keyboard" @submit.prevent="save">
      <header><div><p>Постоянный график</p><h2 id="pattern-title">{{ selected ? personName(selected.employee) + ' · ' + selected.label : 'Применить шаблон' }}</h2></div><button class="crm-button crm-button--icon" type="button" aria-label="Закрыть шаблон" :disabled="busy" @click="close"><X :size="18" /></button></header>
      <CrmCardTabs v-if="selected" v-model="tab" prefix="work-pattern" :tabs="[['general','Общее'],['history','История изменений']]" />
      <div :id="`work-pattern-${tab}-panel`" :role="selected ? 'tabpanel' : undefined" :aria-labelledby="selected ? `work-pattern-${tab}-tab` : undefined" class="admin-dialog-body crm-detail-body crm-stack">
        <div v-if="formError" role="alert" class="crm-stack"><p>{{ formError }}</p><button v-if="selected" class="crm-button" type="button" :disabled="busy" @click="reload">Загрузить актуальный шаблон</button></div>
        <template v-if="tab === 'general'">
          <p v-if="selected"><span class="crm-badge" :data-status="selected.status">{{ statuses[selected.status] }}</span> · Версия {{ selected.version }}</p>
          <fieldset class="ui-fieldset-reset crm-stack" :disabled="busy || Boolean(selected)">
            <label class="crm-field">Сотрудник<select v-model="draft.employeeId" class="crm-input" required><option value="" disabled>Выберите сотрудника</option><option v-for="person in selected ? [selected.employee] : candidates" :key="person.id" :value="person.id">{{ personName(person) }}</option></select></label>
            <label class="crm-field">Шаблон графика<select v-model="draft.pattern" class="crm-input"><option v-for="(label,key) in labels" :key="key" :value="key">{{ label }}</option></select></label>
            <div class="two"><label class="crm-field">Дата начала<input v-model="draft.startDate" class="crm-input" type="date" min="2000-01-01" max="2099-12-31" required /></label><label class="crm-field">Последний день (необязательно)<input v-model="draft.endDate" class="crm-input" type="date" :min="draft.startDate" max="2099-12-31" /></label></div>
            <p class="crm-inline-note">{{ draft.pattern === 'WEEKDAYS' ? 'Рабочие дни — понедельник–пятница, отдых — суббота и воскресенье. Дата начала включает график, даже если это выходной.' : 'Дата начала — первый рабочий день цикла. Чередование продолжается через границы месяцев и лет, не начинается заново с понедельника.' }} Пустая последняя дата — постоянно.</p>
            <div class="two"><label class="crm-field">Начало смены<input v-model="draft.startTime" class="crm-input" type="time" required /></label><label class="crm-field">Окончание смены<input v-model="draft.endTime" class="crm-input" type="time" required /></label></div>
            <p class="crm-inline-note">Если окончание не позже начала, смена заканчивается на следующий день. После ночной смены отдых начинается с её окончания. Праздники автоматически не исключаются.</p>
            <div class="two"><label class="crm-field">Перерыв, минут<input v-model="draft.breakMinutes" class="crm-input" type="number" min="0" max="1439" required /></label><label class="crm-field">Часовой пояс<input v-model="draft.timezone" class="crm-input" required maxlength="80" /></label></div>
            <label v-if="!selected" class="crm-field">Применение<select v-model="draft.status" class="crm-input"><option v-if="canPublish" value="PUBLISHED">Сразу опубликовать сотруднику</option><option value="DRAFT">Сохранить черновиком</option></select></label>
            <label class="crm-field">Примечание<textarea v-model="draft.note" class="crm-input" rows="2" maxlength="1000" /></label>
          </fieldset>
          <p class="crm-inline-note">Ручные опубликованные смены, выходные и отсутствия имеют приоритет: пересекающаяся запись шаблона пропускается целиком. Черновик ручной записи не отменяет опубликованную смену шаблона. Для исключения отдельного дня добавьте и опубликуйте ручную запись.</p>
          <template v-if="!selected">
            <button class="crm-button" type="button" :disabled="busy" @click="showPreview">Предпросмотр</button>
            <p v-if="preview && !previewCurrent" role="status">Параметры изменены. Обновите предпросмотр перед применением.</p>
            <section v-if="previewCurrent && preview" class="crm-stack" aria-label="Предпросмотр шаблона"><h3>С {{ dateLabel(preview.from) }} по {{ dateLabel(preview.to) }}</h3><p class="crm-inline-note">Это первые 35 дней, не ограничение действия шаблона. {{ preview.permanent ? 'График продолжится постоянно.' : 'Повторы закончатся выбранной датой.' }}</p><p>Рабочих смен: {{ preview.items.filter(item => item.kind === 'SHIFT' && !item.overridden).length }} · Приоритет ручных записей: {{ preview.items.filter(item => item.overridden).length }}</p>
              <p v-for="issue in preview.issues" :key="issue.date" role="alert">{{ dateLabel(issue.date) }}: {{ issue.message }}</p>
              <details><summary>Показать все дни предпросмотра</summary><div class="crm-stack"><article v-for="item in preview.items" :key="item.occurrenceDate" class="crm-item-card crm-record"><span><strong>{{ dateLabel(item.occurrenceDate) }}</strong><small>{{ item.kind === 'SHIFT' ? item.startLocal.slice(11) + '–' + item.endLocal.slice(11) : 'Отдых' }}</small></span><span>{{ item.overridden ? 'Ручная запись сохранится' : item.kind === 'SHIFT' ? item.plannedMinutes + ' мин работы' : 'Выходной' }}</span></article></div></details>
            </section>
          </template>
          <template v-else>
            <p class="crm-inline-note">Чтобы сменить режим или часы, завершите этот график и назначьте новый с нужной даты. Прошедшие дни не переписываются. Текущую ночную смену окончание графика не обрезает.</p>
            <label v-if="selected.canPublish || selected.canEnd || selected.canCancel" class="crm-field">Причина изменения<input v-model="reason" class="crm-input" maxlength="500" :disabled="busy" /></label>
            <label v-if="selected.canEnd" class="crm-field">Последний день этого графика<input v-model="lastDate" class="crm-input" type="date" :min="selected.startDate > selected.today ? selected.startDate : selected.today" :max="selected.endDate || '2099-12-31'" :disabled="busy" /></label>
            <div class="crm-action-bar"><button v-if="selected.canPublish" class="crm-button" type="button" :disabled="busy" @click="action('PUBLISH')">Опубликовать шаблон</button><button v-if="selected.canEnd" class="crm-button" type="button" :disabled="busy || !lastDate" @click="action('END')">Завершить график</button><button v-if="selected.canCancel" class="crm-button crm-button--danger" type="button" :disabled="busy" @click="action('CANCEL')">Отменить шаблон</button></div>
          </template>
        </template>
        <section v-else class="crm-stack" aria-label="История шаблона"><h3>История изменений</h3><article v-for="event in selected?.events" :key="event.version" class="crm-item-card crm-stack"><strong>{{ actions[event.action] }} · Версия {{ event.version }}</strong><span>{{ event.actorName }} · {{ new Date(event.createdAt).toLocaleString('ru-RU') }}</span><p>{{ event.reason }}</p></article><p class="crm-inline-note">Последние 50 доступных событий.</p></section>
      </div>
      <footer class="crm-detail-footer"><button class="crm-button" type="button" :disabled="busy" @click="close">Закрыть</button><button v-if="!selected" class="crm-button crm-button--primary" type="submit" :disabled="busy || !previewCurrent || Boolean(preview?.issues.length)">{{ busy ? 'Проверяем…' : draft.status === 'PUBLISHED' ? 'Применить график' : 'Сохранить шаблон' }}</button></footer>
    </form></div></Teleport>
  </section>
</template>
