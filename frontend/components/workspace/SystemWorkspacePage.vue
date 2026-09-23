<script setup lang="ts">
import {
  Activity,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  X,
} from "@lucide/vue";
const config = useRuntimeConfig();
const route = useRoute();
const props = defineProps<{ pageSection?: string }>();
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const section = computed(() => props.pageSection || String(route.query.section || "overview"));
const dashboard = ref<any>(null);
const staff = ref<any[]>([]);
const access = ref<any>({ roles: [], permissions: [] });
const audit = ref<any[]>([]);
const logs = ref<any>({
  sync: [],
  integrations: [],
  recentAudit: [],
  jobs: [],
  queue: { connected: false, counts: {} },
});
const busy = ref(false);
const loadError = ref('');
const pageLoaded = ref(false);
let loadVersion = 0;
let loadController: AbortController | undefined;
const notice = ref("");
const search = ref("");
const showCreate = ref(false);
const selectedEmployeeId = ref("");
const overrides = ref<Record<string, string>>({});
const employee = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "MANAGER_SALES",
});
const menu: Record<string, { title: string; kicker: string; description: string }> = {
  overview: { title: "Настройки экосистемы", kicker: "УПРАВЛЕНИЕ ПЛАТФОРМОЙ", description: "Центральное управление доступом, аудитом и техническим состоянием" },
  staff: { title: "Сотрудники", kicker: "УЧЁТНЫЕ ЗАПИСИ", description: "Команда, роли, блокировки и активные сессии" },
  accounts: { title: "Учётные записи", kicker: "ЕДИНЫЙ РЕЕСТР", description: "Сотрудники, клиенты B2C, партнёры B2B и восстановление доступа" },
  trash: { title: "Корзина данных", kicker: "ЖИЗНЕННЫЙ ЦИКЛ", description: "Восстановление и контролируемое окончательное удаление данных" },
  access: { title: "Роли и права", kicker: "БЕЗОПАСНОСТЬ ДОСТУПА", description: "Серверная матрица разрешений и индивидуальные исключения" },
  integrations: { title: "Интеграции", kicker: "ЦЕНТР ПОДКЛЮЧЕНИЙ", description: "Маркетплейсы, доставка, 1С, платежи, касса, сообщения и боты" },
  "bot-commands": { title: "Команды ботов", kicker: "СЦЕНАРИИ КОММУНИКАЦИЙ", description: "Команды Telegram, MAX и VK для сотрудников, B2C и B2B" },
  audit: { title: "Журнал действий", kicker: "АУДИТ ИЗМЕНЕНИЙ", description: "Единая история критических действий во всех рабочих пространствах" },
  logs: { title: "Технические журналы", kicker: "СОСТОЯНИЕ ИНТЕГРАЦИЙ", description: "Фоновые операции, синхронизации, ошибки и повторы" },
};
const title = computed(() => menu[section.value] || menu.overview);
const roleLabels: Record<string, string> = {
  ADMIN: "Администратор платформы",
  CONTENT_MANAGER: "Контент-менеджер",
  MANAGER_B2B: "Менеджер B2B",
  MANAGER_SALES: "Менеджер продаж",
  MARKETPLACE_MANAGER: "Менеджер маркетплейсов",
  SUPERVISOR: "Руководитель направления",
  EXECUTIVE: "Руководитель компании",
  IT_SUPPORT: "IT-поддержка",
  CURATOR: "Куратор",
  WAREHOUSE: "Сотрудник склада",
};
const actionLabels: Record<string, string> = {
  LOGIN: "Вход",
  CREATE: "Создание",
  UPDATE: "Изменение",
  ARCHIVE: "Архивация",
  STATUS_CHANGE: "Смена статуса",
  COMMENT: "Комментарий",
  IMPORT: "Импорт",
  TEST: "Проверка",
};
const resourceLabels: Record<string, string> = {
  admin: "Админка сайта",
  crm: "CRM",
  marketplaces: "Маркетплейсы",
  oms: "Заказы",
  helpdesk: "Helpdesk",
  "system-settings": "Настройки экосистемы",
  auth: "Авторизация",
  "1c-sync": "Интеграция 1С",
};
const jobLabels: Record<string, string> = {
  "1C_PRODUCTS_IMPORT": "Импорт товаров из 1С",
  MARKETPLACE_ORDERS_IMPORT: "Импорт заказов маркетплейсов",
};
const jobStatusLabels: Record<string, string> = {
  WAITING: "В очереди",
  ACTIVE: "Выполняется",
  RETRYING: "Ожидает повтора",
  COMPLETED: "Завершена",
  FAILED: "Ошибка",
  CANCELLED: "Отменена",
};
const filteredStaff = computed(() =>
  staff.value.filter(
    (item) =>
      !search.value ||
      `${item.firstName || ""} ${item.lastName || ""} ${item.email} ${roleLabels[item.role] || ""}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const selectedEmployee = computed(() =>
  staff.value.find((item) => item.id === selectedEmployeeId.value),
);
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
async function load() {
  if (!token.value) return;
  const version = ++loadVersion, identity = token.value;
  loadController?.abort(); const controller = new AbortController(); loadController = controller;
  busy.value = true;
  loadError.value = '';
  try {
    const options = { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${identity}` }, signal: controller.signal, timeout: 20000 };
    const request = (sections: string[], endpoint: string) => sections.includes(section.value) ? $fetch<any>(endpoint, options) : Promise.resolve(null);
    const [nextDashboard, nextStaff, nextAccess, nextAudit, nextLogs] = await Promise.all([
      request(['overview'], '/system-settings/dashboard'),
      request(['staff', 'access'], '/system-settings/staff'),
      request(['staff', 'access'], '/system-settings/access'),
      request(['audit'], '/audit'),
      request(['overview', 'logs'], '/system-settings/logs'),
    ]);
    if (version !== loadVersion || token.value !== identity) return;
    if (nextDashboard) dashboard.value = nextDashboard;
    if (nextStaff) staff.value = nextStaff;
    if (nextAccess) access.value = nextAccess;
    if (nextAudit) audit.value = nextAudit;
    if (nextLogs) logs.value = nextLogs;
    pageLoaded.value = true;
    if (!selectedEmployeeId.value && staff.value.length)
      selectEmployee(staff.value[0].id);
  } catch (error: any) {
    if (version === loadVersion && token.value === identity && !controller.signal.aborted) loadError.value = typeof error?.data?.message === 'string' ? error.data.message : 'Не удалось загрузить настройки. Повторите попытку.';
  } finally {
    if (version === loadVersion) busy.value = false;
  }
}
function selectEmployee(id: string) {
  selectedEmployeeId.value = id;
  const current = staff.value.find((item) => item.id === id);
  overrides.value = {};
  for (const item of current?.permissionOverrides || [])
    overrides.value[item.permission.key] = item.effect;
}
async function createEmployee() {
  await $fetch("/system-settings/staff", {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
    body: employee,
  });
  Object.assign(employee, {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "MANAGER_SALES",
  });
  showCreate.value = false;
  await load();
  showNotice("Сотрудник создан");
}
async function changeEmployee(item: any, change: any) {
  await $fetch(`/system-settings/staff/${item.id}`, {
    baseURL: config.public.apiBase,
    method: "PATCH",
    headers: headers.value,
    body: change,
  });
  await load();
  showNotice(
    change.isActive === false
      ? "Доступ сотрудника заблокирован"
      : "Данные сотрудника обновлены",
  );
}
async function revokeSessions(item: any) {
  const result = await $fetch<any>(
    `/system-settings/staff/${item.id}/sessions`,
    {
      baseURL: config.public.apiBase,
      method: "DELETE",
      headers: headers.value,
    },
  );
  await load();
  showNotice(`Отозвано сессий: ${result.revoked}`);
}
async function saveOverrides() {
  const allow = Object.entries(overrides.value)
    .filter(([, value]) => value === "ALLOW")
    .map(([key]) => key);
  const deny = Object.entries(overrides.value)
    .filter(([, value]) => value === "DENY")
    .map(([key]) => key);
  await $fetch(
    `/system-settings/staff/${selectedEmployeeId.value}/permissions`,
    {
      baseURL: config.public.apiBase,
      method: "PUT",
      headers: headers.value,
      body: { allow, deny },
    },
  );
  await load();
  showNotice("Индивидуальные права сохранены, активные сессии отозваны");
}
async function retryJob(entry: any) {
  await $fetch(`/system-settings/jobs/${entry.id}/retry`, {
    baseURL: config.public.apiBase,
    method: "POST",
    headers: headers.value,
  });
  await load();
  showNotice("Операция снова поставлена в очередь");
}
function showNotice(value: string) {
  notice.value = value;
  setTimeout(() => (notice.value = ""), 2600);
}
function fieldNames(entry: any) {
  return entry.payload?.fields?.length
    ? entry.payload.fields.join(", ")
    : "без полей";
}
function employeeMenu(event: MouseEvent, item: any) {
  const name =
    [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email;
  openContextMenu(
    event,
    name,
    [
      {
        label: "Настроить индивидуальные права",
        icon: "edit",
        action: () => {
          selectEmployee(item.id);
          navigateTo("/system-settings?section=access");
        },
      },
      {
        label: "Копировать email",
        icon: "copy",
        action: () => copyText(item.email, "Email скопирован"),
      },
      {
        label: "Отозвать все сессии",
        icon: "block",
        separator: true,
        confirm: `Завершить все сессии сотрудника «${name}»?`,
        action: () => revokeSessions(item),
      },
      ...(item.id !== user.value?.id
        ? [
            {
              label: item.isActive ? "Заблокировать" : "Разблокировать",
              icon: "block" as const,
              danger: item.isActive,
              confirm: item.isActive
                ? `Заблокировать доступ сотрудника «${name}»?`
                : undefined,
              action: () => changeEmployee(item, { isActive: !item.isActive }),
            },
          ]
        : []),
    ],
    roleLabels[item.role],
  );
}
function auditMenu(event: MouseEvent, entry: any) {
  openContextMenu(
    event,
    actionLabels[entry.action] || entry.action,
    [
      {
        label: "Копировать идентификатор запроса",
        icon: "copy",
        action: () =>
          copyText(entry.correlationId || entry.id, "Идентификатор скопирован"),
      },
      {
        label: "Копировать ID объекта",
        icon: "copy",
        disabled: !entry.resourceId,
        action: () => copyText(entry.resourceId, "ID объекта скопирован"),
      },
    ],
    `${resourceLabels[entry.resource] || entry.resource} · ${new Date(entry.createdAt).toLocaleString("ru-RU")}`,
  );
}
function jobMenu(event: MouseEvent, entry: any) {
  openContextMenu(
    event,
    jobLabels[entry.jobName] || entry.jobName,
    [
      {
        label: "Копировать идентификатор запуска",
        icon: "copy",
        action: () => copyText(entry.id, "Идентификатор скопирован"),
      },
      {
        label: "Копировать идентификатор цепочки",
        icon: "copy",
        action: () =>
          copyText(entry.correlationId, "Идентификатор цепочки скопирован"),
      },
      ...(["FAILED", "CANCELLED"].includes(entry.status)
        ? [
            {
              label: "Повторить операцию",
              icon: "refresh" as const,
              separator: true,
              action: () => retryJob(entry),
            },
          ]
        : []),
    ],
    `${jobStatusLabels[entry.status] || entry.status} · попыток ${entry.attempts}/${entry.maxAttempts}`,
  );
}
onMounted(load);
onUnmounted(() => { ++loadVersion; loadController?.abort(); });
watch(section, () => {
  if (process.client) nextTick(() => window.scrollTo({ top: 0, behavior: "auto" }));
});
</script>

<template>
  <main data-v-ui-c4cc81726fbf class="system-console crm-standard">
    <header data-v-ui-c4cc81726fbf class="system-header crm-page-header">
      <div data-v-ui-c4cc81726fbf>
        <p data-v-ui-c4cc81726fbf class="kicker">{{ title.kicker }}</p>
        <h1 data-v-ui-c4cc81726fbf>{{ title.title }}</h1>
        <span data-v-ui-c4cc81726fbf>{{ title.description }}</span>
      </div>
      <button class="crm-button crm-button--refresh" data-v-ui-c4cc81726fbf v-if="!['integrations', 'bot-commands'].includes(section)" @click="load">
        <RefreshCw data-v-ui-c4cc81726fbf :size="16" :class="{ spin: busy }" /> Обновить
      </button>
    </header>
    <WorkspaceLoading
      v-if="busy && !pageLoaded"
      label="Загружаем настройки экосистемы"
    />
    <div data-v-ui-c4cc81726fbf v-else-if="loadError" class="system-body crm-page-content"><p data-v-ui-c4cc81726fbf class="operation-error" role="alert">{{ loadError }}</p><button class="crm-button" data-v-ui-c4cc81726fbf type="button" @click="load">Повторить загрузку</button></div>
    <div data-v-ui-c4cc81726fbf v-else-if="pageLoaded" class="system-body crm-page-content">
      <template v-if="section === 'overview'"
        ><section data-v-ui-c4cc81726fbf class="kpis">
          <article class="crm-surface" data-v-ui-c4cc81726fbf>
            <span data-v-ui-c4cc81726fbf>Сотрудники</span
            ><strong data-v-ui-c4cc81726fbf
              >{{ dashboard.activeStaff
              }}<small data-v-ui-c4cc81726fbf>/ {{ dashboard.staff }}</small></strong
            >
            <p data-v-ui-c4cc81726fbf>активных учётных записей</p>
          </article>
          <article class="crm-surface" data-v-ui-c4cc81726fbf>
            <span data-v-ui-c4cc81726fbf>Активные сессии</span
            ><strong data-v-ui-c4cc81726fbf>{{ dashboard.sessions }}</strong>
            <p data-v-ui-c4cc81726fbf>входов в рабочие кабинеты</p>
          </article>
          <article class="crm-surface" data-v-ui-c4cc81726fbf>
            <span data-v-ui-c4cc81726fbf>Разрешения</span><strong data-v-ui-c4cc81726fbf>{{ dashboard.permissions }}</strong>
            <p data-v-ui-c4cc81726fbf>операций в матрице доступа</p>
          </article>
          <article class="crm-surface" data-v-ui-c4cc81726fbf>
            <span data-v-ui-c4cc81726fbf>Действия сегодня</span
            ><strong data-v-ui-c4cc81726fbf>{{ dashboard.auditToday }}</strong>
            <p data-v-ui-c4cc81726fbf>записей в журнале аудита</p>
          </article>
        </section>
        <section data-v-ui-c4cc81726fbf class="overview-grid">
          <article data-v-ui-c4cc81726fbf class="panel crm-surface">
            <div data-v-ui-c4cc81726fbf class="panel-head">
              <div data-v-ui-c4cc81726fbf>
                <p data-v-ui-c4cc81726fbf class="kicker">БЕЗОПАСНОСТЬ</p>
                <h2 data-v-ui-c4cc81726fbf>Контур доступа</h2>
              </div>
              <ShieldCheck data-v-ui-c4cc81726fbf :size="22" />
            </div>
            <div data-v-ui-c4cc81726fbf class="health">
              <i data-v-ui-c4cc81726fbf></i
              ><span data-v-ui-c4cc81726fbf
                ><strong data-v-ui-c4cc81726fbf>Матрица прав включена</strong
                ><small data-v-ui-c4cc81726fbf
                  >Каждая критическая операция проверяется сервером</small
                ></span
              >
            </div>
            <div data-v-ui-c4cc81726fbf class="health">
              <i data-v-ui-c4cc81726fbf></i
              ><span data-v-ui-c4cc81726fbf
                ><strong data-v-ui-c4cc81726fbf>Аудит включён</strong
                ><small data-v-ui-c4cc81726fbf
                  >Изменения получают автора и идентификатор запроса</small
                ></span
              >
            </div>
            <div data-v-ui-c4cc81726fbf class="health">
              <i data-v-ui-c4cc81726fbf
                :class="{ warn: dashboard.staff !== dashboard.activeStaff }"
              ></i
              ><span data-v-ui-c4cc81726fbf
                ><strong data-v-ui-c4cc81726fbf
                  >{{ dashboard.staff - dashboard.activeStaff }} заблокированных
                  записей</strong
                ><small data-v-ui-c4cc81726fbf
                  >Их активные сессии автоматически отзываются</small
                ></span
              >
            </div>
          </article>
          <article data-v-ui-c4cc81726fbf class="panel crm-surface">
            <div data-v-ui-c4cc81726fbf class="panel-head">
              <div data-v-ui-c4cc81726fbf>
                <p data-v-ui-c4cc81726fbf class="kicker">ИНТЕГРАЦИИ</p>
                <h2 data-v-ui-c4cc81726fbf>Техническое состояние</h2>
              </div>
              <Activity data-v-ui-c4cc81726fbf :size="22" />
            </div>
            <div data-v-ui-c4cc81726fbf class="metric">
              <span data-v-ui-c4cc81726fbf>Подключённые каналы</span
              ><b data-v-ui-c4cc81726fbf>{{ dashboard.integrations }}</b>
            </div>
            <div data-v-ui-c4cc81726fbf class="metric">
              <span data-v-ui-c4cc81726fbf>Операции синхронизации</span><b data-v-ui-c4cc81726fbf>{{ logs.sync.length }}</b>
            </div>
            <div data-v-ui-c4cc81726fbf class="metric">
              <span data-v-ui-c4cc81726fbf>Последний аудит</span
              ><b data-v-ui-c4cc81726fbf>{{
                audit[0]
                  ? new Date(audit[0].createdAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }}</b>
            </div>
          </article>
        </section></template
      >
      <EcosystemAccounts v-else-if="section === 'accounts'" />
      <EcosystemTrash v-else-if="section === 'trash'" />
      <section data-v-ui-c4cc81726fbf v-else-if="section === 'staff'" class="panel crm-surface">
        <div data-v-ui-c4cc81726fbf class="panel-head">
          <div data-v-ui-c4cc81726fbf>
            <p data-v-ui-c4cc81726fbf class="kicker">КОМАНДА</p>
            <h2 data-v-ui-c4cc81726fbf>Сотрудники и доступ</h2>
            <span data-v-ui-c4cc81726fbf>{{ filteredStaff.length }} учётных записей</span>
          </div>
          <div data-v-ui-c4cc81726fbf class="actions">
            <label data-v-ui-c4cc81726fbf class="search crm-input-group"
              ><Search data-v-ui-c4cc81726fbf :size="16" /><input class="crm-input" data-v-ui-c4cc81726fbf
                v-model="search"
                placeholder="Имя, email или роль" /></label
            ><button data-v-ui-c4cc81726fbf class="primary crm-button crm-button--primary" @click="showCreate = true">
              <Plus data-v-ui-c4cc81726fbf :size="16" /> Добавить
            </button>
          </div>
        </div>
        <div data-v-ui-c4cc81726fbf class="staff-table">
          <div data-v-ui-c4cc81726fbf class="staff-row head crm-table-head">
            <span data-v-ui-c4cc81726fbf>Сотрудник</span><span data-v-ui-c4cc81726fbf>Роль</span><span data-v-ui-c4cc81726fbf>Сессии</span
            ><span data-v-ui-c4cc81726fbf>Состояние</span><span data-v-ui-c4cc81726fbf>Действия</span>
          </div>
          <div data-v-ui-c4cc81726fbf
            v-for="item in filteredStaff"
            :key="item.id"
            class="staff-row crm-data-row crm-table-row"
            @contextmenu.prevent="employeeMenu($event, item)"
          >
            <div data-v-ui-c4cc81726fbf>
              <i data-v-ui-c4cc81726fbf>{{
                (item.firstName || item.email).slice(0, 1).toUpperCase()
              }}</i
              ><span data-v-ui-c4cc81726fbf
                ><strong data-v-ui-c4cc81726fbf>{{
                  [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                  "Без имени"
                }}</strong
                ><small data-v-ui-c4cc81726fbf>{{ item.email }}</small></span
              >
            </div>
            <select class="crm-input" data-v-ui-c4cc81726fbf
              :value="item.role"
              :disabled="item.id === user?.id"
              @change="
                changeEmployee(item, {
                  role: ($event.target as HTMLSelectElement).value,
                })
              "
            >
              <option data-v-ui-c4cc81726fbf v-for="role in access.roles" :key="role" :value="role">
                {{ roleLabels[role] }}
              </option></select
            ><span data-v-ui-c4cc81726fbf>{{ item._count.sessions }}</span
            ><span data-v-ui-c4cc81726fbf :class="item.isActive ? 'active' : 'blocked'">{{
              item.isActive ? "Активен" : "Заблокирован"
            }}</span>
            <div data-v-ui-c4cc81726fbf class="row-actions">
              <button class="crm-button" data-v-ui-c4cc81726fbf title="Отозвать сессии" @click="revokeSessions(item)">
                <KeyRound data-v-ui-c4cc81726fbf :size="15" /></button
              ><button class="crm-button" data-v-ui-c4cc81726fbf
                v-if="item.id !== user?.id"
                :title="item.isActive ? 'Заблокировать' : 'Разблокировать'"
                @click="changeEmployee(item, { isActive: !item.isActive })"
              >
                <UserRoundX data-v-ui-c4cc81726fbf v-if="item.isActive" :size="15" /><UserRoundCheck data-v-ui-c4cc81726fbf
                  v-else
                  :size="15"
                />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section data-v-ui-c4cc81726fbf v-else-if="section === 'access'" class="access-grid">
        <article data-v-ui-c4cc81726fbf class="panel matrix crm-surface">
          <div data-v-ui-c4cc81726fbf class="panel-head">
            <div data-v-ui-c4cc81726fbf>
              <p data-v-ui-c4cc81726fbf class="kicker">БАЗОВЫЕ ПРАВА</p>
              <h2 data-v-ui-c4cc81726fbf>Матрица ролей</h2>
              <span data-v-ui-c4cc81726fbf>Права задаются на сервере для каждой операции</span>
            </div>
          </div>
          <div data-v-ui-c4cc81726fbf class="matrix-scroll">
            <div data-v-ui-c4cc81726fbf class="matrix-row head crm-table-head">
              <span data-v-ui-c4cc81726fbf>Разрешение</span
              ><span data-v-ui-c4cc81726fbf
                v-for="role in access.roles"
                :key="role"
                :title="roleLabels[role]"
                >{{ roleLabels[role]?.split(" ")[0] }}</span
              >
            </div>
            <div data-v-ui-c4cc81726fbf
              v-for="permission in access.permissions"
              :key="permission.key"
              class="matrix-row crm-table-row"
            >
              <div data-v-ui-c4cc81726fbf>
                <strong data-v-ui-c4cc81726fbf>{{ permission.description }}</strong
                ><small data-v-ui-c4cc81726fbf
                  >{{ permission.resource }} · {{ permission.action }}</small
                >
              </div>
              <span data-v-ui-c4cc81726fbf
                v-for="role in access.roles"
                :key="role"
                :class="{ yes: permission.roles.includes(role) }"
                >{{ permission.roles.includes(role) ? "●" : "—" }}</span
              >
            </div>
          </div>
        </article>
        <aside data-v-ui-c4cc81726fbf class="panel overrides crm-surface">
          <div data-v-ui-c4cc81726fbf class="panel-head">
            <div data-v-ui-c4cc81726fbf>
              <p data-v-ui-c4cc81726fbf class="kicker">ИСКЛЮЧЕНИЯ</p>
              <h2 data-v-ui-c4cc81726fbf>Индивидуальные права</h2>
            </div>
          </div>
          <label data-v-ui-c4cc81726fbf
            >Сотрудник<select class="crm-input" data-v-ui-c4cc81726fbf
              :value="selectedEmployeeId"
              @change="
                selectEmployee(($event.target as HTMLSelectElement).value)
              "
            >
              <option data-v-ui-c4cc81726fbf v-for="item in staff" :key="item.id" :value="item.id">
                {{
                  [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                  item.email
                }}
              </option>
            </select></label
          >
          <p data-v-ui-c4cc81726fbf class="hint">
            Базовые права определяет роль. Здесь можно точечно разрешить или
            запретить операцию конкретному сотруднику.
          </p>
          <div data-v-ui-c4cc81726fbf class="permission-list">
            <label data-v-ui-c4cc81726fbf
              v-for="permission in access.permissions"
              :key="permission.key"
              ><span data-v-ui-c4cc81726fbf>{{ permission.description }}</span
              ><select class="crm-input" data-v-ui-c4cc81726fbf v-model="overrides[permission.key]">
                <option data-v-ui-c4cc81726fbf value="">По роли</option>
                <option data-v-ui-c4cc81726fbf value="ALLOW">Разрешить</option>
                <option data-v-ui-c4cc81726fbf value="DENY">Запретить</option>
              </select></label
            >
          </div>
          <button data-v-ui-c4cc81726fbf
            class="primary save crm-button crm-button--primary"
            :disabled="!selectedEmployee"
            @click="saveOverrides"
          >
            Сохранить права
          </button>
        </aside>
      </section>
      <EcosystemIntegrations v-else-if="section === 'integrations'" />
      <BotCommandsSettings v-else-if="section === 'bot-commands'" />
      <section data-v-ui-c4cc81726fbf v-else-if="section === 'audit'" class="panel crm-surface">
        <div data-v-ui-c4cc81726fbf class="panel-head">
          <div data-v-ui-c4cc81726fbf>
            <p data-v-ui-c4cc81726fbf class="kicker">ЦЕНТРАЛЬНАЯ ИСТОРИЯ</p>
            <h2 data-v-ui-c4cc81726fbf>Журнал действий</h2>
            <span data-v-ui-c4cc81726fbf>Последние {{ audit.length }} записей</span>
          </div>
        </div>
        <div data-v-ui-c4cc81726fbf class="audit-table">
          <div data-v-ui-c4cc81726fbf class="audit-row head crm-table-head">
            <span data-v-ui-c4cc81726fbf>Дата</span><span data-v-ui-c4cc81726fbf>Сотрудник</span><span data-v-ui-c4cc81726fbf>Действие</span
            ><span data-v-ui-c4cc81726fbf>Раздел</span><span data-v-ui-c4cc81726fbf>Объект</span><span data-v-ui-c4cc81726fbf>Запрос</span>
          </div>
          <div data-v-ui-c4cc81726fbf
            v-for="entry in audit"
            :key="entry.id"
            class="audit-row crm-data-row crm-table-row"
            @contextmenu.prevent="auditMenu($event, entry)"
          >
            <span data-v-ui-c4cc81726fbf>{{ new Date(entry.createdAt).toLocaleString("ru-RU") }}</span>
            <div data-v-ui-c4cc81726fbf>
              <strong data-v-ui-c4cc81726fbf>{{
                [entry.actor?.firstName, entry.actor?.lastName]
                  .filter(Boolean)
                  .join(" ") || "Система / клиент"
              }}</strong
              ><small data-v-ui-c4cc81726fbf>{{ entry.actor?.email || "Без учётной записи" }}</small>
            </div>
            <span data-v-ui-c4cc81726fbf>{{ actionLabels[entry.action] || entry.action }}</span
            ><span data-v-ui-c4cc81726fbf>{{ resourceLabels[entry.resource] || entry.resource }}</span
            ><span data-v-ui-c4cc81726fbf
              >{{ entry.resourceId || "—"
              }}<small data-v-ui-c4cc81726fbf>{{ fieldNames(entry) }}</small></span
            ><code data-v-ui-c4cc81726fbf>{{ entry.correlationId?.slice(0, 8) || "—" }}</code>
          </div>
          <p data-v-ui-c4cc81726fbf v-if="!audit.length" class="empty">Действий пока нет</p>
        </div>
      </section>
      <section data-v-ui-c4cc81726fbf v-else class="logs-grid">
        <article data-v-ui-c4cc81726fbf class="panel jobs-panel crm-surface">
          <div data-v-ui-c4cc81726fbf class="panel-head">
            <div data-v-ui-c4cc81726fbf>
              <p data-v-ui-c4cc81726fbf class="kicker">ФОНОВЫЕ ОПЕРАЦИИ</p>
              <h2 data-v-ui-c4cc81726fbf>Очередь и выполнения</h2>
              <span data-v-ui-c4cc81726fbf>{{
                logs.queue?.connected ? "Redis подключён" : "Redis недоступен"
              }}</span>
            </div>
            <span data-v-ui-c4cc81726fbf class="queue-health" :class="{ off: !logs.queue?.connected || logs.queue?.workerEnabled === false }">
              <i data-v-ui-c4cc81726fbf></i>{{ !logs.queue?.connected ? "Нет связи" : logs.queue?.workerEnabled === false ? "Автоматика приостановлена" : "Работает" }}
            </span>
          </div>
          <div data-v-ui-c4cc81726fbf class="job-row head crm-table-head">
            <span data-v-ui-c4cc81726fbf>Операция</span><span data-v-ui-c4cc81726fbf>Состояние</span><span data-v-ui-c4cc81726fbf>Прогресс</span
            ><span data-v-ui-c4cc81726fbf>Попытки</span><span data-v-ui-c4cc81726fbf>Запущена</span><span data-v-ui-c4cc81726fbf></span>
          </div>
          <div data-v-ui-c4cc81726fbf
            v-for="entry in logs.jobs"
            :key="entry.id"
            class="job-row"
            @contextmenu.prevent="jobMenu($event, entry)"
          >
            <div data-v-ui-c4cc81726fbf>
              <strong data-v-ui-c4cc81726fbf>{{ jobLabels[entry.jobName] || entry.jobName }}</strong
              ><small data-v-ui-c4cc81726fbf
                >{{ entry.correlationId.slice(0, 8) }} ·
                {{
                  entry.result?.message || entry.error || "Ожидает обработки"
                }}</small
              >
            </div>
            <span data-v-ui-c4cc81726fbf :class="`job-${entry.status.toLowerCase()}`">{{
              jobStatusLabels[entry.status] || entry.status
            }}</span>
            <div data-v-ui-c4cc81726fbf class="job-progress">
              <i data-v-ui-c4cc81726fbf><em data-v-ui-c4cc81726fbf :style="{ width: `${entry.progress}%` }"></em></i
              ><b data-v-ui-c4cc81726fbf>{{ entry.progress }}%</b>
            </div>
            <span data-v-ui-c4cc81726fbf>{{ entry.attempts }} / {{ entry.maxAttempts }}</span>
            <time data-v-ui-c4cc81726fbf>{{ new Date(entry.createdAt).toLocaleString("ru-RU") }}</time>
            <button class="crm-button" data-v-ui-c4cc81726fbf
              v-if="['FAILED', 'CANCELLED'].includes(entry.status)"
              title="Повторить"
              @click="retryJob(entry)"
            >
              <RotateCcw data-v-ui-c4cc81726fbf :size="14" />
            </button>
            <span data-v-ui-c4cc81726fbf v-else></span>
          </div>
          <p data-v-ui-c4cc81726fbf v-if="!logs.jobs.length" class="empty">
            Фоновых операций пока не запускалось
          </p>
        </article>
        <article data-v-ui-c4cc81726fbf class="panel crm-surface">
          <div data-v-ui-c4cc81726fbf class="panel-head">
            <div data-v-ui-c4cc81726fbf>
              <p data-v-ui-c4cc81726fbf class="kicker">ОБМЕН ДАННЫМИ</p>
              <h2 data-v-ui-c4cc81726fbf>Журнал синхронизаций</h2>
            </div>
          </div>
          <div data-v-ui-c4cc81726fbf v-for="entry in logs.sync" :key="entry.id" class="log-row crm-data-row">
            <div data-v-ui-c4cc81726fbf>
              <strong data-v-ui-c4cc81726fbf>{{ entry.system }}</strong
              ><small data-v-ui-c4cc81726fbf>{{ entry.action }}</small>
            </div>
            <span data-v-ui-c4cc81726fbf :class="entry.status === 'SUCCESS' ? 'active' : 'blocked'">{{
              entry.status === "SUCCESS" ? "Успешно" : "Ошибка"
            }}</span
            ><time data-v-ui-c4cc81726fbf>{{
              new Date(entry.createdAt).toLocaleString("ru-RU")
            }}</time>
          </div>
          <p data-v-ui-c4cc81726fbf v-if="!logs.sync.length" class="empty">Синхронизаций пока нет</p>
        </article>
        <article data-v-ui-c4cc81726fbf class="panel crm-surface">
          <div data-v-ui-c4cc81726fbf class="panel-head">
            <div data-v-ui-c4cc81726fbf>
              <p data-v-ui-c4cc81726fbf class="kicker">ВНЕШНИЕ КАНАЛЫ</p>
              <h2 data-v-ui-c4cc81726fbf>Подключения</h2>
            </div>
          </div>
          <div data-v-ui-c4cc81726fbf
            v-for="entry in logs.integrations"
            :key="entry.id"
            class="integration-row"
          >
            <i data-v-ui-c4cc81726fbf :class="{ off: !entry.isActive }"></i>
            <div data-v-ui-c4cc81726fbf>
              <strong data-v-ui-c4cc81726fbf>{{ entry.shopName || entry.channel }}</strong
              ><small data-v-ui-c4cc81726fbf>{{ entry.lastError || "Ошибок не зафиксировано" }}</small>
            </div>
            <span data-v-ui-c4cc81726fbf>{{ entry.isActive ? "Подключено" : "Отключено" }}</span>
          </div>
          <p data-v-ui-c4cc81726fbf v-if="!logs.integrations.length" class="empty">
            Подключений пока нет
          </p>
        </article>
      </section>
    </div>
    <aside data-v-ui-c4cc81726fbf
      v-if="showCreate"
      class="drawer-backdrop admin-dialog-backdrop"
      @click.self="showCreate = false"
    >
      <form data-v-ui-c4cc81726fbf class="drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-label="Добавить сотрудника" @submit.prevent="createEmployee">
        <header data-v-ui-c4cc81726fbf><div data-v-ui-c4cc81726fbf><p data-v-ui-c4cc81726fbf class="kicker">НОВАЯ УЧЁТНАЯ ЗАПИСЬ</p><h2 data-v-ui-c4cc81726fbf>Добавить сотрудника</h2></div><button class="crm-button crm-button--icon" data-v-ui-c4cc81726fbf type="button" aria-label="Закрыть создание сотрудника" @click="showCreate = false"><X data-v-ui-c4cc81726fbf :size="18" /></button></header>
        <div data-v-ui-c4cc81726fbf class="admin-dialog-body fields">
        <label data-v-ui-c4cc81726fbf>Имя<input class="crm-input" data-v-ui-c4cc81726fbf v-model="employee.firstName" required /></label
        ><label data-v-ui-c4cc81726fbf>Фамилия<input class="crm-input" data-v-ui-c4cc81726fbf v-model="employee.lastName" /></label
        ><label data-v-ui-c4cc81726fbf
          >Email<input class="crm-input" data-v-ui-c4cc81726fbf v-model="employee.email" type="email" required /></label
        ><label data-v-ui-c4cc81726fbf
          >Временный пароль<input class="crm-input" data-v-ui-c4cc81726fbf
            v-model="employee.password"
            type="password"
            minlength="10"
            required /></label
        ><label data-v-ui-c4cc81726fbf
          >Роль<select class="crm-input" data-v-ui-c4cc81726fbf v-model="employee.role">
            <option data-v-ui-c4cc81726fbf v-for="role in access.roles" :key="role" :value="role">
              {{ roleLabels[role] }}
            </option>
          </select></label
        ></div><footer data-v-ui-c4cc81726fbf><button class="crm-button" data-v-ui-c4cc81726fbf type="button" @click="showCreate=false">Отмена</button><button data-v-ui-c4cc81726fbf class="primary crm-button crm-button--primary" type="submit">Создать сотрудника</button></footer>
      </form>
    </aside>
    <div data-v-ui-c4cc81726fbf v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
