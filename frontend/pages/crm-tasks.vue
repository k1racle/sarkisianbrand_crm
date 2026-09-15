<script setup lang="ts">
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
}
async function createTask() {
  saving.value = true;
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
  } finally {
    saving.value = false;
  }
}
async function patchTask(id: string, body: any) {
  await $fetch(`/crm/tasks/${id}`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: headers.value,
    body,
  });
  await load();
}
async function moveTask(id: string, status: string) {
  if (!id) return;
  await patchTask(id, { status });
  flash("Статус задачи изменён");
}
async function saveSelected() {
  if (!selected.value) return;
  saving.value = true;
  try {
    selected.value = await $fetch(`/crm/tasks/${selected.value.id}`, {
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
    await load();
    flash("Задача сохранена");
  } finally {
    saving.value = false;
  }
}
async function archiveTask(item: any) {
  await $fetch(`/crm/tasks/${item.id}`, {
    baseURL: config.public.apiBase,
    method: "DELETE",
    headers: headers.value,
  });
  selected.value = null;
  await load();
  flash("Задача перенесена в архив");
}
async function addComment() {
  if (!selected.value || !comment.value.trim()) return;
  await $fetch(`/crm/tasks/${selected.value.id}/comments`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: { body: comment.value },
  });
  comment.value = "";
  await load();
  selected.value = tasks.value.find((t) => t.id === selected.value.id);
  flash("Комментарий добавлен");
}
function menu(e: MouseEvent, t: any) {
  openContextMenu(
    e,
    t.title,
    [
      {
        label: "Открыть задачу",
        icon: "open",
        action: () => (selected.value = t),
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
    selected.value = tasks.value.find((item) => item.id === String(route.query.task));
});
</script>
<template>
  <main class="tasks-page">
    <WorkspaceLoading
      v-if="loading"
      label="Загружаем задачи команды"
    /><template v-else
      ><header class="page-head">
        <div>
          <p>CRM / ЗАДАЧИ</p>
          <h1>Работа команды</h1>
          <span>Канбан, сроки, загрузка и контроль выполнения</span>
        </div>
        <div>
          <button class="light" @click="automationOpen = true">
            <Sparkles :size="16" />Автоматизация
          </button>
          <button class="light" @click="load">
            <RefreshCw :size="16" />Обновить</button
          ><button @click="openCreate()">
            <Plus :size="16" />Новая задача
          </button>
        </div>
      </header>
      <section class="toolbar">
        <label
          ><Search :size="15" /><input
            v-model="search"
            placeholder="Найти задачу или ответственного"
        /></label>
        <nav>
          <button
            v-for="v in [
              { id: 'kanban', l: 'Канбан', i: LayoutGrid },
              { id: 'gantt', l: 'Гант', i: GanttChartSquare },
              { id: 'calendar', l: 'Календарь', i: CalendarDays },
              { id: 'list', l: 'Список', i: List },
            ]"
            :class="{ active: view === v.id }"
            @click="view = v.id"
          >
            <component :is="v.i" :size="14" />{{ v.l }}
          </button>
        </nav>
      </section>
      <section v-if="view === 'kanban'" class="kanban">
        <article
          v-for="col in columns"
          :key="col.id"
          @dragover.prevent
          @drop="moveTask(dragged, col.id)"
        >
          <header>
            <i :style="{ background: col.color }"></i><b>{{ col.label }}</b
            ><span>{{
              filtered.filter((t) => t.status === col.id).length
            }}</span>
          </header>
          <div>
            <div
              v-for="t in filtered.filter((t) => t.status === col.id)"
              :key="t.id"
              class="task-card"
              draggable="true"
              @dragstart="dragged = t.id"
              @click="selected = t"
              @contextmenu.prevent="menu($event, t)"
            >
              <div>
                <em :class="t.priority.toLowerCase()">{{
                  priorityLabels[t.priority]
                }}</em
                ><small>{{ t.progress }}%</small>
              </div>
              <h3>{{ t.title }}</h3>
              <p v-if="t.lead">
                Сделка: {{ t.lead.title || t.lead.contactName }}
              </p>
              <footer>
                <span>{{ person(t.assignedTo).slice(0, 1) }}</span
                ><time :class="{ late: t.status === 'OVERDUE' }"
                  ><Clock3 :size="12" />{{
                    t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString("ru-RU")
                      : "Без срока"
                  }}</time
                >
              </footer>
            </div>
            <button class="add" @click="openCreate({ status: col.id })">
              <Plus :size="13" />Добавить
            </button>
          </div>
        </article>
      </section>
      <section v-else-if="view === 'gantt'" class="gantt panel">
        <header>
          <span>Задача и ответственный</span
          ><b
            >{{ ganttRange.start.toLocaleDateString("ru-RU") }} —
            {{ ganttRange.end.toLocaleDateString("ru-RU") }}</b
          >
        </header>
        <div v-for="t in filtered" class="gantt-row" @click="selected = t">
          <span
            ><strong>{{ t.title }}</strong
            ><small>{{ person(t.assignedTo) }}</small></span
          >
          <div>
            <i :style="ganttStyle(t)" :class="t.status.toLowerCase()"
              >{{ t.progress }}%</i
            >
          </div>
        </div>
      </section>
      <section v-else-if="view === 'calendar'" class="calendar panel">
        <header>
          <button @click="shiftMonth(-1)"><ChevronLeft :size="16" /></button>
          <h2>{{ monthLabel }}</h2>
          <button @click="shiftMonth(1)"><ChevronRight :size="16" /></button>
        </header>
        <div class="week">
          <b v-for="d in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']">{{ d }}</b>
        </div>
        <div class="calendar-grid">
          <article
            v-for="day in calendarDays"
            :class="{
              outside: !day.inside,
              today: day.date.toDateString() === new Date().toDateString(),
            }"
          >
            <time>{{ day.date.getDate() }}</time
            ><button
              v-for="t in day.tasks.slice(0, 3)"
              @click="selected = t"
              :class="t.status.toLowerCase()"
            >
              {{ t.title }}</button
            ><small v-if="day.tasks.length > 3"
              >+ ещё {{ day.tasks.length - 3 }}</small
            >
          </article>
        </div>
      </section>
      <section v-else class="list panel">
        <div class="list-row head">
          <span>Задача</span><span>Ответственный</span><span>Статус</span
          ><span>Приоритет</span><span>Срок</span><span>Прогресс</span>
        </div>
        <div
          v-for="t in filtered"
          class="list-row"
          @click="selected = t"
          @contextmenu.prevent="menu($event, t)"
        >
          <strong>{{ t.title }}</strong
          ><span>{{ person(t.assignedTo) }}</span
          ><em>{{ columns.find((c) => c.id === t.status)?.label }}</em
          ><span>{{ priorityLabels[t.priority] }}</span
          ><span>{{
            t.dueDate ? new Date(t.dueDate).toLocaleDateString("ru-RU") : "—"
          }}</span
          ><b>{{ t.progress }}%</b>
        </div>
      </section></template
    >
    <aside v-if="selected" class="backdrop" @click.self="selected = null">
      <div class="drawer">
        <header>
          <div>
            <p>КАРТОЧКА ЗАДАЧИ</p>
            <h2>{{ selected.title }}</h2>
          </div>
          <button @click="selected = null"><X :size="18" /></button>
        </header>
        <div class="body fields">
          <label>Название<input v-model="selected.title" /></label
          ><label
            >Описание<textarea v-model="selected.description" rows="4" />
          </label>
          <div class="two">
            <label
              >Статус<select v-model="selected.status">
                <option v-for="c in columns" :value="c.id">
                  {{ c.label }}
                </option>
              </select></label
            ><label
              >Приоритет<select v-model="selected.priority">
                <option v-for="(l, k) in priorityLabels" :value="k">
                  {{ l }}
                </option>
              </select></label
            >
          </div>
          <label
            >Ответственный<select v-model="selected.assignedToId">
              <option v-for="u in team" :value="u.id">{{ person(u) }}</option>
            </select></label
          >
          <div class="two">
            <label
              >Начало<input v-model="selected.startDate" type="date" /></label
            ><label>Срок<input v-model="selected.dueDate" type="date" /></label>
          </div>
          <label
            >Прогресс — {{ selected.progress }}%<input
              v-model.number="selected.progress"
              type="range"
              min="0"
              max="100" /></label
          ><button class="save" @click="saveSelected">
            {{ saving ? "Сохраняем…" : "Сохранить изменения" }}
          </button>
          <section class="comments">
            <h3>
              <MessageSquare :size="15" />Комментарии ·
              {{ selected._count?.comments || 0 }}
            </h3>
            <div class="comment-box">
              <input
                v-model="comment"
                placeholder="Написать комментарий"
                @keyup.enter="addComment"
              /><button @click="addComment">Отправить</button>
            </div>
            <div v-for="c in selected.comments" class="comment">
              <span>{{ person(c.author).slice(0, 1) }}</span>
              <div>
                <b>{{ person(c.author) }}</b>
                <p>{{ c.body }}</p>
                <small>{{
                  new Date(c.createdAt).toLocaleString("ru-RU")
                }}</small>
              </div>
            </div>
          </section>
          <button class="archive" @click="archiveTask(selected)">
            <Trash2 :size="14" />Перенести в архив
          </button>
        </div>
      </div>
    </aside>
    <div v-if="dialog" class="backdrop" @click.self="dialog = false">
      <form class="drawer create" @submit.prevent="createTask">
        <header>
          <div>
            <p>НОВАЯ РАБОТА</p>
            <h2>Создать задачу</h2>
          </div>
          <button type="button" @click="dialog = false">
            <X :size="18" />
          </button>
        </header>
        <div class="body fields">
          <label>Название<input v-model="draft.title" required /></label
          ><label
            >Описание<textarea v-model="draft.description" rows="4" />
          </label>
          <div class="two">
            <label
              >Ответственный<select v-model="draft.assignedToId">
                <option v-for="u in team" :value="u.id">{{ person(u) }}</option>
              </select></label
            ><label
              >Приоритет<select v-model="draft.priority">
                <option v-for="(l, k) in priorityLabels" :value="k">
                  {{ l }}
                </option>
              </select></label
            >
          </div>
          <label
            >Связанная сделка<select v-model="draft.leadId">
              <option value="">Без сделки</option>
              <option v-for="l in leads" :value="l.id">
                {{ l.title || l.contactName }}
              </option>
            </select></label
          >
          <div class="two">
            <label
              >Начало<input
                v-model="draft.startDate"
                type="datetime-local" /></label
            ><label
              >Срок<input v-model="draft.dueDate" type="datetime-local"
            /></label>
          </div>
          <label
            >Метки<input
              v-model="draft.labels"
              placeholder="Важно, звонок, документы"
          /></label>
          <label
            >Напомнить до срока<select v-model.number="draft.reminderBeforeMinutes">
              <option :value="0">В момент наступления срока</option>
              <option :value="15">За 15 минут</option>
              <option :value="60">За 1 час</option>
              <option :value="1440">За 1 день</option>
              <option :value="4320">За 3 дня</option>
            </select></label
          >
        </div>
        <footer>
          <button type="button" class="light" @click="dialog = false">
            Отмена</button
          ><button>{{ saving ? "Создаём…" : "Создать задачу" }}</button>
        </footer>
      </form>
    </div>
    <CrmTaskAutomation
      v-model="automationOpen"
      @created="load(); flash('Задача создана по шаблону')"
    />
    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
<style scoped>
.tasks-page {
  min-height: 100vh;
  background: var(--sb-bg);
  color: var(--sb-ink);
  font-family: var(--sb-font);
}
.page-head {
  height: 120px;
  background: #fff;
  border-bottom: 1px solid var(--sb-line);
  padding: 24px 4%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-head p,
.drawer header p {
  margin: 0 0 7px;
  color: var(--sb-coral);
  font-size: 9px;
  letter-spacing: 0.16em;
}
.page-head h1 {
  font-size: 28px;
  margin: 0 0 6px;
}
.page-head span {
  font-size: 10px;
  color: var(--sb-muted);
}
.page-head > div:last-child {
  display: flex;
  gap: 8px;
}
button {
  height: 38px;
  border: 0;
  background: #1d1e22;
  color: #fff;
  padding: 0 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font: 10px var(--sb-font);
  cursor: pointer;
}
.light {
  background: #fff !important;
  color: #222 !important;
  border: 1px solid var(--sb-line) !important;
}
.toolbar {
  margin: 22px 4% 0;
  height: 55px;
  background: #fff;
  border: 1px solid var(--sb-line);
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar > label {
  height: 35px;
  width: 330px;
  border: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.toolbar input {
  border: 0;
  outline: 0;
  width: 100%;
  font: 10px var(--sb-font);
}
.toolbar nav {
  display: flex;
}
.toolbar nav button {
  height: 34px;
  background: #fff;
  color: #777;
  border: 1px solid transparent;
}
.toolbar nav button.active {
  background: #1d1e22;
  color: #fff;
}
.kanban {
  display: flex;
  gap: 11px;
  overflow: auto;
  padding: 14px 4% 60px;
  align-items: flex-start;
}
.kanban > article {
  flex: 0 0 255px;
  min-height: 590px;
  background: #eef0f2;
  border: 1px solid #e1e3e6;
}
.kanban > article > header {
  height: 52px;
  background: #fff;
  display: grid;
  grid-template-columns: 4px 1fr auto;
  gap: 9px;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--sb-line);
}
.kanban header i {
  height: 28px;
}
.kanban header b {
  font-size: 10px;
}
.kanban header span {
  font-size: 9px;
  color: #888;
}
.kanban > article > div {
  padding: 8px;
  display: grid;
  gap: 8px;
}
.task-card {
  background: #fff;
  border: 1px solid #e1e3e6;
  padding: 13px;
  cursor: pointer;
}
.task-card > div,
.task-card footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.task-card em {
  font-style: normal;
  font-size: 7px;
  padding: 4px 6px;
  background: #f1f2f3;
}
.task-card em.high,
.task-card em.critical {
  color: #b44b3e;
  background: #fff0ed;
}
.task-card small {
  font-size: 8px;
  color: #888;
}
.task-card h3 {
  font-size: 10px;
  line-height: 1.45;
  margin: 10px 0;
}
.task-card p {
  font-size: 8px;
  color: #777;
}
.task-card footer {
  border-top: 1px solid #eee;
  padding-top: 10px;
}
.task-card footer > span {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #222;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 8px;
}
.task-card time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 7px;
  color: #777;
}
.task-card time.late {
  color: #b44b3e;
}
.add {
  height: 32px;
  background: transparent;
  color: #777;
  border: 1px dashed #c5c8cc;
}
.panel {
  margin: 14px 4% 60px;
  background: #fff;
  border: 1px solid var(--sb-line);
}
.gantt > header {
  height: 50px;
  padding: 0 18px;
  display: grid;
  grid-template-columns: 240px 1fr;
  align-items: center;
  border-bottom: 1px solid #eee;
  font-size: 9px;
  color: #777;
}
.gantt-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 52px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}
.gantt-row > span {
  padding: 10px 18px;
  display: grid;
  gap: 4px;
}
.gantt-row strong {
  font-size: 9px;
}
.gantt-row small {
  font-size: 7px;
  color: #888;
}
.gantt-row > div {
  position: relative;
  background: repeating-linear-gradient(
    90deg,
    #fff 0,
    #fff calc(10% - 1px),
    #eef0f2 calc(10% - 1px),
    #eef0f2 10%
  );
}
.gantt-row i {
  position: absolute;
  top: 14px;
  height: 24px;
  background: #4f7dcf;
  color: #fff;
  font-style: normal;
  font-size: 7px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  box-sizing: border-box;
  min-width: 28px;
}
.gantt-row i.done {
  background: #2d9568;
}
.gantt-row i.overdue {
  background: #bb5145;
}
.calendar > header {
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 25px;
  border-bottom: 1px solid #eee;
}
.calendar h2 {
  font-size: 15px;
  text-transform: capitalize;
}
.calendar header button {
  width: 31px;
  height: 31px;
  background: #fff;
  color: #222;
  border: 1px solid var(--sb-line);
  padding: 0;
}
.week,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.week b {
  padding: 10px;
  border-right: 1px solid #eee;
  font-size: 8px;
  color: #888;
}
.calendar-grid article {
  min-height: 105px;
  border-top: 1px solid #eee;
  border-right: 1px solid #eee;
  padding: 8px;
  box-sizing: border-box;
}
.calendar-grid article.outside {
  background: #f7f7f8;
  color: #aaa;
}
.calendar-grid article.today time {
  background: var(--sb-coral);
  color: #fff;
}
.calendar-grid time {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  font-size: 8px;
}
.calendar-grid button {
  height: 23px;
  width: 100%;
  margin-top: 4px;
  background: #eef3fb;
  color: #315d9d;
  justify-content: flex-start;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 7px;
}
.calendar-grid button.overdue {
  background: #fff0ed;
  color: #a74436;
}
.calendar-grid small {
  font-size: 7px;
  color: #777;
}
.list-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 0.8fr 0.8fr 0.5fr;
  gap: 12px;
  align-items: center;
  padding: 13px 18px;
  border-bottom: 1px solid #eee;
  font-size: 9px;
  cursor: pointer;
}
.list-row.head {
  font-size: 8px;
  color: #888;
  text-transform: uppercase;
}
.list-row em {
  font-style: normal;
}
.backdrop {
  position: fixed;
  z-index: 700;
  inset: 0;
  background: #0005;
}
.drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(550px, 96vw);
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;
}
.drawer > header {
  padding: 22px 25px;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  justify-content: space-between;
}
.drawer h2 {
  font-size: 21px;
  margin: 0;
}
.drawer header button {
  background: none;
  color: #222;
  padding: 0;
}
.drawer .body {
  padding: 22px 25px;
  overflow: auto;
}
.fields {
  display: grid;
  gap: 12px;
}
.fields label {
  display: grid;
  gap: 6px;
  font-size: 9px;
  color: #70737a;
}
.fields input,
.fields select,
.fields textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--sb-line);
  padding: 0 10px;
  font: 10px var(--sb-font);
  background: #fff;
}
.fields input,
.fields select {
  height: 39px;
}
.fields textarea {
  padding: 10px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.save {
  margin: 5px 0 12px;
}
.comments {
  border-top: 1px solid #eee;
  padding-top: 16px;
}
.comments h3 {
  font-size: 11px;
  display: flex;
  gap: 7px;
  align-items: center;
}
.comment-box {
  display: flex;
}
.comment-box input {
  flex: 1;
  height: 37px;
  border: 1px solid var(--sb-line);
  padding: 0 9px;
}
.comment-box button {
  height: 37px;
}
.comment {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 9px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.comment > span {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #222;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 8px;
}
.comment div {
  display: grid;
  gap: 3px;
}
.comment b,
.comment p,
.comment small {
  font-size: 8px;
  margin: 0;
}
.comment small {
  color: #888;
}
.archive {
  margin-top: 20px;
  background: #fff0ed;
  color: #a74436;
}
.create {
  grid-template-rows: auto 1fr auto;
}
.drawer > footer {
  padding: 14px 25px;
  border-top: 1px solid var(--sb-line);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #1d1e22;
  color: #fff;
  padding: 13px 18px;
  font-size: 10px;
  z-index: 900;
}
@media (max-width: 750px) {
  .page-head {
    height: auto;
    align-items: flex-start;
    gap: 15px;
    flex-direction: column;
  }
  .toolbar {
    margin: 12px;
    display: block;
    height: auto;
    padding: 9px;
  }
  .toolbar > label {
    width: auto;
  }
  .toolbar nav {
    overflow: auto;
    margin-top: 8px;
  }
  .kanban {
    padding: 0 12px 40px;
  }
  .two {
    grid-template-columns: 1fr;
  }
  .calendar-grid article {
    min-height: 80px;
  }
  .gantt-row,
  .gantt > header {
    grid-template-columns: 160px 1fr;
  }
}
</style>
