<script setup lang="ts">
useHead({ title: 'Сделки — SARKISIAN CRM' });
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
const { can } = useWorkspaceAccess();
const cardDrag = useCrmCardDrag((id, stage) => moveLead(id, stage));
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
const cardTab=ref('general'),relatedBusy=ref(false),selectedBaseline=ref(''),createBaseline=ref('');
const selectedDirty=computed(()=>!!selected.value&&JSON.stringify(selected.value)!==selectedBaseline.value);
function canLeave(){return !saving.value&&!relatedBusy.value&&(!(selectedDirty.value||activityText.value.trim()||(createOpen.value&&JSON.stringify(draft)!==createBaseline.value))||window.confirm('Есть несохранённые изменения. Закрыть без сохранения?'));}
function closeLead(){if(canLeave()){selected.value=null;activityText.value='';}}
const {panel:leadPanel,keyboard:leadKeys}=useCatalogDialog(computed(()=>!!selected.value),closeLead);
function cloneLead(row:any){const result=JSON.parse(JSON.stringify(row));result.expectedCloseAt=result.expectedCloseAt?.slice(0,10)||'';result.nextContactAt=result.nextContactAt?new Date(new Date(result.nextContactAt).getTime()-new Date(result.nextContactAt).getTimezoneOffset()*60000).toISOString().slice(0,16):'';return result;}
async function openLead(row:any){if(!canLeave())return;error.value='';try{selected.value=cloneLead(await $fetch(`/crm/leads/${row.id}`,{baseURL:config.public.apiBase,headers:headers.value}));selectedBaseline.value=JSON.stringify(selected.value);cardTab.value='general';}catch(e:any){error.value=e?.data?.message||'Не удалось открыть сделку';}}
onBeforeRouteLeave(canLeave);
function beforeUnload(event:BeforeUnloadEvent){if(selectedDirty.value||saving.value||relatedBusy.value||activityText.value.trim()){event.preventDefault();event.returnValue='';}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload));onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload));
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
  error.value = '';
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
  } catch (reason:any) {
    error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить воронку. Повторите попытку.';
  } finally {
    loading.value = false;
  }
}
async function switchPipeline() {
  await load();
  navigateTo(
    { path: "/crm/deals", query: { pipeline: activePipelineId.value } },
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
  createBaseline.value = JSON.stringify(draft);
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
    selected.value = cloneLead(await $fetch(`/crm/leads/${selected.value.id}`, {
      baseURL: config.public.apiBase,
      method: "PATCH",
      headers: headers.value,
      body,
    }));
    selectedBaseline.value=JSON.stringify(selected.value);
    await load();
    flash("Сделка сохранена");
  } catch(e:any){error.value=e?.data?.message||'Не удалось сохранить сделку';
  } finally {
    saving.value = false;
  }
}
async function addActivity(type = "NOTE") {
  if (!selected.value || !activityText.value.trim() || saving.value) return;
  saving.value=true;error.value='';try{
  const interaction=await $fetch(`/crm/leads/${selected.value.id}/interactions`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: { type, content: activityText.value },
  });
  activityText.value = "";
  selected.value.interactions=[interaction,...(selected.value.interactions||[])];
  const previous=JSON.parse(selectedBaseline.value);previous.interactions=selected.value.interactions;selectedBaseline.value=JSON.stringify(previous);
  flash("Действие добавлено");
  }catch(e:any){error.value=e?.data?.message||'Не удалось отправить комментарий';}finally{saving.value=false;}
}
function leadMenu(e: MouseEvent, lead: any) {
  openContextMenu(
    e,
    lead.title || lead.contactName,
    [
      {
        label: "Открыть сделку",
        icon: "open",
        action: () => openLead(lead),
      },
      {
        label: "Создать задачу",
        icon: "status",
        action: () => navigateTo(`/crm/tasks?lead=${lead.id}`),
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
  <main data-v-ui-c1ada31b5812 class="pipeline-page crm-standard">
    <WorkspaceLoading
      v-if="loading"
      label="Загружаем воронку продаж"
    /><template v-else
      ><header data-v-ui-c1ada31b5812 class="page-head crm-page-header">
        <div data-v-ui-c1ada31b5812>
          <p data-v-ui-c1ada31b5812>CRM / ПРОДАЖИ</p>
          <h1 data-v-ui-c1ada31b5812>{{ pipeline.name || 'Воронка продаж' }}</h1>
          <span data-v-ui-c1ada31b5812>Сделки, прогноз и история контактов в едином процессе</span>
        </div>
        <div data-v-ui-c1ada31b5812>
          <button data-v-ui-c1ada31b5812 class="light crm-button" @click="settingsOpen = true">
            <Settings2 data-v-ui-c1ada31b5812 :size="16" />Настроить
          </button>
          <button data-v-ui-c1ada31b5812 class="light crm-button crm-button--refresh" @click="load">
            <RefreshCw data-v-ui-c1ada31b5812 :size="16" />Обновить</button
          ><button class="crm-button crm-button--primary" data-v-ui-c1ada31b5812 @click="openCreate()">
            <Plus data-v-ui-c1ada31b5812 :size="16" />Новая сделка
          </button>
        </div>
      </header>
      <p data-v-ui-c1ada31b5812 v-if="error" class="operation-error" role="alert">{{ error }}</p>
      <section data-v-ui-c1ada31b5812 class="toolbar crm-toolbar">
        <select class="crm-input" data-v-ui-c1ada31b5812 v-model="activePipelineId" @change="switchPipeline">
          <option data-v-ui-c1ada31b5812 v-for="item in pipelines" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
        <label class="crm-input-group" data-v-ui-c1ada31b5812
          ><Search data-v-ui-c1ada31b5812 :size="16" /><input class="crm-input" data-v-ui-c1ada31b5812
            id="pipeline-query"
            aria-label="Поиск сделок"
            v-model="search"
            placeholder="Название, контакт, телефон или компания" /></label
        ><span data-v-ui-c1ada31b5812
          >{{
            pipeline.stages.reduce(
              (sum: number, s: any) => sum + s.leads.length,
              0,
            )
          }}
          сделок</span
        ><b data-v-ui-c1ada31b5812>{{
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
      <section data-v-ui-c1ada31b5812 class="board crm-board">
        <article data-v-ui-c1ada31b5812
          v-for="stage in filteredStages"
          :key="stage.id"
          class="column crm-board-column crm-surface"
          :data-crm-drop="stage.id"
          :class="{ 'is-drop-target': cardDrag.over.value === stage.id }"
          @dragover.prevent
          @drop.prevent="moveLead(cardDrag.active.value, stage.id)"
        >
          <header data-v-ui-c1ada31b5812>
            <i data-v-ui-c1ada31b5812 :style="{ background: stage.color }"></i>
            <div data-v-ui-c1ada31b5812>
              <strong data-v-ui-c1ada31b5812>{{ stage.name }}</strong
              ><small data-v-ui-c1ada31b5812
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
            <button class="crm-button crm-button--icon" data-v-ui-c1ada31b5812 aria-label="Добавить сделку в этап" @click="openCreate(stage)"><Plus data-v-ui-c1ada31b5812 :size="15" /></button>
          </header>
          <div data-v-ui-c1ada31b5812 class="cards">
            <div data-v-ui-c1ada31b5812
              v-for="lead in stage.leads"
              :key="lead.id"
              class="deal crm-item-card"
              :draggable="!saving && can('crm.write')"
              :data-crm-card="lead.id"
              role="button" tabindex="0"
              @dragstart="cardDrag.start($event, lead.id)"
              @dragend="cardDrag.finish"
              @touchstart.passive="!saving && can('crm.write') && cardDrag.touchStart($event, lead.id)"
              @click="cardDrag.allowClick() && openLead(lead)"
              @keydown.enter="openLead(lead)"
              @keydown.space.prevent="openLead(lead)"
              @contextmenu.prevent="leadMenu($event, lead)"
            >
              <div data-v-ui-c1ada31b5812 class="deal-top">
                <em data-v-ui-c1ada31b5812>{{ lead.source }}</em
                ><MoreHorizontal data-v-ui-c1ada31b5812 :size="16" />
              </div>
              <h3 data-v-ui-c1ada31b5812>{{ lead.title || lead.contactName }}</h3>
              <p data-v-ui-c1ada31b5812>
                <UserRound data-v-ui-c1ada31b5812 :size="13" />{{
                  lead.organization?.name || lead.contactName
                }}
              </p>
              <p data-v-ui-c1ada31b5812 v-if="lead.contactPhone">
                <Phone data-v-ui-c1ada31b5812 :size="13" />{{ lead.contactPhone }}
              </p>
              <footer data-v-ui-c1ada31b5812>
                <b data-v-ui-c1ada31b5812>{{ money(lead.amount) }}</b
                ><span data-v-ui-c1ada31b5812>{{ lead.probability }}%</span>
              </footer>
              <small data-v-ui-c1ada31b5812 v-if="lead.nextContactAt" class="next"
                ><CalendarClock data-v-ui-c1ada31b5812 :size="12" />Следующий контакт
                {{
                  new Date(lead.nextContactAt).toLocaleDateString("ru-RU")
                }}</small
              >
            </div>
            <button data-v-ui-c1ada31b5812 class="add-card crm-button" @click="openCreate(stage)">
              <Plus data-v-ui-c1ada31b5812 :size="14" />Добавить сделку
            </button>
          </div>
        </article>
      </section></template
    >
    <aside data-v-ui-c1ada31b5812 v-if="selected" class="backdrop admin-dialog-backdrop" @click.self="closeLead">
      <div data-v-ui-c1ada31b5812 ref="leadPanel" @keydown="leadKeys" tabindex="-1" role="dialog" aria-modal="true" aria-label="Карточка сделки" class="drawer admin-dialog admin-dialog--drawer">
        <header data-v-ui-c1ada31b5812>
          <div data-v-ui-c1ada31b5812>
            <p data-v-ui-c1ada31b5812>КАРТОЧКА СДЕЛКИ</p>
            <h2 data-v-ui-c1ada31b5812>{{ selected.title || selected.contactName }}</h2>
          </div>
          <button class="crm-button crm-button--icon" data-v-ui-c1ada31b5812 aria-label="Закрыть сделку" @click="closeLead"><X data-v-ui-c1ada31b5812 :size="18" /></button>
        </header>
        <CrmCardTabs v-model="cardTab" prefix="lead" />
        <div data-v-ui-c1ada31b5812 class="drawer-body admin-dialog-body">
          <p v-if="error" class="crm-work-error" role="alert">{{error}}</p><p v-if="selectedDirty" class="crm-muted">Есть несохранённые изменения</p>
          <section v-show="cardTab==='general'" id="lead-general-panel" role="tabpanel" aria-labelledby="lead-general-tab">
          <div data-v-ui-c1ada31b5812 class="fields two">
            <label data-v-ui-c1ada31b5812>Название<input class="crm-input" data-v-ui-c1ada31b5812 v-model="selected.title" /></label
            ><label data-v-ui-c1ada31b5812
              >Этап<select class="crm-input" data-v-ui-c1ada31b5812 v-model="selected.stageId">
                <option data-v-ui-c1ada31b5812 v-for="s in pipeline.stages" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label data-v-ui-c1ada31b5812>Контакт<input class="crm-input" data-v-ui-c1ada31b5812 v-model="selected.contactName" /></label
            ><label data-v-ui-c1ada31b5812>Телефон<input class="crm-input" data-v-ui-c1ada31b5812 v-model="selected.contactPhone" /></label
            ><label data-v-ui-c1ada31b5812
              >Email<input class="crm-input" data-v-ui-c1ada31b5812
                v-model="selected.contactEmail"
                type="email" /></label
            ><label data-v-ui-c1ada31b5812
              >Ответственный<select class="crm-input" data-v-ui-c1ada31b5812 v-model="selected.managerId">
                <option data-v-ui-c1ada31b5812 value="">Не назначен</option>
                <option data-v-ui-c1ada31b5812 v-for="u in team" :value="u.id">
                  {{
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    u.email
                  }}
                </option>
              </select></label
            ><label data-v-ui-c1ada31b5812
              >Сумма, ₽<input class="crm-input" data-v-ui-c1ada31b5812
                v-model.number="selected.amount"
                type="number"
                min="0" /></label
            ><label data-v-ui-c1ada31b5812
              >Вероятность, %<input class="crm-input" data-v-ui-c1ada31b5812
                v-model.number="selected.probability"
                type="number"
                min="0"
                max="100" /></label
            ><label data-v-ui-c1ada31b5812
              >План закрытия<input class="crm-input" data-v-ui-c1ada31b5812
                v-model="selected.expectedCloseAt"
                type="date" /></label
            ><label data-v-ui-c1ada31b5812
              >Следующий контакт<input class="crm-input" data-v-ui-c1ada31b5812
                v-model="selected.nextContactAt"
                type="datetime-local" /></label
            ><label data-v-ui-c1ada31b5812 class="wide"
              >Причина проигрыша<select class="crm-input" data-v-ui-c1ada31b5812
                v-if="pipeline.lostReasons?.length"
                v-model="selected.lostReason"
                ><option data-v-ui-c1ada31b5812 value="">Не выбрана</option>
                <option data-v-ui-c1ada31b5812 v-for="reason in pipeline.lostReasons" :value="reason">
                  {{ reason }}
                </option></select
              ><input class="crm-input" data-v-ui-c1ada31b5812 v-else v-model="selected.lostReason"
            /></label>
          </div>
          <button data-v-ui-c1ada31b5812 class="save crm-button crm-button--primary" @click="saveSelected" :disabled="saving">
            {{ saving ? "Сохраняем…" : "Сохранить сделку" }}
          </button>
          </section>
          <section v-show="cardTab==='subtasks'" id="lead-subtasks-panel" role="tabpanel" aria-labelledby="lead-subtasks-tab"><CrmLeadTasks :key="selected.id" :lead-id="selected.id" :manager-id="selected.managerId" :team="team" @busy="relatedBusy=$event" /></section>
          <section v-show="cardTab==='files'" id="lead-files-panel" role="tabpanel" aria-labelledby="lead-files-tab"><CrmTaskFiles :key="selected.id" :lead-id="selected.id" @busy="relatedBusy=$event" /></section>
          <section v-show="cardTab==='comments'" id="lead-comments-panel" role="tabpanel" aria-labelledby="lead-comments-tab" data-v-ui-c1ada31b5812 class="activity">
            <h3 data-v-ui-c1ada31b5812><MessageSquareText data-v-ui-c1ada31b5812 :size="16" />Комментарии и заметки</h3>
            <div data-v-ui-c1ada31b5812 class="compose">
              <textarea class="crm-input" data-v-ui-c1ada31b5812
                v-model="activityText"
                placeholder="Итог звонка, встречи или заметка"
              ></textarea
              ><button class="crm-button crm-button--primary" data-v-ui-c1ada31b5812 @click="addActivity('NOTE')">Добавить</button>
            </div>
            <div data-v-ui-c1ada31b5812
              v-for="item in (selected.interactions||[]).filter((entry:any)=>!['CREATED','STAGE_CHANGED'].includes(entry.type))"
              :key="item.id"
              class="activity-row"
            >
              <i data-v-ui-c1ada31b5812></i
              ><span data-v-ui-c1ada31b5812
                ><b data-v-ui-c1ada31b5812>{{ item.content }}</b
                ><small data-v-ui-c1ada31b5812
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
          <section v-if="cardTab==='history'" id="lead-history-panel" role="tabpanel" aria-labelledby="lead-history-tab"><CrmChangeHistory kind="leads" :entity-id="selected.id" :team="team" :stages="pipeline.stages" /></section>
        </div>
      </div>
    </aside>
    <div data-v-ui-c1ada31b5812 v-if="createOpen" class="backdrop admin-dialog-backdrop" @click.self="createOpen = false">
      <form data-v-ui-c1ada31b5812 class="drawer create admin-dialog admin-dialog--drawer" @submit.prevent="createLead">
        <header data-v-ui-c1ada31b5812>
          <div data-v-ui-c1ada31b5812>
            <p data-v-ui-c1ada31b5812>НОВАЯ ВОЗМОЖНОСТЬ</p>
            <h2 data-v-ui-c1ada31b5812>Создать сделку</h2>
          </div>
          <button class="crm-button crm-button--icon" data-v-ui-c1ada31b5812 aria-label="Закрыть создание сделки" type="button" @click="createOpen = false">
            <X data-v-ui-c1ada31b5812 :size="18" />
          </button>
        </header>
        <div data-v-ui-c1ada31b5812 class="drawer-body fields admin-dialog-body">
          <label data-v-ui-c1ada31b5812
            >Название сделки<input class="crm-input" data-v-ui-c1ada31b5812
              v-model="draft.title"
              placeholder="Например, стартовый набор для салона" /></label
          ><label data-v-ui-c1ada31b5812
            >Контактное лицо<input class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.contactName" required
          /></label>
          <div data-v-ui-c1ada31b5812 class="two">
            <label data-v-ui-c1ada31b5812>Телефон<input class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.contactPhone" /></label
            ><label data-v-ui-c1ada31b5812
              >Email<input class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.contactEmail" type="email"
            /></label>
          </div>
          <div data-v-ui-c1ada31b5812 class="two">
            <label data-v-ui-c1ada31b5812
              >Этап<select class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.stageId">
                <option data-v-ui-c1ada31b5812 v-for="s in pipeline.stages" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label data-v-ui-c1ada31b5812
              >Ответственный<select class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.managerId">
                <option data-v-ui-c1ada31b5812 value="">Я</option>
                <option data-v-ui-c1ada31b5812 v-for="u in team" :value="u.id">
                  {{
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    u.email
                  }}
                </option>
              </select></label
            >
          </div>
          <div data-v-ui-c1ada31b5812 class="two">
            <label data-v-ui-c1ada31b5812
              >Сумма, ₽<input class="crm-input" data-v-ui-c1ada31b5812
                v-model.number="draft.amount"
                type="number"
                min="0" /></label
            ><label data-v-ui-c1ada31b5812
              >План закрытия<input class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.expectedCloseAt" type="date"
            /></label>
          </div>
          <label data-v-ui-c1ada31b5812
            >Теги<input class="crm-input" data-v-ui-c1ada31b5812 v-model="draft.tags" placeholder="B2B, тёплый лид"
          /></label>
          <p data-v-ui-c1ada31b5812 v-if="error" class="error">{{ error }}</p>
        </div>
        <footer data-v-ui-c1ada31b5812>
          <button data-v-ui-c1ada31b5812 type="button" class="light crm-button" @click="createOpen = false">
            Отмена</button
          ><button class="crm-button" data-v-ui-c1ada31b5812 :disabled="saving">
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
    <div data-v-ui-c1ada31b5812 v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
