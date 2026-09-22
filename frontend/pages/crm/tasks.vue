<script setup lang="ts">
useHead({ title: 'Задачи — SARKISIAN CRM' });
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GanttChartSquare,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  ListChecks,
  CornerDownRight,
} from "@lucide/vue";
const config = useRuntimeConfig(),
  route = useRoute();
const { token } = useWorkspaceSession();
const { openContextMenu } = useContextMenu();
const tasks = ref<any[]>([]),
  team = ref<any[]>([]),
  leads = ref<any[]>([]),
  loading = ref(true),
  view = ref("kanban"),
  search = ref(""),
  selected = ref<any>(null),
  dialog = ref(false),
  automationOpen = ref(false),
  saving = ref(false),
  notice = ref(""),
  comment = ref(""),
  dragged = ref(""),
  month = ref(new Date());
const error = ref("");
const selectedBaseline = ref("");
const cardTab = ref('general');
const {panel:taskPanel,keyboard:taskKeys}=useCatalogDialog(computed(()=>!!selected.value),()=>{closeTask();});
const createBaseline = ref("");
const subtaskTitle = ref(''), subtaskAssignee = ref(''), attachmentBusy = ref(false), commentLoading = ref(false);
const { can } = useWorkspaceAccess();
const writable = computed(() => can('crm.write'));
const cardDrag = useCrmCardDrag((id, status, beforeId) => reorderTask(id, status, beforeId));
const taskChildren = computed(() => selected.value?.children || []);
const dirty = computed(() => !!selected.value && JSON.stringify(selected.value) !== selectedBaseline.value);
const createDirty = computed(() => dialog.value && JSON.stringify(draft) !== createBaseline.value);
const cloneTask = (task: any) => {
  const copy = JSON.parse(JSON.stringify(task));
  for (const field of ["startDate", "dueDate"]) copy[field] = copy[field] ? String(copy[field]).slice(0, 10) : "";
  return copy;
};
function openTask(task: any) {
  if (!task) return;
  if (!task || saving.value || !closeTask()) return;
  cardTab.value = 'general';
  selected.value = cloneTask(tasks.value.find(item => item.id === task.id) || task);
  selectedBaseline.value = JSON.stringify(selected.value);
  subtaskTitle.value = ''; subtaskAssignee.value = selected.value.assignedToId;
  error.value = "";
}
function canDiscard() {
  return !saving.value && !attachmentBusy.value && (!(dirty.value || createDirty.value || comment.value.trim() || subtaskTitle.value.trim()) || window.confirm("Отменить несохранённые изменения и текст комментария?"));
}
function closeTask() {
  if (!canDiscard()) return false;
  selected.value = null; selectedBaseline.value = ""; comment.value = ""; subtaskTitle.value = '';
  return true;
}
function closeCreate() {
  if (!canDiscard()) return false;
  dialog.value = false;
  return true;
}
function failure(exception: any) {
  error.value = Array.isArray(exception?.data?.message) ? exception.data.message.join(", ") : exception?.data?.message || "Не удалось выполнить действие. Изменения не сохранены — повторите попытку.";
}
function commitTask(task: any) {
  tasks.value = tasks.value.map(item => item.id === task.id ? JSON.parse(JSON.stringify(task)) : item);
}
onBeforeRouteLeave(() => canDiscard());
const draft = reactive<any>({
  title: "",
  description: "",
  assignedToId: "",
  leadId: "",
  status: "TODO",
  priority: "MEDIUM",
  progress: 0,
  startDate: "",
  dueDate: "",
  estimateMinutes: 60,
  labels: "",
  reminderBeforeMinutes: 60,
});
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const columns = [
  { id: "BACKLOG", label: "Бэклог", color: "#8b8f98" },
  { id: "TODO", label: "К выполнению", color: "#4f7dcf" },
  { id: "IN_PROGRESS", label: "В работе", color: "#d58a35" },
  { id: "REVIEW", label: "Проверка", color: "#7f65c7" },
  { id: "OVERDUE", label: "Просрочено", color: "#bb5145" },
  { id: "DONE", label: "Готово", color: "#2d9568" },
];
const priorityLabels: any = {
  LOW: "Низкий",
  MEDIUM: "Обычный",
  HIGH: "Высокий",
  CRITICAL: "Критичный",
};
const filtered = computed(() =>
  tasks.value.filter(
    (t) =>
      !search.value ||
      `${t.title} ${t.description || ""} ${t.assignedTo?.email || ""}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const boardTasks = computed(() => filtered.value.filter(task => search.value || !task.parentId));
const monthLabel = computed(() =>
  month.value.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
);
const calendarDays = computed(() => {
  const y = month.value.getFullYear(),
    m = month.value.getMonth(),
    first = new Date(y, m, 1),
    offset = (first.getDay() + 6) % 7,
    total = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    const date = new Date(y, m, day);
    return {
      date,
      inside: day >= 1 && day <= total,
      tasks: filtered.value.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate).toDateString() === date.toDateString(),
      ),
    };
  });
});
const ganttRange = computed(() => {
  const dates = filtered.value.flatMap((t) =>
    [t.startDate, t.dueDate]
      .filter(Boolean)
      .map((x: string) => new Date(x).getTime()),
  );
  const start = dates.length ? Math.min(...dates) : Date.now();
  const end = dates.length ? Math.max(...dates) : Date.now() + 30 * 864e5;
  return {
    start: new Date(start - 864e5),
    end: new Date(Math.max(end + 864e5, start + 14 * 864e5)),
  };
});
function ganttStyle(t: any) {
  const s = new Date(t.startDate || t.createdAt).getTime(),
    e = new Date(t.dueDate || t.startDate || t.createdAt).getTime() + 864e5,
    total = ganttRange.value.end.getTime() - ganttRange.value.start.getTime();
  return {
    left: `${Math.max(0, ((s - ganttRange.value.start.getTime()) / total) * 100)}%`,
    width: `${Math.max(2, ((e - s) / total) * 100)}%`,
  };
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    [tasks.value, team.value, leads.value] = await Promise.all([
      $fetch("/crm/tasks", {
        baseURL: config.public.apiBase,
        headers: headers.value,
      }),
      $fetch<any[]>("/crm/team", {
        baseURL: config.public.apiBase,
        headers: headers.value,
      }),
      $fetch<any[]>("/crm/leads", {
        baseURL: config.public.apiBase,
        headers: headers.value,
      }),
    ]);
  } catch (exception: any) {
    failure(exception);
  } finally {
    loading.value = false;
  }
}
function flash(v: string) {
  notice.value = v;
  setTimeout(() => (notice.value = ""), 2300);
}
function person(u: any) {
  return (
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.email ||
    "Не назначен"
  );
}
function openCreate(seed: any = {}) {
  if (saving.value || !closeTask()) return;
  Object.assign(draft, {
    title: "",
    description: "",
    assignedToId: team.value[0]?.id || "",
    leadId: "",
    status: "TODO",
    priority: "MEDIUM",
    progress: 0,
    startDate: "",
    dueDate: "",
    estimateMinutes: 60,
    labels: "",
    reminderBeforeMinutes: 60,
    ...seed,
  });
  dialog.value = true;
  createBaseline.value = JSON.stringify(draft);
}
async function createTask() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/crm/tasks", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: headers.value,
      body: {
        ...draft,
        assignedToId: draft.assignedToId || undefined,
        leadId: draft.leadId || undefined,
        startDate: draft.startDate
          ? new Date(draft.startDate).toISOString()
          : undefined,
        dueDate: draft.dueDate
          ? new Date(draft.dueDate).toISOString()
          : undefined,
        estimateMinutes: Number(draft.estimateMinutes || 0) || undefined,
        reminderBeforeMinutes: Number(draft.reminderBeforeMinutes),
        labels: String(draft.labels || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      },
    });
    dialog.value = false;
    await load();
    flash("Задача создана");
  } catch (exception: any) {
    failure(exception);
  } finally {
    saving.value = false;
  }
}
async function patchTask(id: string, body: any) {
  const updated = await $fetch<any>(`/crm/tasks/${id}`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: headers.value,
    body,
  });
  commitTask(updated);
  return updated;
}
async function moveTask(id: string, status: string) {
  if (!id || saving.value || tasks.value.find(item => item.id === id)?.status === status) return;
  if (selected.value?.id === id && !canDiscard()) return;
  saving.value = true; error.value = "";
  try {
    const updated = await patchTask(id, { status });
    if (selected.value?.id === id) {
      selected.value = cloneTask(updated); selectedBaseline.value = JSON.stringify(selected.value); comment.value = "";
    }
    await refreshRelated();
    flash("Статус задачи изменён");
  } catch (exception: any) { failure(exception); }
  finally { saving.value = false; dragged.value = ""; }
}
async function refreshRelated() {
  try { tasks.value = await $fetch<any[]>('/crm/tasks', { baseURL: config.public.apiBase, headers: headers.value }); }
  catch { error.value = 'Изменения сохранены, но обновить список не удалось. Нажмите «Обновить».'; return; }
  const fresh = tasks.value.find(task => task.id === selected.value?.id);
  if (fresh && selected.value) {
    const baseline = JSON.parse(selectedBaseline.value);
    for (const field of ['children', 'progress', '_count']) { selected.value[field] = fresh[field]; baseline[field] = fresh[field]; }
    if (baseline.status === 'DONE' && fresh.status !== 'DONE') { selected.value.status = fresh.status; baseline.status = fresh.status; }
    selectedBaseline.value = JSON.stringify(baseline);
  }
}
async function reorderTask(id: string, status: string, beforeId?: string) {
  if (!id || saving.value || !writable.value || id === beforeId) return;
  saving.value = true; error.value = '';
  try {
    const updated = await $fetch<any>(`/crm/tasks/${id}/move`, { baseURL: config.public.apiBase, headers: headers.value, method: 'POST', body: { status, beforeId } });
    commitTask(updated);
    await refreshRelated(); flash('Задача перемещена');
  } catch (e) { failure(e); } finally { saving.value = false; cardDrag.finish(); }
}
async function addSubtask() {
  if (!selected.value || saving.value || !subtaskTitle.value.trim()) return;
  saving.value = true; error.value = '';
  try {
    await $fetch('/crm/tasks', { baseURL: config.public.apiBase, headers: headers.value, method: 'POST', body: { title: subtaskTitle.value.trim(), parentId: selected.value.id, assignedToId: subtaskAssignee.value || selected.value.assignedToId, leadId: selected.value.leadId || undefined } });
    subtaskTitle.value = ''; await refreshRelated(); flash('Подзадача создана');
  } catch (e) { failure(e); } finally { saving.value = false; }
}
async function toggleSubtask(task: any) {
  if (saving.value) return; saving.value = true; error.value = '';
  try { await patchTask(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' }); await refreshRelated(); }
  catch (e) { failure(e); } finally { saving.value = false; }
}
async function moreComments() {
  if (!selected.value || commentLoading.value) return;
  const id = selected.value.id; commentLoading.value = true;
  try {
    const rows = await $fetch<any[]>(`/crm/tasks/${id}/comments`, { baseURL: config.public.apiBase, headers: headers.value, query: { before: selected.value.comments?.at(-1)?.id } });
    if (selected.value?.id !== id) return;
    const baseline = JSON.parse(selectedBaseline.value);
    for (const target of [selected.value, baseline]) target.comments = [...(target.comments || []), ...rows.filter(row => !target.comments?.some((old: any) => old.id === row.id))];
    selectedBaseline.value = JSON.stringify(baseline);
  } catch (e) { failure(e); } finally { commentLoading.value = false; }
}
async function saveSelected() {
  if (!selected.value || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const updated = await $fetch<any>(`/crm/tasks/${selected.value.id}`, {
      baseURL: config.public.apiBase,
      method: "PATCH",
      headers: headers.value,
      body: {
        title: selected.value.title,
        description: selected.value.description || undefined,
        assignedToId: selected.value.assignedToId,
        status: selected.value.status,
        priority: selected.value.priority,
        progress: Number(selected.value.progress || 0),
        startDate: selected.value.startDate
          ? new Date(selected.value.startDate).toISOString()
          : undefined,
        dueDate: selected.value.dueDate
          ? new Date(selected.value.dueDate).toISOString()
          : undefined,
        estimateMinutes:
          Number(selected.value.estimateMinutes || 0) || undefined,
        leadId: selected.value.leadId || undefined,
        labels: selected.value.labels || [],
      },
    });
    commitTask(updated);
    selected.value = cloneTask(updated);
    selectedBaseline.value = JSON.stringify(selected.value);
    flash("Задача сохранена");
    await refreshRelated();
  } catch (exception: any) { failure(exception); }
  finally {
    saving.value = false;
  }
}
async function archiveTask(item: any) {
  if (saving.value || (selected.value?.id === item.id && !canDiscard())) return;
  saving.value = true; error.value = "";
  try {
    await $fetch(`/crm/tasks/${item.id}`, {
    baseURL: config.public.apiBase,
    method: "DELETE",
    headers: headers.value,
  });
    tasks.value = tasks.value.filter(task => task.id !== item.id);
    if (selected.value?.id === item.id) { selected.value = null; selectedBaseline.value = ""; comment.value = ""; }
    flash("Задача перенесена в архив");
    await refreshRelated();
  } catch (exception: any) { failure(exception); }
  finally { saving.value = false; }
}
function requestArchiveTask(item: any) {
  if (!saving.value && window.confirm("Перенести задачу в архив?")) void archiveTask(item);
}
async function addComment() {
  if (!selected.value || !comment.value.trim() || saving.value) return;
  const id = selected.value.id;
  saving.value = true; error.value = "";
  try {
    const created = await $fetch<any>(`/crm/tasks/${id}/comments`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: { body: comment.value },
  });
    comment.value = "";
    const task = tasks.value.find(item => item.id === id);
    if (task) commitTask({ ...task, comments: [created, ...(task.comments || [])], _count: { ...task._count, comments: Number(task._count?.comments || 0) + 1 } });
    const baseline = JSON.parse(selectedBaseline.value);
    for (const target of [selected.value, baseline]) {
      target.comments = [created, ...(target.comments || [])];
      target._count = { ...target._count, comments: Number(target._count?.comments || 0) + 1 };
    }
    selectedBaseline.value = JSON.stringify(baseline);
    flash("Комментарий добавлен");
  } catch (exception: any) { failure(exception); }
  finally { saving.value = false; }
}
function menu(e: MouseEvent, t: any) {
  openContextMenu(
    e,
    t.title,
    [
      {
        label: "Открыть задачу",
        icon: "open",
        action: () => openTask(t),
      },
      {
        label: "Отметить выполненной",
        icon: "status",
        action: () => moveTask(t.id, "DONE"),
      },
      {
        label: "Перенести в архив",
        icon: "archive",
        danger: true,
        separator: true,
        confirm: `Архивировать задачу «${t.title}»?`,
        action: () => archiveTask(t),
      },
    ],
    person(t.assignedTo),
  );
}
function shiftMonth(n: number) {
  month.value = new Date(
    month.value.getFullYear(),
    month.value.getMonth() + n,
    1,
  );
}
onMounted(async () => {
  await load();
  if (route.query.lead) openCreate({ leadId: String(route.query.lead) });
  else if (route.query.create) openCreate();
  else if (route.query.task)
    openTask(tasks.value.find((item) => item.id === String(route.query.task)));
});
</script>
<template>
  <main data-v-ui-acc13851dfa0 class="tasks-page crm-standard">
    <div data-v-ui-acc13851dfa0 v-if="error" class="operation-error" role="alert">{{ error }} <button class="crm-button" data-v-ui-acc13851dfa0 v-if="!selected && !dialog" :disabled="loading || saving" @click="load">Повторить загрузку</button></div>
    <WorkspaceLoading
      v-if="loading"
      label="Загружаем задачи команды"
    /><template v-else
      ><header data-v-ui-acc13851dfa0 class="page-head crm-page-header">
        <div data-v-ui-acc13851dfa0>
          <p data-v-ui-acc13851dfa0>CRM / ЗАДАЧИ</p>
          <h1 data-v-ui-acc13851dfa0>Работа команды</h1>
          <span data-v-ui-acc13851dfa0>Канбан, сроки, загрузка и контроль выполнения</span>
        </div>
        <div data-v-ui-acc13851dfa0>
          <button data-v-ui-acc13851dfa0 class="light crm-button" @click="automationOpen = true">
            <Sparkles data-v-ui-acc13851dfa0 :size="16" />Автоматизация
          </button>
          <button data-v-ui-acc13851dfa0 class="light crm-button crm-button--refresh" :disabled="saving" @click="load">
            <RefreshCw data-v-ui-acc13851dfa0 :size="16" />Обновить</button
          ><button class="crm-button crm-button--primary" data-v-ui-acc13851dfa0 @click="openCreate()">
            <Plus data-v-ui-acc13851dfa0 :size="16" />Новая задача
          </button>
        </div>
      </header>
      <section data-v-ui-acc13851dfa0 class="toolbar crm-toolbar">
        <label class="crm-input-group" data-v-ui-acc13851dfa0
          ><Search data-v-ui-acc13851dfa0 :size="15" /><input class="crm-input" data-v-ui-acc13851dfa0
            id="task-query"
            aria-label="Поиск задач"
            v-model="search"
            placeholder="Найти задачу или ответственного"
        /></label>
        <nav data-v-ui-acc13851dfa0>
          <button class="crm-button" data-v-ui-acc13851dfa0
            v-for="v in [
              { id: 'kanban', l: 'Канбан', i: LayoutGrid },
              { id: 'gantt', l: 'Гант', i: GanttChartSquare },
              { id: 'calendar', l: 'Календарь', i: CalendarDays },
              { id: 'list', l: 'Список', i: List },
            ]"
            :class="{ active: view === v.id }"
            @click="view = v.id"
          >
            <component data-v-ui-acc13851dfa0 :is="v.i" :size="14" />{{ v.l }}
          </button>
        </nav>
      </section>
      <section data-v-ui-acc13851dfa0 v-if="view === 'kanban'" class="kanban crm-board">
        <article class="crm-board-column crm-surface" data-v-ui-acc13851dfa0
          v-for="col in columns"
          :key="col.id"
          :data-crm-drop="col.id"
          :class="{ 'is-drop-target': cardDrag.over.value === col.id }"
          @dragover.prevent
          @drop.prevent="reorderTask(cardDrag.active.value, col.id)"
        >
          <header data-v-ui-acc13851dfa0>
            <i data-v-ui-acc13851dfa0 :style="{ background: col.color }"></i><b data-v-ui-acc13851dfa0>{{ col.label }}</b
            ><span data-v-ui-acc13851dfa0>{{
              boardTasks.filter((t) => t.status === col.id).length
            }}</span>
          </header>
          <div data-v-ui-acc13851dfa0>
            <div data-v-ui-acc13851dfa0
              v-for="t in boardTasks.filter((t) => t.status === col.id)"
              :key="t.id"
              class="task-card crm-item-card"
              :class="{ 'crm-card-lifted': cardDrag.active.value === t.id }"
              :draggable="!saving && writable"
              :data-crm-card="t.id"
              @dragstart="cardDrag.start($event, t.id)"
              @dragend="cardDrag.finish"
              @touchstart.passive="!saving && writable && cardDrag.touchStart($event, t.id)"
              @drop.prevent.stop="reorderTask(cardDrag.active.value, col.id, t.id)"
              role="button" tabindex="0"
              @keydown.enter="openTask(t)"
              @keydown.space.prevent="openTask(t)"
              @click="cardDrag.allowClick() && openTask(t)"
              @contextmenu.prevent="menu($event, t)"
            >
              <div data-v-ui-acc13851dfa0>
                <em data-v-ui-acc13851dfa0 :class="t.priority.toLowerCase()">{{
                  priorityLabels[t.priority]
                }}</em
                ><small data-v-ui-acc13851dfa0>{{ t.progress }}%</small>
              </div>
              <h3 data-v-ui-acc13851dfa0>{{ t.title }}</h3>
              <progress class="crm-task-progress" :value="t.progress" max="100" :aria-label="`Выполнено ${t.progress}%`" />
              <small v-if="t.children?.length" class="crm-task-summary"><ListChecks :size="14" />{{ t.children.filter((c: any) => c.status === 'DONE').length }}/{{ t.children.length }} подзадач</small>
              <p data-v-ui-acc13851dfa0 v-if="t.lead">
                Сделка: {{ t.lead.title || t.lead.contactName }}
              </p>
              <footer data-v-ui-acc13851dfa0>
                <span data-v-ui-acc13851dfa0>{{ person(t.assignedTo).slice(0, 1) }}</span
                ><time data-v-ui-acc13851dfa0 :class="{ late: t.status === 'OVERDUE' }"
                  ><Clock3 data-v-ui-acc13851dfa0 :size="12" />{{
                    t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString("ru-RU")
                      : "Без срока"
                  }}</time
                >
              </footer>
              <small v-if="t._count?.comments" class="crm-task-summary"><MessageSquare :size="14" />{{ t._count.comments }} комм.</small>
            </div>
            <button data-v-ui-acc13851dfa0 class="add crm-button" @click="openCreate({ status: col.id })">
              <Plus data-v-ui-acc13851dfa0 :size="13" />Добавить
            </button>
          </div>
        </article>
      </section>
      <section data-v-ui-acc13851dfa0 v-else-if="view === 'gantt'" class="gantt panel crm-surface">
        <header data-v-ui-acc13851dfa0>
          <span data-v-ui-acc13851dfa0>Задача и ответственный</span
          ><b data-v-ui-acc13851dfa0
            >{{ ganttRange.start.toLocaleDateString("ru-RU") }} —
            {{ ganttRange.end.toLocaleDateString("ru-RU") }}</b
          >
        </header>
        <div data-v-ui-acc13851dfa0 v-for="t in filtered" class="gantt-row" @click="openTask(t)">
          <span data-v-ui-acc13851dfa0
            ><strong data-v-ui-acc13851dfa0>{{ t.title }}</strong
            ><small data-v-ui-acc13851dfa0>{{ person(t.assignedTo) }}</small></span
          >
          <div data-v-ui-acc13851dfa0>
            <i data-v-ui-acc13851dfa0 :style="ganttStyle(t)" :class="t.status.toLowerCase()"
              >{{ t.progress }}%</i
            >
          </div>
        </div>
      </section>
      <section data-v-ui-acc13851dfa0 v-else-if="view === 'calendar'" class="calendar panel crm-surface">
        <header data-v-ui-acc13851dfa0>
          <button class="crm-button" data-v-ui-acc13851dfa0 @click="shiftMonth(-1)"><ChevronLeft data-v-ui-acc13851dfa0 :size="16" /></button>
          <h2 data-v-ui-acc13851dfa0>{{ monthLabel }}</h2>
          <button class="crm-button" data-v-ui-acc13851dfa0 @click="shiftMonth(1)"><ChevronRight data-v-ui-acc13851dfa0 :size="16" /></button>
        </header>
        <div data-v-ui-acc13851dfa0 class="week">
          <b data-v-ui-acc13851dfa0 v-for="d in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']">{{ d }}</b>
        </div>
        <div data-v-ui-acc13851dfa0 class="calendar-grid">
          <article data-v-ui-acc13851dfa0
            v-for="day in calendarDays"
            :class="{
              outside: !day.inside,
              today: day.date.toDateString() === new Date().toDateString(),
            }"
          >
            <time data-v-ui-acc13851dfa0>{{ day.date.getDate() }}</time
            ><button class="crm-button" data-v-ui-acc13851dfa0
              v-for="t in day.tasks.slice(0, 3)"
              @click="openTask(t)"
              :class="t.status.toLowerCase()"
            >
              {{ t.title }}</button
            ><small data-v-ui-acc13851dfa0 v-if="day.tasks.length > 3"
              >+ ещё {{ day.tasks.length - 3 }}</small
            >
          </article>
        </div>
      </section>
      <section data-v-ui-acc13851dfa0 v-else class="list panel crm-surface">
        <div data-v-ui-acc13851dfa0 class="list-row head">
          <span data-v-ui-acc13851dfa0>Задача</span><span data-v-ui-acc13851dfa0>Ответственный</span><span data-v-ui-acc13851dfa0>Статус</span
          ><span data-v-ui-acc13851dfa0>Приоритет</span><span data-v-ui-acc13851dfa0>Срок</span><span data-v-ui-acc13851dfa0>Прогресс</span>
        </div>
        <div data-v-ui-acc13851dfa0
          v-for="t in filtered"
          class="list-row"
            @click="openTask(t)"
          @contextmenu.prevent="menu($event, t)"
        >
          <strong data-v-ui-acc13851dfa0>{{ t.title }}</strong
          ><span data-v-ui-acc13851dfa0>{{ person(t.assignedTo) }}</span
          ><em data-v-ui-acc13851dfa0>{{ columns.find((c) => c.id === t.status)?.label }}</em
          ><span data-v-ui-acc13851dfa0>{{ priorityLabels[t.priority] }}</span
          ><span data-v-ui-acc13851dfa0>{{
            t.dueDate ? new Date(t.dueDate).toLocaleDateString("ru-RU") : "—"
          }}</span
          ><b data-v-ui-acc13851dfa0>{{ t.progress }}%</b>
        </div>
      </section></template
    >
    <aside data-v-ui-acc13851dfa0 v-if="selected" class="backdrop admin-dialog-backdrop" @click.self="closeTask">
      <div data-v-ui-acc13851dfa0 ref="taskPanel" @keydown="taskKeys" tabindex="-1" role="dialog" aria-modal="true" aria-label="Карточка задачи" class="drawer admin-dialog admin-dialog--drawer">
        <header data-v-ui-acc13851dfa0>
          <div data-v-ui-acc13851dfa0>
            <p data-v-ui-acc13851dfa0>КАРТОЧКА ЗАДАЧИ</p>
            <h2 data-v-ui-acc13851dfa0>{{ selected.title }}</h2>
          </div>
          <button class="crm-button crm-button--icon" data-v-ui-acc13851dfa0 :disabled="saving" aria-label="Закрыть задачу" @click="closeTask"><X data-v-ui-acc13851dfa0 :size="18" /></button>
        </header>
        <CrmCardTabs v-model="cardTab" prefix="task" />
        <fieldset data-v-ui-acc13851dfa0 ui-inline-i-acc13851dfa0-1 class="body fields admin-dialog-body" :disabled="saving" >
          <p data-v-ui-acc13851dfa0 v-if="error" class="operation-error" role="alert">{{ error }}</p>
          <p data-v-ui-acc13851dfa0 v-if="dirty" role="status">Есть несохранённые изменения</p>
          <section v-show="cardTab==='general'" id="task-general-panel" role="tabpanel" aria-labelledby="task-general-tab" class="crm-card-general">
          <label data-v-ui-acc13851dfa0>Название<input class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.title" /></label
          ><label data-v-ui-acc13851dfa0
            >Описание<textarea class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.description" rows="4" />
          </label>
          <div data-v-ui-acc13851dfa0 class="two">
            <label data-v-ui-acc13851dfa0
              >Статус<select class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.status">
                <option data-v-ui-acc13851dfa0 v-for="c in columns" :value="c.id">
                  {{ c.label }}
                </option>
              </select></label
            ><label data-v-ui-acc13851dfa0
              >Приоритет<select class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.priority">
                <option data-v-ui-acc13851dfa0 v-for="(l, k) in priorityLabels" :value="k">
                  {{ l }}
                </option>
              </select></label
            >
          </div>
          <label data-v-ui-acc13851dfa0
            >Ответственный<select class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.assignedToId">
              <option data-v-ui-acc13851dfa0 v-for="u in team" :value="u.id">{{ person(u) }}</option>
            </select></label
          >
          <div data-v-ui-acc13851dfa0 class="two">
            <label data-v-ui-acc13851dfa0
              >Начало<input class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.startDate" type="date" /></label
            ><label data-v-ui-acc13851dfa0>Срок<input class="crm-input" data-v-ui-acc13851dfa0 v-model="selected.dueDate" type="date" /></label>
          </div>
          <button v-if="selected.parent" class="crm-work-button crm-button" @click="openTask(tasks.find(t => t.id === selected.parent.id))"><CornerDownRight :size="16" />{{ selected.parent.title }}</button>
          <label data-v-ui-acc13851dfa0
            >Прогресс — {{ selected.progress }}%<input data-v-ui-acc13851dfa0
              v-model.number="selected.progress"
              :disabled="!!taskChildren.length || !writable"
              type="range"
              min="0"
              max="100" /></label
          ><button data-v-ui-acc13851dfa0 class="save crm-button crm-button--primary" :disabled="saving" @click="saveSelected">
            {{ saving ? "Сохраняем…" : "Сохранить изменения" }}
          </button>
          </section>
          <section v-show="cardTab==='subtasks'" id="task-subtasks-panel" role="tabpanel" aria-labelledby="task-subtasks-tab"><div class="crm-subtasks"><h3><ListChecks :size="18" />Подзадачи · {{ taskChildren.filter((t: any) => t.status === 'DONE').length }}/{{ taskChildren.length }}</h3><p v-if="taskChildren.length" class="crm-muted">Общий прогресс — среднее выполнение подзадач. Завершить задачу можно после всех подзадач.</p><p v-else class="crm-muted">Подзадач пока нет. Разбейте работу на небольшие шаги.</p><div v-for="child in taskChildren" :key="child.id" class="crm-subtask-row"><input class="crm-check" type="checkbox" :checked="child.status === 'DONE'" :disabled="saving || !writable" :aria-label="`Выполнено: ${child.title}`" @change="toggleSubtask(child)" /><button class="crm-subtask-open crm-button crm-button--row" @click="openTask(child)"><strong>{{ child.title }}</strong><small>{{ person(child.assignedTo) }} · {{ child.progress }}%</small></button></div><div v-if="writable" class="crm-subtask-create"><input class="crm-input" v-model="subtaskTitle" maxlength="200" aria-label="Название подзадачи" placeholder="Что нужно сделать?" @keydown.enter.prevent="addSubtask" /><select class="crm-input" v-model="subtaskAssignee" aria-label="Ответственный за подзадачу"><option v-for="u in team" :key="u.id" :value="u.id">{{ person(u) }}</option></select><button class="crm-work-button crm-button" :disabled="saving || !subtaskTitle.trim()" @click="addSubtask"><Plus :size="16" />Подзадача</button></div></div></section>
          <section v-show="cardTab==='files'" id="task-files-panel" role="tabpanel" aria-labelledby="task-files-tab"><CrmTaskFiles :key="selected.id" :task-id="selected.id" @busy="attachmentBusy = $event" /></section>
          <section v-show="cardTab==='comments'" id="task-comments-panel" role="tabpanel" aria-labelledby="task-comments-tab" data-v-ui-acc13851dfa0 class="comments">
            <h3 data-v-ui-acc13851dfa0>
              <MessageSquare data-v-ui-acc13851dfa0 :size="15" />Комментарии ·
              {{ selected._count?.comments || 0 }}
            </h3>
            <div data-v-ui-acc13851dfa0 class="comment-box">
              <textarea class="crm-input" data-v-ui-acc13851dfa0
                v-model="comment"
                rows="3"
                maxlength="10000"
                aria-label="Текст комментария"
                placeholder="Написать комментарий"
                @keydown.ctrl.enter.prevent="addComment"
              /><button class="crm-button" data-v-ui-acc13851dfa0 :disabled="saving || !comment.trim()" @click="addComment">{{ saving ? 'Отправляем…' : 'Отправить' }}</button>
            </div>
            <div data-v-ui-acc13851dfa0 v-for="c in selected.comments" class="comment">
              <span data-v-ui-acc13851dfa0>{{ person(c.author).slice(0, 1) }}</span>
              <div data-v-ui-acc13851dfa0>
                <b data-v-ui-acc13851dfa0>{{ person(c.author) }}</b>
                <p data-v-ui-acc13851dfa0>{{ c.body }}</p>
                <small data-v-ui-acc13851dfa0>{{
                  new Date(c.createdAt).toLocaleString("ru-RU")
                }}</small>
              </div>
            </div>
            <button v-if="(selected.comments?.length || 0) < (selected._count?.comments || 0)" class="crm-work-button crm-button" :disabled="commentLoading" @click="moreComments">{{ commentLoading ? 'Загружаем…' : 'Ранее написанные комментарии' }}</button>
          </section>
          <section v-if="cardTab==='history'" id="task-history-panel" role="tabpanel" aria-labelledby="task-history-tab"><CrmChangeHistory kind="tasks" :entity-id="selected.id" :team="team" /></section>
          <button data-v-ui-acc13851dfa0 type="button" class="light crm-button" :disabled="saving" @click="closeTask">Отмена</button>
          <button data-v-ui-acc13851dfa0 class="archive crm-button crm-button--danger" :disabled="saving" @click="requestArchiveTask(selected)">
            <Trash2 data-v-ui-acc13851dfa0 :size="14" />Перенести в архив
          </button>
        </fieldset>
      </div>
    </aside>
    <div data-v-ui-acc13851dfa0 v-if="dialog" class="backdrop admin-dialog-backdrop" @click.self="closeCreate">
      <form data-v-ui-acc13851dfa0 class="drawer create admin-dialog admin-dialog--drawer" @submit.prevent="createTask">
        <header data-v-ui-acc13851dfa0>
          <div data-v-ui-acc13851dfa0>
            <p data-v-ui-acc13851dfa0>НОВАЯ РАБОТА</p>
            <h2 data-v-ui-acc13851dfa0>Создать задачу</h2>
          </div>
          <button class="crm-button crm-button--icon" data-v-ui-acc13851dfa0 type="button" :disabled="saving" aria-label="Закрыть создание задачи" @click="closeCreate">
            <X data-v-ui-acc13851dfa0 :size="18" />
          </button>
        </header>
        <fieldset data-v-ui-acc13851dfa0 ui-inline-i-acc13851dfa0-2 class="body fields admin-dialog-body" :disabled="saving" >
          <p data-v-ui-acc13851dfa0 v-if="error" class="operation-error" role="alert">{{ error }}</p>
          <label data-v-ui-acc13851dfa0>Название<input class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.title" required /></label
          ><label data-v-ui-acc13851dfa0
            >Описание<textarea class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.description" rows="4" />
          </label>
          <div data-v-ui-acc13851dfa0 class="two">
            <label data-v-ui-acc13851dfa0
              >Ответственный<select class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.assignedToId">
                <option data-v-ui-acc13851dfa0 v-for="u in team" :value="u.id">{{ person(u) }}</option>
              </select></label
            ><label data-v-ui-acc13851dfa0
              >Приоритет<select class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.priority">
                <option data-v-ui-acc13851dfa0 v-for="(l, k) in priorityLabels" :value="k">
                  {{ l }}
                </option>
              </select></label
            >
          </div>
          <label data-v-ui-acc13851dfa0
            >Связанная сделка<select class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.leadId">
              <option data-v-ui-acc13851dfa0 value="">Без сделки</option>
              <option data-v-ui-acc13851dfa0 v-for="l in leads" :value="l.id">
                {{ l.title || l.contactName }}
              </option>
            </select></label
          >
          <div data-v-ui-acc13851dfa0 class="two">
            <label data-v-ui-acc13851dfa0
              >Начало<input class="crm-input" data-v-ui-acc13851dfa0
                v-model="draft.startDate"
                type="datetime-local" /></label
            ><label data-v-ui-acc13851dfa0
              >Срок<input class="crm-input" data-v-ui-acc13851dfa0 v-model="draft.dueDate" type="datetime-local"
            /></label>
          </div>
          <label data-v-ui-acc13851dfa0
            >Метки<input class="crm-input" data-v-ui-acc13851dfa0
              v-model="draft.labels"
              placeholder="Важно, звонок, документы"
          /></label>
          <label data-v-ui-acc13851dfa0
            >Напомнить до срока<select class="crm-input" data-v-ui-acc13851dfa0 v-model.number="draft.reminderBeforeMinutes">
              <option data-v-ui-acc13851dfa0 :value="0">В момент наступления срока</option>
              <option data-v-ui-acc13851dfa0 :value="15">За 15 минут</option>
              <option data-v-ui-acc13851dfa0 :value="60">За 1 час</option>
              <option data-v-ui-acc13851dfa0 :value="1440">За 1 день</option>
              <option data-v-ui-acc13851dfa0 :value="4320">За 3 дня</option>
            </select></label
          >
        </fieldset>
        <footer data-v-ui-acc13851dfa0>
          <button data-v-ui-acc13851dfa0 type="button" class="light crm-button" :disabled="saving" @click="closeCreate">
            Отмена</button
          ><button class="crm-button" data-v-ui-acc13851dfa0 :disabled="saving">{{ saving ? "Создаём…" : "Создать задачу" }}</button>
        </footer>
      </form>
    </div>
    <CrmTaskAutomation
      v-if="automationOpen"
      v-model="automationOpen"
      @created="load(); flash('Задача создана по шаблону')"
    />
    <div data-v-ui-acc13851dfa0 v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
