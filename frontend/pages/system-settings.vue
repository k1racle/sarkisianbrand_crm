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
const { token, user } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const section = computed(() => String(route.query.section || "overview"));
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
const menu: Record<string, { title: string; kicker: string }> = {
  overview: { title: "Настройки экосистемы", kicker: "УПРАВЛЕНИЕ ПЛАТФОРМОЙ" },
  staff: { title: "Сотрудники", kicker: "УЧЁТНЫЕ ЗАПИСИ" },
  access: { title: "Роли и права", kicker: "БЕЗОПАСНОСТЬ ДОСТУПА" },
  audit: { title: "Журнал действий", kicker: "АУДИТ ИЗМЕНЕНИЙ" },
  logs: { title: "Технические журналы", kicker: "СОСТОЯНИЕ ИНТЕГРАЦИЙ" },
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
  busy.value = true;
  try {
    [dashboard.value, staff.value, access.value, audit.value, logs.value] =
      await Promise.all([
        $fetch("/system-settings/dashboard", {
          baseURL: config.public.apiBase,
          headers: headers.value,
        }),
        $fetch<any[]>("/system-settings/staff", {
          baseURL: config.public.apiBase,
          headers: headers.value,
        }),
        $fetch("/system-settings/access", {
          baseURL: config.public.apiBase,
          headers: headers.value,
        }),
        $fetch<any[]>("/audit", {
          baseURL: config.public.apiBase,
          headers: headers.value,
        }),
        $fetch("/system-settings/logs", {
          baseURL: config.public.apiBase,
          headers: headers.value,
        }),
      ]);
    if (!selectedEmployeeId.value && staff.value.length)
      selectEmployee(staff.value[0].id);
  } finally {
    busy.value = false;
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
</script>

<template>
  <main class="system-console">
    <header class="system-header">
      <div>
        <p class="kicker">{{ title.kicker }}</p>
        <h1>{{ title.title }}</h1>
        <span
          >Центральное управление доступом, аудитом и техническим
          состоянием</span
        >
      </div>
      <button @click="load">
        <RefreshCw :size="16" :class="{ spin: busy }" /> Обновить
      </button>
    </header>
    <WorkspaceLoading
      v-if="!dashboard"
      label="Загружаем настройки экосистемы"
    />
    <div v-else class="system-body">
      <template v-if="section === 'overview'"
        ><section class="kpis">
          <article>
            <span>Сотрудники</span
            ><strong
              >{{ dashboard.activeStaff
              }}<small>/ {{ dashboard.staff }}</small></strong
            >
            <p>активных учётных записей</p>
          </article>
          <article>
            <span>Активные сессии</span
            ><strong>{{ dashboard.sessions }}</strong>
            <p>входов в рабочие кабинеты</p>
          </article>
          <article>
            <span>Разрешения</span><strong>{{ dashboard.permissions }}</strong>
            <p>операций в матрице доступа</p>
          </article>
          <article>
            <span>Действия сегодня</span
            ><strong>{{ dashboard.auditToday }}</strong>
            <p>записей в журнале аудита</p>
          </article>
        </section>
        <section class="overview-grid">
          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="kicker">БЕЗОПАСНОСТЬ</p>
                <h2>Контур доступа</h2>
              </div>
              <ShieldCheck :size="22" />
            </div>
            <div class="health">
              <i></i
              ><span
                ><strong>Матрица прав включена</strong
                ><small
                  >Каждая критическая операция проверяется сервером</small
                ></span
              >
            </div>
            <div class="health">
              <i></i
              ><span
                ><strong>Аудит включён</strong
                ><small
                  >Изменения получают автора и идентификатор запроса</small
                ></span
              >
            </div>
            <div class="health">
              <i
                :class="{ warn: dashboard.staff !== dashboard.activeStaff }"
              ></i
              ><span
                ><strong
                  >{{ dashboard.staff - dashboard.activeStaff }} заблокированных
                  записей</strong
                ><small
                  >Их активные сессии автоматически отзываются</small
                ></span
              >
            </div>
          </article>
          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="kicker">ИНТЕГРАЦИИ</p>
                <h2>Техническое состояние</h2>
              </div>
              <Activity :size="22" />
            </div>
            <div class="metric">
              <span>Подключённые каналы</span
              ><b>{{ dashboard.integrations }}</b>
            </div>
            <div class="metric">
              <span>Операции синхронизации</span><b>{{ logs.sync.length }}</b>
            </div>
            <div class="metric">
              <span>Последний аудит</span
              ><b>{{
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
      <section v-else-if="section === 'staff'" class="panel">
        <div class="panel-head">
          <div>
            <p class="kicker">КОМАНДА</p>
            <h2>Сотрудники и доступ</h2>
            <span>{{ filteredStaff.length }} учётных записей</span>
          </div>
          <div class="actions">
            <label class="search"
              ><Search :size="16" /><input
                v-model="search"
                placeholder="Имя, email или роль" /></label
            ><button class="primary" @click="showCreate = true">
              <Plus :size="16" /> Добавить
            </button>
          </div>
        </div>
        <div class="staff-table">
          <div class="staff-row head">
            <span>Сотрудник</span><span>Роль</span><span>Сессии</span
            ><span>Состояние</span><span>Действия</span>
          </div>
          <div
            v-for="item in filteredStaff"
            :key="item.id"
            class="staff-row"
            @contextmenu.prevent="employeeMenu($event, item)"
          >
            <div>
              <i>{{
                (item.firstName || item.email).slice(0, 1).toUpperCase()
              }}</i
              ><span
                ><strong>{{
                  [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                  "Без имени"
                }}</strong
                ><small>{{ item.email }}</small></span
              >
            </div>
            <select
              :value="item.role"
              :disabled="item.id === user?.id"
              @change="
                changeEmployee(item, {
                  role: ($event.target as HTMLSelectElement).value,
                })
              "
            >
              <option v-for="role in access.roles" :key="role" :value="role">
                {{ roleLabels[role] }}
              </option></select
            ><span>{{ item._count.sessions }}</span
            ><span :class="item.isActive ? 'active' : 'blocked'">{{
              item.isActive ? "Активен" : "Заблокирован"
            }}</span>
            <div class="row-actions">
              <button title="Отозвать сессии" @click="revokeSessions(item)">
                <KeyRound :size="15" /></button
              ><button
                v-if="item.id !== user?.id"
                :title="item.isActive ? 'Заблокировать' : 'Разблокировать'"
                @click="changeEmployee(item, { isActive: !item.isActive })"
              >
                <UserRoundX v-if="item.isActive" :size="15" /><UserRoundCheck
                  v-else
                  :size="15"
                />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section v-else-if="section === 'access'" class="access-grid">
        <article class="panel matrix">
          <div class="panel-head">
            <div>
              <p class="kicker">БАЗОВЫЕ ПРАВА</p>
              <h2>Матрица ролей</h2>
              <span>Права задаются на сервере для каждой операции</span>
            </div>
          </div>
          <div class="matrix-scroll">
            <div class="matrix-row head">
              <span>Разрешение</span
              ><span
                v-for="role in access.roles"
                :key="role"
                :title="roleLabels[role]"
                >{{ roleLabels[role]?.split(" ")[0] }}</span
              >
            </div>
            <div
              v-for="permission in access.permissions"
              :key="permission.key"
              class="matrix-row"
            >
              <div>
                <strong>{{ permission.description }}</strong
                ><small
                  >{{ permission.resource }} · {{ permission.action }}</small
                >
              </div>
              <span
                v-for="role in access.roles"
                :key="role"
                :class="{ yes: permission.roles.includes(role) }"
                >{{ permission.roles.includes(role) ? "●" : "—" }}</span
              >
            </div>
          </div>
        </article>
        <aside class="panel overrides">
          <div class="panel-head">
            <div>
              <p class="kicker">ИСКЛЮЧЕНИЯ</p>
              <h2>Индивидуальные права</h2>
            </div>
          </div>
          <label
            >Сотрудник<select
              :value="selectedEmployeeId"
              @change="
                selectEmployee(($event.target as HTMLSelectElement).value)
              "
            >
              <option v-for="item in staff" :key="item.id" :value="item.id">
                {{
                  [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                  item.email
                }}
              </option>
            </select></label
          >
          <p class="hint">
            Базовые права определяет роль. Здесь можно точечно разрешить или
            запретить операцию конкретному сотруднику.
          </p>
          <div class="permission-list">
            <label
              v-for="permission in access.permissions"
              :key="permission.key"
              ><span>{{ permission.description }}</span
              ><select v-model="overrides[permission.key]">
                <option value="">По роли</option>
                <option value="ALLOW">Разрешить</option>
                <option value="DENY">Запретить</option>
              </select></label
            >
          </div>
          <button
            class="primary save"
            :disabled="!selectedEmployee"
            @click="saveOverrides"
          >
            Сохранить права
          </button>
        </aside>
      </section>
      <section v-else-if="section === 'audit'" class="panel">
        <div class="panel-head">
          <div>
            <p class="kicker">ЦЕНТРАЛЬНАЯ ИСТОРИЯ</p>
            <h2>Журнал действий</h2>
            <span>Последние {{ audit.length }} записей</span>
          </div>
        </div>
        <div class="audit-table">
          <div class="audit-row head">
            <span>Дата</span><span>Сотрудник</span><span>Действие</span
            ><span>Раздел</span><span>Объект</span><span>Запрос</span>
          </div>
          <div
            v-for="entry in audit"
            :key="entry.id"
            class="audit-row"
            @contextmenu.prevent="auditMenu($event, entry)"
          >
            <span>{{ new Date(entry.createdAt).toLocaleString("ru-RU") }}</span>
            <div>
              <strong>{{
                [entry.actor?.firstName, entry.actor?.lastName]
                  .filter(Boolean)
                  .join(" ") || "Система / клиент"
              }}</strong
              ><small>{{ entry.actor?.email || "Без учётной записи" }}</small>
            </div>
            <span>{{ actionLabels[entry.action] || entry.action }}</span
            ><span>{{ resourceLabels[entry.resource] || entry.resource }}</span
            ><span
              >{{ entry.resourceId || "—"
              }}<small>{{ fieldNames(entry) }}</small></span
            ><code>{{ entry.correlationId?.slice(0, 8) || "—" }}</code>
          </div>
          <p v-if="!audit.length" class="empty">Действий пока нет</p>
        </div>
      </section>
      <section v-else class="logs-grid">
        <article class="panel jobs-panel">
          <div class="panel-head">
            <div>
              <p class="kicker">ФОНОВЫЕ ОПЕРАЦИИ</p>
              <h2>Очередь и выполнения</h2>
              <span>{{
                logs.queue?.connected ? "Redis подключён" : "Redis недоступен"
              }}</span>
            </div>
            <span class="queue-health" :class="{ off: !logs.queue?.connected }">
              <i></i>{{ logs.queue?.connected ? "Работает" : "Нет связи" }}
            </span>
          </div>
          <div class="job-row head">
            <span>Операция</span><span>Состояние</span><span>Прогресс</span
            ><span>Попытки</span><span>Запущена</span><span></span>
          </div>
          <div
            v-for="entry in logs.jobs"
            :key="entry.id"
            class="job-row"
            @contextmenu.prevent="jobMenu($event, entry)"
          >
            <div>
              <strong>{{ jobLabels[entry.jobName] || entry.jobName }}</strong
              ><small
                >{{ entry.correlationId.slice(0, 8) }} ·
                {{
                  entry.result?.message || entry.error || "Ожидает обработки"
                }}</small
              >
            </div>
            <span :class="`job-${entry.status.toLowerCase()}`">{{
              jobStatusLabels[entry.status] || entry.status
            }}</span>
            <div class="job-progress">
              <i><em :style="{ width: `${entry.progress}%` }"></em></i
              ><b>{{ entry.progress }}%</b>
            </div>
            <span>{{ entry.attempts }} / {{ entry.maxAttempts }}</span>
            <time>{{ new Date(entry.createdAt).toLocaleString("ru-RU") }}</time>
            <button
              v-if="['FAILED', 'CANCELLED'].includes(entry.status)"
              title="Повторить"
              @click="retryJob(entry)"
            >
              <RotateCcw :size="14" />
            </button>
            <span v-else></span>
          </div>
          <p v-if="!logs.jobs.length" class="empty">
            Фоновых операций пока не запускалось
          </p>
        </article>
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="kicker">ОБМЕН ДАННЫМИ</p>
              <h2>Журнал синхронизаций</h2>
            </div>
          </div>
          <div v-for="entry in logs.sync" :key="entry.id" class="log-row">
            <div>
              <strong>{{ entry.system }}</strong
              ><small>{{ entry.action }}</small>
            </div>
            <span :class="entry.status === 'SUCCESS' ? 'active' : 'blocked'">{{
              entry.status === "SUCCESS" ? "Успешно" : "Ошибка"
            }}</span
            ><time>{{
              new Date(entry.createdAt).toLocaleString("ru-RU")
            }}</time>
          </div>
          <p v-if="!logs.sync.length" class="empty">Синхронизаций пока нет</p>
        </article>
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="kicker">ВНЕШНИЕ КАНАЛЫ</p>
              <h2>Подключения</h2>
            </div>
          </div>
          <div
            v-for="entry in logs.integrations"
            :key="entry.id"
            class="integration-row"
          >
            <i :class="{ off: !entry.isActive }"></i>
            <div>
              <strong>{{ entry.shopName || entry.channel }}</strong
              ><small>{{ entry.lastError || "Ошибок не зафиксировано" }}</small>
            </div>
            <span>{{ entry.isActive ? "Подключено" : "Отключено" }}</span>
          </div>
          <p v-if="!logs.integrations.length" class="empty">
            Подключений пока нет
          </p>
        </article>
      </section>
    </div>
    <aside
      v-if="showCreate"
      class="drawer-backdrop"
      @click.self="showCreate = false"
    >
      <form class="drawer" @submit.prevent="createEmployee">
        <button type="button" class="close" @click="showCreate = false">
          <X :size="18" />
        </button>
        <p class="kicker">НОВАЯ УЧЁТНАЯ ЗАПИСЬ</p>
        <h2>Добавить сотрудника</h2>
        <label>Имя<input v-model="employee.firstName" required /></label
        ><label>Фамилия<input v-model="employee.lastName" /></label
        ><label
          >Email<input v-model="employee.email" type="email" required /></label
        ><label
          >Временный пароль<input
            v-model="employee.password"
            type="password"
            minlength="10"
            required /></label
        ><label
          >Роль<select v-model="employee.role">
            <option v-for="role in access.roles" :key="role" :value="role">
              {{ roleLabels[role] }}
            </option>
          </select></label
        ><button class="primary" type="submit">Создать сотрудника</button>
      </form>
    </aside>
    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>

<style scoped>
.system-console {
  min-height: 100vh;
  background: var(--sb-bg);
  color: var(--sb-ink);
  font-family: var(--sb-font);
}
.system-header {
  height: 112px;
  padding: 23px 5%;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.system-header h1 {
  font-size: 30px;
  line-height: 1.1;
  margin: 0 0 7px;
}
.system-header span,
.panel-head span {
  font-size: 10px;
  color: var(--sb-muted);
}
.system-header button,
.primary {
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--sb-line);
  background: #fff;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.primary {
  background: var(--sb-ink);
  border-color: var(--sb-ink);
  color: #fff;
}
.kicker {
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--sb-coral);
  font-weight: 600;
  margin: 0 0 8px;
}
.system-body {
  max-width: 1280px;
  margin: auto;
  padding: 30px 5% 70px;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.kpis article,
.panel {
  background: #fff;
  border: 1px solid var(--sb-line);
}
.kpis article {
  padding: 22px;
  display: grid;
  gap: 8px;
}
.kpis span,
.kpis p {
  font-size: 10px;
  color: var(--sb-muted);
  margin: 0;
}
.kpis strong {
  font-size: 28px;
  font-weight: 500;
}
.kpis strong small {
  font-size: 12px;
  color: var(--sb-muted);
}
.overview-grid,
.logs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}
.panel-head {
  padding: 23px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.panel-head h2 {
  font-size: 20px;
  margin: 0 0 6px;
}
.health {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  margin: 0 23px;
  border-top: 1px solid #eff0f2;
}
.health i,
.integration-row > i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2c9566;
  box-shadow: 0 0 0 4px #e8f6ef;
}
.health i.warn {
  background: #d18b33;
  box-shadow: 0 0 0 4px #fff3df;
}
.health span {
  display: grid;
  gap: 4px;
}
.health strong {
  font-size: 11px;
}
.health small {
  font-size: 9px;
  color: var(--sb-muted);
}
.metric {
  height: 57px;
  margin: 0 23px;
  border-top: 1px solid #eff0f2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}
.metric span {
  color: var(--sb-muted);
}
.metric b {
  font-size: 18px;
}
.actions {
  display: flex;
  gap: 8px;
}
.search {
  width: 260px;
  height: 40px;
  box-sizing: border-box;
  border: 1px solid var(--sb-line);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--sb-muted);
}
.search input {
  border: 0;
  outline: 0;
  width: 100%;
  font-size: 11px;
}
.staff-table,
.audit-table,
.matrix-scroll {
  overflow: auto;
}
.staff-row {
  min-width: 900px;
  display: grid;
  grid-template-columns: 2fr 1.5fr 0.7fr 1fr 1fr;
  gap: 15px;
  align-items: center;
  padding: 13px 23px;
  border-top: 1px solid #eff0f2;
  font-size: 11px;
}
.staff-row.head,
.audit-row.head,
.matrix-row.head {
  color: var(--sb-muted);
  font-size: 9px;
  text-transform: uppercase;
}
.staff-row > div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
}
.staff-row i {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f2f4;
  display: grid;
  place-items: center;
  font-style: normal;
}
.staff-row div span,
.audit-row div {
  display: grid;
  gap: 3px;
}
.staff-row small,
.audit-row small,
.matrix-row small,
.log-row small,
.integration-row small {
  font-size: 8px;
  color: var(--sb-muted);
}
select,
input {
  border: 1px solid var(--sb-line);
  background: #fff;
  height: 36px;
  padding: 0 9px;
  font-size: 10px;
}
.active {
  color: #27865b;
}
.blocked {
  color: #b45143;
}
.row-actions {
  display: flex !important;
  gap: 5px;
}
.row-actions button {
  width: 34px;
  height: 32px;
  border: 1px solid var(--sb-line);
  background: #fff;
}
.access-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.7fr);
  gap: 15px;
}
.matrix-row {
  min-width: 970px;
  display: grid;
  grid-template-columns: 2.5fr repeat(10, 0.7fr);
  gap: 8px;
  align-items: center;
  padding: 11px 20px;
  border-top: 1px solid #eff0f2;
  font-size: 9px;
  text-align: center;
}
.matrix-row > div {
  text-align: left;
  display: grid;
  gap: 4px;
}
.matrix-row .yes {
  color: #27865b;
}
.overrides {
  height: fit-content;
}
.overrides > label,
.drawer label {
  display: grid;
  gap: 6px;
  margin: 0 23px 15px;
  color: var(--sb-muted);
  font-size: 10px;
}
.hint {
  margin: 0 23px 15px;
  color: var(--sb-muted);
  font-size: 9px;
  line-height: 1.6;
}
.permission-list {
  max-height: 440px;
  overflow: auto;
  border-top: 1px solid #eff0f2;
}
.permission-list label {
  display: grid;
  grid-template-columns: 1fr 105px;
  gap: 8px;
  align-items: center;
  padding: 9px 23px;
  border-bottom: 1px solid #eff0f2;
  font-size: 9px;
}
.permission-list select {
  height: 30px;
}
.save {
  margin: 18px 23px;
}
.audit-row {
  min-width: 1000px;
  display: grid;
  grid-template-columns: 1.1fr 1.5fr 1fr 1.1fr 1.1fr 0.6fr;
  gap: 14px;
  align-items: center;
  padding: 12px 23px;
  border-top: 1px solid #eff0f2;
  font-size: 10px;
}
.audit-row > span:nth-child(5) {
  display: grid;
  gap: 3px;
}
.audit-row code {
  font-size: 9px;
  color: var(--sb-muted);
}
.logs-grid {
  margin-top: 0;
}
.jobs-panel {
  grid-column: 1 / -1;
}
.queue-health {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #27865b !important;
}
.queue-health i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2c9566;
  box-shadow: 0 0 0 4px #e8f6ef;
}
.queue-health.off {
  color: #b45143 !important;
}
.queue-health.off i {
  background: #b45143;
  box-shadow: 0 0 0 4px #f7e8e5;
}
.job-row {
  min-width: 940px;
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 0.65fr 1.15fr 32px;
  gap: 14px;
  align-items: center;
  padding: 12px 23px;
  border-top: 1px solid #eff0f2;
  font-size: 10px;
}
.job-row.head {
  color: var(--sb-muted);
  font-size: 9px;
  text-transform: uppercase;
}
.job-row > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.job-row small {
  color: var(--sb-muted);
  font-size: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.job-row time {
  color: var(--sb-muted);
  font-size: 9px;
}
.job-row button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--sb-line);
  background: #fff;
}
.job-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}
.job-progress > i {
  height: 4px;
  background: #eceef0;
  overflow: hidden;
}
.job-progress em {
  display: block;
  height: 100%;
  background: var(--sb-coral);
}
.job-progress b {
  font-size: 9px;
  font-weight: 500;
}
.job-completed {
  color: #27865b;
}
.job-failed,
.job-cancelled {
  color: #b45143;
}
.job-active,
.job-retrying {
  color: #c47a24;
}
.log-row,
.integration-row {
  min-height: 56px;
  margin: 0 23px;
  border-top: 1px solid #eff0f2;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
  font-size: 10px;
}
.log-row > div,
.integration-row > div {
  display: grid;
  gap: 4px;
}
.log-row time {
  color: var(--sb-muted);
  font-size: 9px;
}
.integration-row {
  grid-template-columns: 12px 1fr auto;
}
.integration-row > i.off {
  background: #aaa;
  box-shadow: 0 0 0 4px #f0f1f3;
}
.empty {
  text-align: center;
  padding: 30px;
  color: var(--sb-muted);
  font-size: 10px;
}
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: #0005;
  z-index: 500;
}
.drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(430px, 92vw);
  box-sizing: border-box;
  background: #fff;
  padding: 38px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.drawer h2 {
  font-size: 27px;
  margin: 0 0 25px;
}
.drawer label {
  margin: 0 0 14px;
}
.drawer input,
.drawer select {
  height: 41px;
}
.drawer .primary {
  margin-top: 8px;
}
.close {
  position: absolute;
  right: 18px;
  top: 18px;
  border: 0;
  background: none;
}
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: var(--sb-ink);
  color: #fff;
  padding: 13px 18px;
  font-size: 11px;
  z-index: 600;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1000px) {
  .access-grid,
  .overview-grid,
  .logs-grid {
    grid-template-columns: 1fr;
  }
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 650px) {
  .system-header {
    height: auto;
    align-items: flex-start;
    gap: 15px;
    flex-direction: column;
  }
  .system-body {
    padding: 20px 15px;
  }
  .kpis {
    grid-template-columns: 1fr 1fr;
  }
  .panel-head {
    gap: 12px;
    flex-direction: column;
  }
  .actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .search {
    width: 100%;
  }
}
</style>
