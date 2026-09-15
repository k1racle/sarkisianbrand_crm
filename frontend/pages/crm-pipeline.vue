<script setup lang="ts">
import {
  CalendarClock,
  CircleDollarSign,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
  X,
} from "@lucide/vue";
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const pipeline = ref<any>({ stages: [] }),
  pipelines = ref<any[]>([]),
  activePipelineId = ref(""),
  settingsOpen = ref(false),
  team = ref<any[]>([]),
  loading = ref(true),
  saving = ref(false),
  search = ref(""),
  selected = ref<any>(null),
  createOpen = ref(false),
  notice = ref(""),
  error = ref(""),
  dragged = ref(""),
  activityText = ref("");
const draft = reactive<any>({
  source: "MANUAL",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  title: "",
  amount: 0,
  managerId: "",
  stageId: "",
  expectedCloseAt: "",
  nextContactAt: "",
  tags: "",
});
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const money = (v: any) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
const filteredStages = computed(() =>
  pipeline.value.stages.map((stage: any) => ({
    ...stage,
    leads: stage.leads.filter(
      (lead: any) =>
        !search.value ||
        `${lead.title} ${lead.contactName} ${lead.contactPhone} ${lead.organization?.name || ""}`
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    ),
  })),
);
async function load() {
  loading.value = true;
  try {
    [pipelines.value, team.value] = await Promise.all([
      $fetch<any[]>("/crm/pipelines", {
        baseURL: config.public.apiBase,
        headers: headers.value,
      }),
      $fetch<any[]>("/crm/team", {
        baseURL: config.public.apiBase,
        headers: headers.value,
      }),
    ]);
    if (!pipelines.value.some((item) => item.id === activePipelineId.value))
      activePipelineId.value = pipelines.value[0]?.id || "";
    pipeline.value = await $fetch("/crm/pipeline", {
      baseURL: config.public.apiBase,
      headers: headers.value,
      query: activePipelineId.value
        ? { pipelineId: activePipelineId.value }
        : {},
    });
  } finally {
    loading.value = false;
  }
}
async function switchPipeline() {
  await load();
  navigateTo(
    { path: "/crm-pipeline", query: { pipeline: activePipelineId.value } },
    { replace: true },
  );
}
function flash(v: string) {
  notice.value = v;
  setTimeout(() => (notice.value = ""), 2400);
}
function openCreate(stage?: any) {
  Object.assign(draft, {
    source: "MANUAL",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    title: "",
    amount: 0,
    managerId: "",
    stageId: stage?.id || pipeline.value.stages[0]?.id || "",
    expectedCloseAt: "",
    nextContactAt: "",
    tags: "",
  });
  createOpen.value = true;
  error.value = "";
}
async function createLead() {
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/crm/leads", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: headers.value,
      body: {
        ...draft,
        amount: Number(draft.amount || 0),
        expectedCloseAt: draft.expectedCloseAt
          ? new Date(draft.expectedCloseAt).toISOString()
          : undefined,
        nextContactAt: draft.nextContactAt
          ? new Date(draft.nextContactAt).toISOString()
          : undefined,
        tags: String(draft.tags || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        managerId: draft.managerId || undefined,
      },
    });
    createOpen.value = false;
    await load();
    flash("Сделка создана");
  } catch (e: any) {
    error.value = e?.data?.message || "Не удалось создать сделку";
  } finally {
    saving.value = false;
  }
}
async function moveLead(leadId: string, stageId: string) {
  const lead = pipeline.value.stages
    .flatMap((s: any) => s.leads)
    .find((x: any) => x.id === leadId);
  if (!lead || lead.stageId === stageId) return;
  await $fetch(`/crm/leads/${leadId}`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: headers.value,
    body: { stageId },
  });
  await load();
  flash("Этап сделки изменён");
}
async function saveSelected() {
  if (!selected.value) return;
  saving.value = true;
  try {
    const body = {
      title: selected.value.title,
      contactName: selected.value.contactName,
      contactPhone: selected.value.contactPhone || "",
      contactEmail: selected.value.contactEmail || undefined,
      amount: Number(selected.value.amount || 0),
      probability: Number(selected.value.probability || 0),
      managerId: selected.value.managerId || undefined,
      stageId: selected.value.stageId,
      tags: selected.value.tags || [],
      expectedCloseAt: selected.value.expectedCloseAt
        ? new Date(selected.value.expectedCloseAt).toISOString()
        : undefined,
      nextContactAt: selected.value.nextContactAt
        ? new Date(selected.value.nextContactAt).toISOString()
        : undefined,
      lostReason: selected.value.lostReason || undefined,
    };
    selected.value = await $fetch(`/crm/leads/${selected.value.id}`, {
      baseURL: config.public.apiBase,
      method: "PATCH",
      headers: headers.value,
      body,
    });
    await load();
    flash("Сделка сохранена");
  } finally {
    saving.value = false;
  }
}
async function addActivity(type = "NOTE") {
  if (!selected.value || !activityText.value.trim()) return;
  await $fetch(`/crm/leads/${selected.value.id}/interactions`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: { type, content: activityText.value },
  });
  activityText.value = "";
  selected.value = await $fetch(`/crm/leads/${selected.value.id}`, {
    baseURL: config.public.apiBase,
    headers: headers.value,
  });
  flash("Действие добавлено");
}
function leadMenu(e: MouseEvent, lead: any) {
  openContextMenu(
    e,
    lead.title || lead.contactName,
    [
      {
        label: "Открыть сделку",
        icon: "open",
        action: () => (selected.value = lead),
      },
      {
        label: "Создать задачу",
        icon: "status",
        action: () => navigateTo(`/crm-tasks?lead=${lead.id}`),
      },
      {
        label: "Копировать телефон",
        icon: "copy",
        separator: true,
        action: () => copyText(lead.contactPhone, "Телефон скопирован"),
      },
    ],
    money(lead.amount),
  );
}
onMounted(async () => {
  activePipelineId.value = String(useRoute().query.pipeline || "");
  await load();
  if (useRoute().query.create) openCreate();
});
</script>
<template>
  <main class="pipeline-page">
    <WorkspaceLoading
      v-if="loading"
      label="Загружаем воронку продаж"
    /><template v-else
      ><header class="page-head">
        <div>
          <p>CRM / ПРОДАЖИ</p>
          <h1>{{ pipeline.name }}</h1>
          <span>Сделки, прогноз и история контактов в едином процессе</span>
        </div>
        <div>
          <button class="light" @click="settingsOpen = true">
            <Settings2 :size="16" />Настроить
          </button>
          <button class="light" @click="load">
            <RefreshCw :size="16" />Обновить</button
          ><button @click="openCreate()">
            <Plus :size="16" />Новая сделка
          </button>
        </div>
      </header>
      <section class="toolbar">
        <select v-model="activePipelineId" @change="switchPipeline">
          <option v-for="item in pipelines" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
        <label
          ><Search :size="16" /><input
            v-model="search"
            placeholder="Название, контакт, телефон или компания" /></label
        ><span
          >{{
            pipeline.stages.reduce(
              (sum: number, s: any) => sum + s.leads.length,
              0,
            )
          }}
          сделок</span
        ><b>{{
          money(
            pipeline.stages.reduce(
              (sum: number, s: any) =>
                sum +
                s.leads.reduce((a: number, l: any) => a + Number(l.amount), 0),
              0,
            ),
          )
        }}</b>
      </section>
      <section class="board">
        <article
          v-for="stage in filteredStages"
          :key="stage.id"
          class="column"
          @dragover.prevent
          @drop="moveLead(dragged, stage.id)"
        >
          <header>
            <i :style="{ background: stage.color }"></i>
            <div>
              <strong>{{ stage.name }}</strong
              ><small
                >{{ stage.leads.length }} ·
                {{
                  money(
                    stage.leads.reduce(
                      (s: number, l: any) => s + Number(l.amount),
                      0,
                    ),
                  )
                }}</small
              >
            </div>
            <button @click="openCreate(stage)"><Plus :size="15" /></button>
          </header>
          <div class="cards">
            <div
              v-for="lead in stage.leads"
              :key="lead.id"
              class="deal"
              draggable="true"
              @dragstart="dragged = lead.id"
              @click="selected = lead"
              @contextmenu.prevent="leadMenu($event, lead)"
            >
              <div class="deal-top">
                <em>{{ lead.source }}</em
                ><MoreHorizontal :size="16" />
              </div>
              <h3>{{ lead.title || lead.contactName }}</h3>
              <p>
                <UserRound :size="13" />{{
                  lead.organization?.name || lead.contactName
                }}
              </p>
              <p v-if="lead.contactPhone">
                <Phone :size="13" />{{ lead.contactPhone }}
              </p>
              <footer>
                <b>{{ money(lead.amount) }}</b
                ><span>{{ lead.probability }}%</span>
              </footer>
              <small v-if="lead.nextContactAt" class="next"
                ><CalendarClock :size="12" />Следующий контакт
                {{
                  new Date(lead.nextContactAt).toLocaleDateString("ru-RU")
                }}</small
              >
            </div>
            <button class="add-card" @click="openCreate(stage)">
              <Plus :size="14" />Добавить сделку
            </button>
          </div>
        </article>
      </section></template
    >
    <aside v-if="selected" class="backdrop" @click.self="selected = null">
      <div class="drawer">
        <header>
          <div>
            <p>КАРТОЧКА СДЕЛКИ</p>
            <h2>{{ selected.title || selected.contactName }}</h2>
          </div>
          <button @click="selected = null"><X :size="18" /></button>
        </header>
        <div class="drawer-body">
          <div class="fields two">
            <label>Название<input v-model="selected.title" /></label
            ><label
              >Этап<select v-model="selected.stageId">
                <option v-for="s in pipeline.stages" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label>Контакт<input v-model="selected.contactName" /></label
            ><label>Телефон<input v-model="selected.contactPhone" /></label
            ><label
              >Email<input
                v-model="selected.contactEmail"
                type="email" /></label
            ><label
              >Ответственный<select v-model="selected.managerId">
                <option value="">Не назначен</option>
                <option v-for="u in team" :value="u.id">
                  {{
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    u.email
                  }}
                </option>
              </select></label
            ><label
              >Сумма, ₽<input
                v-model.number="selected.amount"
                type="number"
                min="0" /></label
            ><label
              >Вероятность, %<input
                v-model.number="selected.probability"
                type="number"
                min="0"
                max="100" /></label
            ><label
              >План закрытия<input
                v-model="selected.expectedCloseAt"
                type="date" /></label
            ><label
              >Следующий контакт<input
                v-model="selected.nextContactAt"
                type="datetime-local" /></label
            ><label class="wide"
              >Причина проигрыша<select
                v-if="pipeline.lostReasons?.length"
                v-model="selected.lostReason"
                ><option value="">Не выбрана</option>
                <option v-for="reason in pipeline.lostReasons" :value="reason">
                  {{ reason }}
                </option></select
              ><input v-else v-model="selected.lostReason"
            /></label>
          </div>
          <button class="save" @click="saveSelected" :disabled="saving">
            {{ saving ? "Сохраняем…" : "Сохранить сделку" }}
          </button>
          <section class="activity">
            <h3><MessageSquareText :size="16" />История работы</h3>
            <div class="compose">
              <textarea
                v-model="activityText"
                placeholder="Итог звонка, встречи или заметка"
              ></textarea
              ><button @click="addActivity('NOTE')">Добавить</button>
            </div>
            <div
              v-for="item in selected.interactions"
              :key="item.id"
              class="activity-row"
            >
              <i></i
              ><span
                ><b>{{ item.content }}</b
                ><small
                  >{{
                    [item.user?.firstName, item.user?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    item.user?.email ||
                    "Система"
                  }}
                  ·
                  {{ new Date(item.createdAt).toLocaleString("ru-RU") }}</small
                ></span
              >
            </div>
          </section>
        </div>
      </div>
    </aside>
    <div v-if="createOpen" class="backdrop" @click.self="createOpen = false">
      <form class="drawer create" @submit.prevent="createLead">
        <header>
          <div>
            <p>НОВАЯ ВОЗМОЖНОСТЬ</p>
            <h2>Создать сделку</h2>
          </div>
          <button type="button" @click="createOpen = false">
            <X :size="18" />
          </button>
        </header>
        <div class="drawer-body fields">
          <label
            >Название сделки<input
              v-model="draft.title"
              placeholder="Например, стартовый набор для салона" /></label
          ><label
            >Контактное лицо<input v-model="draft.contactName" required
          /></label>
          <div class="two">
            <label>Телефон<input v-model="draft.contactPhone" /></label
            ><label
              >Email<input v-model="draft.contactEmail" type="email"
            /></label>
          </div>
          <div class="two">
            <label
              >Этап<select v-model="draft.stageId">
                <option v-for="s in pipeline.stages" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label
              >Ответственный<select v-model="draft.managerId">
                <option value="">Я</option>
                <option v-for="u in team" :value="u.id">
                  {{
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    u.email
                  }}
                </option>
              </select></label
            >
          </div>
          <div class="two">
            <label
              >Сумма, ₽<input
                v-model.number="draft.amount"
                type="number"
                min="0" /></label
            ><label
              >План закрытия<input v-model="draft.expectedCloseAt" type="date"
            /></label>
          </div>
          <label
            >Теги<input v-model="draft.tags" placeholder="B2B, тёплый лид"
          /></label>
          <p v-if="error" class="error">{{ error }}</p>
        </div>
        <footer>
          <button type="button" class="light" @click="createOpen = false">
            Отмена</button
          ><button :disabled="saving">
            {{ saving ? "Создаём…" : "Создать сделку" }}
          </button>
        </footer>
      </form>
    </div>
    <CrmPipelineSettings
      v-model="settingsOpen"
      :current-id="activePipelineId"
      @changed="load"
      @select="(id: string) => { activePipelineId = id; switchPipeline() }"
    />
    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
<style scoped>
.pipeline-page {
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
  height: 39px;
  border: 0;
  background: #1d1e22;
  color: #fff;
  padding: 0 14px;
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  font: 10px var(--sb-font);
  cursor: pointer;
}
.light {
  background: #fff !important;
  color: var(--sb-ink) !important;
  border: 1px solid var(--sb-line) !important;
}
.toolbar {
  margin: 22px 4% 0;
  height: 54px;
  background: #fff;
  border: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 20px;
}
.toolbar > select {
  width: 210px;
  height: 35px;
  border: 1px solid var(--sb-line);
  background: #fff;
  padding: 0 9px;
  font: 9px var(--sb-font);
}
.toolbar label {
  width: 360px;
  height: 35px;
  border: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--sb-muted);
}
.toolbar input {
  border: 0;
  outline: 0;
  width: 100%;
  font: 10px var(--sb-font);
}
.toolbar > span {
  margin-left: auto;
  font-size: 9px;
  color: var(--sb-muted);
}
.toolbar > b {
  font-size: 15px;
}
.board {
  display: flex;
  gap: 12px;
  overflow: auto;
  padding: 14px 4% 60px;
  align-items: flex-start;
}
.column {
  flex: 0 0 284px;
  background: #eef0f2;
  min-height: 610px;
  border: 1px solid #e1e3e6;
}
.column > header {
  height: 64px;
  padding: 0 13px;
  background: #fff;
  border-bottom: 1px solid var(--sb-line);
  display: grid;
  grid-template-columns: 4px 1fr 29px;
  gap: 10px;
  align-items: center;
}
.column > header i {
  height: 34px;
}
.column > header div {
  display: grid;
  gap: 5px;
}
.column > header strong {
  font-size: 10px;
}
.column > header small {
  font-size: 8px;
  color: var(--sb-muted);
}
.column > header button {
  width: 29px;
  height: 29px;
  background: #fff;
  color: #555;
  border: 1px solid var(--sb-line);
  padding: 0;
}
.cards {
  padding: 9px;
  display: grid;
  gap: 8px;
}
.deal {
  background: #fff;
  border: 1px solid #e1e3e6;
  padding: 14px;
  cursor: pointer;
}
.deal:hover {
  border-color: #bbb;
}
.deal-top {
  display: flex;
  justify-content: space-between;
  color: #999;
}
.deal-top em {
  font-style: normal;
  font-size: 7px;
  color: var(--sb-coral);
  letter-spacing: 0.1em;
}
.deal h3 {
  font-size: 11px;
  line-height: 1.4;
  margin: 9px 0 12px;
}
.deal p {
  margin: 5px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #70737a;
  font-size: 8px;
}
.deal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #eee;
  margin-top: 12px;
  padding-top: 10px;
}
.deal footer b {
  font-size: 12px;
}
.deal footer span {
  font-size: 8px;
  background: #f0f1f3;
  padding: 4px 6px;
}
.next {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #9b6b2c;
  font-size: 7px;
  margin-top: 9px;
}
.add-card {
  height: 34px;
  background: transparent;
  color: #777;
  border: 1px dashed #c9ccd0;
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
  width: min(590px, 96vw);
  background: #fff;
  display: grid;
  grid-template-rows: auto 1fr;
}
.drawer > header {
  padding: 22px 26px;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  justify-content: space-between;
}
.drawer h2 {
  font-size: 22px;
  margin: 0;
}
.drawer header button {
  background: none;
  color: #333;
  padding: 0;
}
.drawer-body {
  padding: 22px 26px;
  overflow: auto;
}
.fields {
  display: grid;
  gap: 13px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}
.fields label {
  display: grid;
  gap: 6px;
  color: #6e7178;
  font-size: 9px;
}
.fields input,
.fields select,
.fields textarea {
  height: 39px;
  border: 1px solid var(--sb-line);
  background: #fff;
  padding: 0 10px;
  font: 10px var(--sb-font);
  box-sizing: border-box;
  width: 100%;
}
.wide {
  grid-column: 1/-1;
}
.save {
  margin: 18px 0;
}
.activity {
  border-top: 1px solid #eee;
  padding-top: 20px;
}
.activity h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.compose {
  display: flex;
  gap: 8px;
}
.compose textarea {
  flex: 1;
  height: 65px;
  border: 1px solid var(--sb-line);
  padding: 9px;
  font: 10px var(--sb-font);
}
.activity-row {
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.activity-row i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sb-coral);
  margin-top: 4px;
}
.activity-row span {
  display: grid;
  gap: 5px;
}
.activity-row b {
  font-size: 9px;
}
.activity-row small {
  font-size: 7px;
  color: var(--sb-muted);
}
.create {
  grid-template-rows: auto 1fr auto;
}
.drawer > footer {
  padding: 14px 26px;
  border-top: 1px solid var(--sb-line);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.error {
  color: #b44b3e;
  font-size: 9px;
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
@media (max-width: 700px) {
  .page-head {
    height: auto;
    align-items: flex-start;
    gap: 16px;
    flex-direction: column;
  }
  .toolbar {
    margin: 14px;
  }
  .toolbar label {
    width: auto;
    flex: 1;
  }
  .board {
    padding: 0 14px 40px;
  }
  .two {
    grid-template-columns: 1fr;
  }
  .wide {
    grid-column: auto;
  }
}
</style>
