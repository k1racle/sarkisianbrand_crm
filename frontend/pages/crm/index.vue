<script setup lang="ts">
import { AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, ContactRound, Kanban, ListTodo, MessageSquareText, Plus, RefreshCw, SlidersHorizontal } from '@lucide/vue';
import { calendarDay, type CrmMeeting } from '~/shared/crm-meetings';
import { DAY_WIDGETS, type DayWidgetId } from '~/shared/crm-day-widgets';
useHead({ title: 'Мой день — SARKISIAN CRM' });

const session = useWorkspaceSession();
const access = useWorkspaceAccess();
const { can } = access;
const allowedWidgets = computed<DayWidgetId[]>(() => DAY_WIDGETS.filter(widget => widget.id === 'calendar' ? can('meetings.read') : widget.id === 'clock' ? can('work_time.read') : widget.id === 'queue' ? can('crm.read') || can('meetings.read') : can('crm.read')).map(widget => widget.id));
const widgets = useCrmDayWidgets(allowedWidgets);
const draggedWidget = ref<DayWidgetId | null>(null);
watch(widgets.editing, editing => { if (!editing) draggedWidget.value = null; });
function moveWidget(id: DayWidgetId, direction: -1 | 1) { widgets.move(id, direction); void nextTick(() => document.querySelector<HTMLButtonElement>(`[data-day-widget="${id}"] .crm-day-widget-grip`)?.focus()); }
function startWidgetDrag(id: DayWidgetId, event: DragEvent) { if (!widgets.editing.value || !event.dataTransfer) return; draggedWidget.value = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/x-sarkisian-day-widget', id); }
function dropWidget(id: DayWidgetId) { if (draggedWidget.value) widgets.reorder(draggedWidget.value, id); draggedWidget.value = null; }
const dashboard = ref<any>(null);
const tasks = ref<any[]>([]);
const meetings = ref<CrmMeeting[]>([]);
const meetingTotal = ref(0);
const dashboardError = ref('');
const tasksError = ref('');
const meetingsError = ref('');
const dashboardLoading = ref(true);
const tasksLoading = ref(true);
const meetingsLoading = ref(true);
const clientReady = ref(false);
const now = ref(new Date());
const loading = computed(() => dashboardLoading.value || tasksLoading.value || meetingsLoading.value);
const today = computed(() => calendarDay(now.value));
const dayLabel = computed(() => now.value.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
const monthLabel = computed(() => now.value.toLocaleDateString('ru-RU', { month: 'long' }));
const taskStatus: Record<string, string> = { BACKLOG: 'В очереди', TODO: 'Запланирована', IN_PROGRESS: 'В работе', REVIEW: 'На проверке', OVERDUE: 'Просрочена', DONE: 'Выполнена', CANCELLED: 'В архиве' };
const money = (value: unknown) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(value || 0));
const person = (user: any) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Не назначен';
const validDate = (value?: string) => { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? date : null; };
const isLate = (task: any) => task.status === 'OVERDUE' || Boolean(validDate(task.dueDate) && validDate(task.dueDate)!.getTime() < now.value.getTime());
const activeTasks = computed(() => tasks.value.filter(task => !['DONE', 'CANCELLED'].includes(task.status)));
const overdueCount = computed(() => activeTasks.value.filter(isLate).length);
const dueTodayCount = computed(() => activeTasks.value.filter(task => { const date = validDate(task.dueDate); return date && calendarDay(date) === today.value; }).length);
const invitationMeetings = computed(() => meetings.value.filter(meeting => meeting.canRespond && !['ACCEPTED', 'DECLINED'].includes(meeting.myResponse || '')));
const timeLabel = (value: string) => validDate(value)?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) || '—';
function dueLabel(task: any) {
  const date = validDate(task.dueDate);
  if (!date) return 'Без срока';
  return calendarDay(date) === today.value ? `Сегодня, ${timeLabel(task.dueDate)}` : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
const queue = computed(() => [
  ...activeTasks.value.map(task => ({ id: `task-${task.id}`, kind: 'task', title: task.title, description: `${person(task.assignedTo)} · ${taskStatus[task.status] || 'Задача'}`, note: dueLabel(task), late: isLate(task), order: isLate(task) ? 0 : 1, due: validDate(task.dueDate)?.getTime() || Infinity, to: { path: '/crm/tasks', query: { task: task.id } }, action: 'Открыть' })),
  ...invitationMeetings.value.map(meeting => ({ id: `meeting-${meeting.id}`, kind: 'meeting', title: `Подтвердить участие: ${meeting.title}`, description: `${timeLabel(meeting.startsAt)} · ${meeting.location || (meeting.meetingUrl ? 'Онлайн-встреча' : 'Место не указано')}`, note: 'Приглашение', late: false, order: 1, due: validDate(meeting.startsAt)?.getTime() || Infinity, to: { path: '/crm/meetings', query: { meeting: meeting.id } }, action: 'Ответить' })),
].sort((a, b) => a.order - b.order || a.due - b.due || a.id.localeCompare(b.id)));
const visibleQueue = computed(() => queue.value.slice(0, 6));
const funnelMax = computed(() => Math.max(1, ...(dashboard.value?.funnel || []).map((stage: any) => Number(stage.count) || 0)));
const week = computed(() => {
  const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate() - (now.value.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index); return { key: calendarDay(date), date: date.getDate(), weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' }), label: date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) }; });
});
function responseLabel(meeting: CrmMeeting) {
  if (meeting.myResponse === 'DECLINED') return 'Вы не участвуете';
  if (meeting.canRespond && meeting.myResponse !== 'ACCEPTED') return 'Нужен ваш ответ';
  if (meeting.responses) return `Участвуют ${meeting.responses.accepted + 1} из ${meeting.members.length + 1}`;
  return meeting.myResponse === 'ACCEPTED' ? 'Вы участвуете' : 'Вы организатор';
}
function duration(meeting: CrmMeeting) {
  const start = validDate(meeting.startsAt), end = validDate(meeting.endsAt);
  return start && end ? `${Math.round((end.getTime() - start.getTime()) / 60000)} мин` : '';
}
const message = (error: any, fallback: string) => Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || fallback;
let loadVersion = 0;
let mounted = false;
let clock: ReturnType<typeof setInterval> | undefined;
function clear() { ++loadVersion; dashboard.value = null; tasks.value = []; meetings.value = []; meetingTotal.value = 0; dashboardError.value = ''; tasksError.value = ''; meetingsError.value = ''; dashboardLoading.value = false; tasksLoading.value = false; meetingsLoading.value = false; }
async function load() {
  const version = ++loadVersion;
  await access.ensure();
  if (!mounted || version !== loadVersion) return;
  widgets.hydrate();
  if (!widgets.ready.value) { dashboardLoading.value = false; tasksLoading.value = false; meetingsLoading.value = false; return; }
  const actor = session.generation.value;
  const current = () => mounted && version === loadVersion && actor === session.generation.value;
  dashboardError.value = ''; tasksError.value = ''; meetingsError.value = '';
  const needDashboard = can('crm.read') && ['results', 'funnel', 'interactions'].some(id => widgets.isEnabled(id as DayWidgetId));
  const needTasks = can('crm.read') && widgets.isEnabled('queue');
  const needMeetings = can('meetings.read') && (widgets.isEnabled('calendar') || widgets.isEnabled('queue'));
  dashboardLoading.value = needDashboard; tasksLoading.value = needTasks; meetingsLoading.value = needMeetings;
  const jobs: Promise<unknown>[] = [];
  if (needDashboard) {
    jobs.push(session.request('/crm/dashboard').then(value => { if (current() && can('crm.read')) dashboard.value = value; }).catch(error => { if (current()) { dashboard.value = null; dashboardError.value = message(error, 'Не удалось загрузить показатели продаж'); } }).finally(() => { if (current()) dashboardLoading.value = false; }));
  }
  if (needTasks) {
    jobs.push(session.request<any[]>('/crm/tasks').then(value => { if (current() && can('crm.read')) tasks.value = Array.isArray(value) ? value : []; }).catch(error => { if (current()) { tasks.value = []; tasksError.value = message(error, 'Не удалось загрузить задачи'); } }).finally(() => { if (current()) tasksLoading.value = false; }));
  }
  if (needMeetings) {
    const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const query = { from: start.toISOString(), to: end.toISOString(), status: 'SCHEDULED', mine: 'true', page: 1, limit: 100 };
    const readMeetings = async () => {
      const value = await session.request<{ items: CrmMeeting[]; total: number; pages: number }>('/crm/meetings', { query });
      for (let page = 2; page <= value.pages; page++) {
        if (!current() || !can('meetings.read')) return;
        const more = await session.request<{ items: CrmMeeting[] }>('/crm/meetings', { query: { ...query, page } });
        value.items.push(...more.items);
      }
      if (current() && can('meetings.read')) { meetings.value = [...value.items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()); meetingTotal.value = value.total; }
    };
    jobs.push(readMeetings().catch(error => { if (current()) { meetings.value = []; meetingTotal.value = 0; meetingsError.value = message(error, 'Не удалось загрузить встречи'); } }).finally(() => { if (current()) meetingsLoading.value = false; }));
  }
  await Promise.allSettled(jobs);
}
function tick() { const previousDay = today.value; now.value = new Date(); if (today.value !== previousDay) void load(); }
watch(() => [session.generation.value, access.ready.value, can('crm.read'), can('meetings.read')], () => { clear(); if (mounted) void load(); });
watch(() => widgets.saved.value.filter(widget => widget.visible).map(widget => widget.id).sort().join(','), () => { clear(); if (mounted) void load(); });
const protectLayout = (event: BeforeUnloadEvent) => { if (widgets.dirty.value) { event.preventDefault(); event.returnValue = ''; } };
onBeforeRouteLeave(() => !widgets.dirty.value || window.confirm('Изменения вида рабочего стола не сохранены. Выйти без сохранения?'));
onMounted(() => { mounted = true; clientReady.value = true; now.value = new Date(); void load(); clock = setInterval(tick, 60000); window.addEventListener('focus', tick); window.addEventListener('beforeunload', protectLayout); });
onBeforeUnmount(() => { mounted = false; clear(); clearInterval(clock); window.removeEventListener('focus', tick); window.removeEventListener('beforeunload', protectLayout); });
</script>

<template>
  <main class="crm-main crm-day-page">
    <header class="crm-day-head">
      <div><h1>Мой день</h1><p v-if="clientReady" class="crm-day-date">{{ dayLabel }} · всё важное для вашей работы</p></div>
      <div class="crm-day-head-actions">
        <button class="crm-button crm-button--icon" :disabled="loading" aria-label="Обновить рабочий стол" title="Обновить рабочий стол" @click="load"><RefreshCw :size="18" :class="{ 'crm-day-refreshing': loading }" /></button>
        <button v-if="access.ready.value && !widgets.editing.value" class="crm-button crm-day-customize" @click="widgets.begin"><SlidersHorizontal :size="18" />Настроить вид</button>
        <details v-if="can('crm.write')" class="crm-day-create">
          <summary class="crm-button crm-button--primary">Создать <Plus :size="18" /></summary>
          <nav aria-label="Создание в CRM">
            <NuxtLink v-if="can('crm.write')" to="/crm/tasks?create=1"><ListTodo :size="18" />Задачу</NuxtLink>
            <NuxtLink v-if="can('crm.write')" to="/crm/deals?create=1"><Kanban :size="18" />Сделку</NuxtLink>
          </nav>
        </details>
      </div>
    </header>

    <div v-if="access.error.value" class="crm-day-notice" role="alert"><AlertTriangle :size="20" /><p>{{ access.error.value }}</p><button class="crm-button" @click="load">Повторить</button></div>
    <template v-else-if="access.ready.value">
      <section v-if="widgets.editing.value" class="crm-day-editor" aria-labelledby="crm-day-editor-title">
        <div class="crm-day-editor-heading"><div><h2 id="crm-day-editor-title">Настройте свой рабочий стол</h2><p>Перетаскивайте виджеты за ручку, используйте кнопки выше/ниже или Alt + стрелки на ручке. Ширина применяется на компьютере; на телефоне виджеты идут друг под другом.</p><p>Настройки сохраняются для вашего аккаунта только в этом браузере.</p></div><div class="crm-day-editor-actions"><button class="crm-button" @click="widgets.reset">Стандартный вид</button><button class="crm-button" @click="widgets.cancel">Отмена</button><button class="crm-button crm-button--primary" @click="widgets.save">Сохранить</button></div></div>
        <details class="crm-day-widget-catalog" open><summary>Виджеты рабочего стола</summary><div><label v-for="widget in widgets.available.value" :key="widget.id"><input class="crm-check" type="checkbox" :checked="widget.visible" @change="widgets.setVisible(widget.id, ($event.target as HTMLInputElement).checked)" /><span>{{ DAY_WIDGETS.find(definition => definition.id === widget.id)?.title }}</span></label></div></details>
      </section>
      <p v-if="widgets.storageWarning.value" class="crm-day-layout-warning" role="alert">{{ widgets.storageWarning.value }}</p>
      <p v-if="widgets.notice.value" class="crm-day-layout-notice" role="status" aria-live="polite">{{ widgets.notice.value }}</p>
      <p v-if="!widgets.ready.value" class="crm-day-placeholder" role="status">Загружаем вид рабочего стола…</p>
      <div v-else-if="widgets.visible.value.length" class="crm-day-widgets" :class="{ 'crm-day-widgets--editing': widgets.editing.value }">
        <CrmDayWidget v-for="(widget, index) in widgets.visible.value" :key="widget.id" :id="widget.id" :width="widget.width" :editing="widgets.editing.value" :first="index === 0" :last="index === widgets.visible.value.length - 1" :dragging="draggedWidget === widget.id" :pending="widgets.editing.value && !widgets.isEnabled(widget.id)" @move="moveWidget(widget.id, $event)" @width="widgets.setWidth(widget.id, $event)" @hide="widgets.setVisible(widget.id, false)" @start-drag="startWidgetDrag(widget.id, $event)" @end-drag="draggedWidget = null" @drop-widget="dropWidget(widget.id)">
          <template v-if="widget.id === 'queue'">
<section v-if="can('crm.read') || can('meetings.read')" class="crm-day-queue" aria-labelledby="crm-day-queue-title" :aria-busy="tasksLoading || meetingsLoading">
          <header class="crm-day-section-head"><h2 id="crm-day-queue-title">Требует внимания <span v-if="!tasksLoading && !meetingsLoading" class="crm-day-count">{{ queue.length }}</span></h2><span class="crm-day-scope">Задачи и приглашения</span></header>
          <div v-if="tasksError" class="crm-day-notice" role="alert"><AlertTriangle :size="18" /><p>{{ tasksError }}</p><button class="crm-button" @click="load">Повторить</button></div>
          <div v-if="meetingsError && !widgets.isEnabled('calendar')" class="crm-day-notice" role="alert"><AlertTriangle :size="18" /><p>Не удалось обновить приглашения: {{ meetingsError }}</p><button class="crm-button" @click="load">Повторить</button></div>
          <div v-if="visibleQueue.length" class="crm-day-queue-items">
            <article v-for="(item, index) in visibleQueue" :key="item.id" class="crm-day-action" :class="{ 'crm-day-action--late': item.late }">
              <span class="crm-day-action-icon"><CalendarDays v-if="item.kind === 'meeting'" :size="18" /><AlertTriangle v-else-if="item.late" :size="18" /><ClipboardList v-else :size="18" /></span>
              <div class="crm-day-action-copy"><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div>
              <div class="crm-day-action-target"><NuxtLink :to="item.to" class="crm-button" :class="index === 0 ? 'crm-button--primary' : 'crm-button--text'" :aria-label="`${item.action}: ${item.title}`">{{ item.action }}<ArrowRight :size="16" /></NuxtLink><span :class="{ 'crm-day-late': item.late }">{{ item.note }}</span></div>
            </article>
          </div>
          <p v-else-if="tasksLoading || meetingsLoading" class="crm-day-placeholder" role="status">Собираем ближайшие задачи и приглашения…</p>
          <div v-else-if="!tasksError && !meetingsError" class="crm-day-empty"><CheckCircle2 :size="28" /><h3>Всё под контролем</h3><p>Нет активных задач и приглашений, ожидающих ответа.</p><NuxtLink v-if="can('crm.write')" to="/crm/tasks?create=1" class="crm-button">Запланировать задачу</NuxtLink></div>
          <p v-else class="crm-day-placeholder">Список действий загружен не полностью. Повторите загрузку недоступного раздела.</p>
          <footer class="crm-day-queue-footer"><span v-if="can('crm.read') && !tasksLoading && !tasksError">Просрочено: {{ overdueCount }} · на сегодня: {{ dueTodayCount }}</span><NuxtLink v-if="can('crm.read')" to="/crm/tasks" class="crm-button crm-button--text">Все задачи<ArrowUpRight :size="16" /></NuxtLink></footer>
        </section>
</template>
<template v-if="widget.id === 'calendar'">
<aside v-if="can('meetings.read')" class="crm-day-agenda" aria-labelledby="crm-day-agenda-title" :aria-busy="meetingsLoading">
          <header class="crm-day-section-head"><h2 id="crm-day-agenda-title">В календаре</h2><NuxtLink to="/crm/meetings" class="crm-button crm-button--icon" aria-label="Открыть календарь событий"><ArrowUpRight :size="18" /></NuxtLink></header>
          <div class="crm-day-week" aria-label="Текущая неделя"><div v-for="day in week" :key="day.key" :class="{ current: day.key === today }" :aria-current="day.key === today ? 'date' : undefined" :title="day.label"><span>{{ day.weekday }}</span><strong>{{ day.date }}</strong></div></div>
          <div v-if="meetingsError" class="crm-day-notice" role="alert"><AlertTriangle :size="18" /><p>{{ meetingsError }}</p><button class="crm-button" @click="load">Повторить</button></div>
          <p v-else-if="meetingsLoading" class="crm-day-placeholder" role="status">Загружаем встречи на сегодня…</p>
          <div v-else-if="meetings.length" class="crm-day-meetings">
            <NuxtLink v-for="meeting in meetings.slice(0, 4)" :key="meeting.id" :to="{ path: '/crm/meetings', query: { meeting: meeting.id } }" class="crm-day-meeting">
              <div class="crm-day-meeting-time"><strong>{{ timeLabel(meeting.startsAt) }}</strong><span>{{ duration(meeting) }}</span></div><div class="crm-day-meeting-copy"><h3>{{ meeting.title }}</h3><p>{{ meeting.location || (meeting.meetingUrl ? 'Онлайн-встреча' : 'Место не указано') }}</p><span :class="{ pending: meeting.canRespond && !['ACCEPTED', 'DECLINED'].includes(meeting.myResponse || '') }">{{ responseLabel(meeting) }}</span></div>
            </NuxtLink>
            <p v-if="meetingTotal > 4" class="crm-day-more">Всего на сегодня: {{ meetingTotal }}. Все события — в календаре.</p>
          </div>
          <div v-else class="crm-day-agenda-empty"><CalendarDays :size="24" /><p>На сегодня встреч нет</p><span>Свободное время для ваших задач.</span></div>
          <NuxtLink to="/crm/meetings" class="crm-button crm-day-calendar-link">Открыть календарь</NuxtLink>
        </aside>
</template>
<template v-if="widget.id === 'results'">
<section v-if="can('crm.read')" class="crm-day-results" aria-labelledby="crm-day-results-title" :aria-busy="dashboardLoading">
        <header class="crm-day-section-head"><h2 id="crm-day-results-title">Результаты · {{ monthLabel }}</h2><NuxtLink to="/crm/deals" class="crm-button crm-button--text">К сделкам<ArrowUpRight :size="16" /></NuxtLink></header>
        <div v-if="dashboardError" class="crm-day-notice" role="alert"><AlertTriangle :size="18" /><p>{{ dashboardError }}</p><button class="crm-button" @click="load">Повторить</button></div>
        <p v-else-if="dashboardLoading && !dashboard" class="crm-day-placeholder" role="status">Загружаем показатели продаж…</p>
        <div v-else-if="dashboard" class="crm-day-result-grid">
          <article :class="{ 'crm-day-metric-wide': money(dashboard.wonMonth?.amount).length > 12 }"><h3>Продано за месяц</h3><strong>{{ money(dashboard.wonMonth?.amount) }}</strong><p>{{ dashboard.wonMonth?.count || 0 }} успешных сделок</p></article>
          <article :class="{ 'crm-day-metric-wide': money(dashboard.forecast).length > 12 }"><h3>Прогноз продаж</h3><strong>{{ money(dashboard.forecast) }}</strong><p>Взвешенная сумма открытых сделок</p></article>
          <article><h3>Открытые сделки</h3><strong>{{ dashboard.openLeads }}</strong><p>{{ !can('customers.read') || dashboard.customersAvailable === false ? 'База клиентов недоступна по вашим правам' : `${dashboard.customers} клиентов в единой базе` }}</p></article>
          <article><h3>Контроль задач</h3><strong :class="{ 'crm-day-late': dashboard.overdueTasks }">{{ dashboard.overdueTasks }} <span>просрочено</span></strong><p>{{ dashboard.dueToday }} на сегодня</p></article>
        </div>
      </section>
</template>
<template v-if="widget.id === 'clock'">
<div v-if="can('work_time.read')" class="crm-day-clock"><CrmWorkClock compact /></div>
</template>
<template v-if="widget.id === 'funnel'">
<section aria-labelledby="crm-day-funnel-title">
  <header class="crm-day-section-head"><h2 id="crm-day-funnel-title">Продажи по этапам</h2><NuxtLink to="/crm/deals" class="crm-button crm-button--text">Воронка<ArrowUpRight :size="16" /></NuxtLink></header>
  <div v-if="dashboardError" class="crm-day-notice" role="alert"><p>{{ dashboardError }}</p><button class="crm-button" @click="load">Повторить</button></div>
  <p v-else-if="dashboardLoading && !dashboard" class="crm-day-placeholder" role="status">Загружаем воронку продаж…</p>
  <div v-else-if="dashboard?.funnel?.length" class="crm-day-funnel"><NuxtLink v-for="stage in dashboard.funnel" :key="stage.id" to="/crm/deals"><span class="crm-day-stage-name"><i :style="{ background: stage.color }"></i>{{ stage.name }}</span><span class="crm-day-stage-values"><strong>{{ stage.count }}</strong><span>{{ money(stage.amount) }}</span></span><span class="crm-day-bar"><i :style="{ width: `${Math.max(stage.count ? 8 : 0, stage.count / funnelMax * 100)}%`, background: stage.color }"></i></span></NuxtLink></div>
  <p v-else class="crm-day-placeholder">Здесь появятся этапы и суммы сделок после настройки воронки продаж.</p>
</section>
</template>
<template v-if="widget.id === 'interactions'">
<section aria-labelledby="crm-day-activity-title">
  <header class="crm-day-section-head"><h2 id="crm-day-activity-title">Последние контакты</h2></header>
  <div v-if="dashboardError" class="crm-day-notice" role="alert"><p>{{ dashboardError }}</p><button class="crm-button" @click="load">Повторить</button></div>
  <p v-else-if="dashboardLoading && !dashboard" class="crm-day-placeholder" role="status">Загружаем историю контактов…</p>
  <div v-else-if="dashboard?.recentInteractions?.length" class="crm-day-interactions"><NuxtLink v-for="item in dashboard.recentInteractions.slice(0, 4)" :key="item.id" to="/crm/deals"><MessageSquareText :size="18" /><div><h3>{{ item.lead?.title || item.lead?.contactName || 'Контакт с клиентом' }}</h3><p>{{ item.content }}</p><span>{{ person(item.user) }} · {{ new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span></div></NuxtLink></div>
  <p v-else class="crm-day-placeholder">История появится после первого звонка, письма или заметки в сделке.</p>
</section>
</template>
<template v-if="widget.id === 'shortcuts'">
<nav v-if="can('crm.read')" class="crm-day-shortcuts" aria-label="Рабочие разделы"><NuxtLink to="/crm/deals"><Kanban :size="18" />Воронка продаж<ArrowUpRight :size="16" /></NuxtLink><NuxtLink v-if="can('customers.read')" to="/crm/customers"><ContactRound :size="18" />Клиенты 360°<ArrowUpRight :size="16" /></NuxtLink><NuxtLink to="/crm/tasks"><ListTodo :size="18" />Задачи<ArrowUpRight :size="16" /></NuxtLink></nav>
</template>
        </CrmDayWidget>
      </div>
      <div v-else class="crm-day-empty crm-day-all-hidden"><SlidersHorizontal :size="28" /><h2>Рабочий стол свободен</h2><p>Выберите виджеты, которые помогают вам в работе.</p><button v-if="!widgets.editing.value" class="crm-button" @click="widgets.begin">Добавить виджеты</button></div>

    </template>
    <p v-else class="crm-day-placeholder" role="status">Проверяем доступ к рабочему столу…</p>
  </main>
</template>
