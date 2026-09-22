<script setup lang="ts">
import { AlertTriangle, ArrowRight, CalendarClock, Circle, CircleDollarSign, ContactRound, Kanban, ListTodo, MessageSquareText, Plus, RefreshCw, Target } from '@lucide/vue';
useHead({ title: 'Мой день — SARKISIAN CRM' });

const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const dashboard = ref<any>(null);
const tasks = ref<any[]>([]);
const loading = ref(true);
const error = ref('');
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const money = (value: unknown) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(value || 0));
const taskStatus: Record<string, string> = { BACKLOG: 'В очереди', TODO: 'Запланирована', IN_PROGRESS: 'В работе', REVIEW: 'На проверке', OVERDUE: 'Просрочена', DONE: 'Выполнена', CANCELLED: 'В архиве' };
const activeTasks = computed(() => tasks.value.filter(item => !['DONE', 'CANCELLED'].includes(item.status)));
const urgentTasks = computed(() => [...activeTasks.value].sort((a, b) => {
  if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
  if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
  return new Date(a.dueDate || '2999-01-01').getTime() - new Date(b.dueDate || '2999-01-01').getTime();
}).slice(0, 6));
const funnelMax = computed(() => Math.max(1, ...(dashboard.value?.funnel || []).map((item: any) => item.count)));

function person(user: any) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Система';
}
async function load() {
  loading.value = true;
  error.value = '';
  try {
    [dashboard.value, tasks.value] = await Promise.all([
      $fetch('/crm/dashboard', { baseURL: config.public.apiBase, headers: headers.value }),
      $fetch<any[]>('/crm/tasks', { baseURL: config.public.apiBase, headers: headers.value }),
    ]);
  } catch (exception: any) {
    error.value = exception?.data?.message || 'Не удалось загрузить рабочий стол CRM';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <main data-v-ui-9c61dc015e2a class="crm-main">
    <WorkspaceLoading v-if="loading" label="Собираем показатели CRM" />
    <template v-else>
      <header data-v-ui-9c61dc015e2a class="page-head">
        <div data-v-ui-9c61dc015e2a>
          <p data-v-ui-9c61dc015e2a>CRM / ЦЕНТР ПРОДАЖ</p>
          <h1 data-v-ui-9c61dc015e2a>Мой день</h1>
          <span data-v-ui-9c61dc015e2a>Ближайшие задачи, продажи и последние обращения команды</span>
        </div>
        <div data-v-ui-9c61dc015e2a class="head-actions">
          <button data-v-ui-9c61dc015e2a class="light" @click="load"><RefreshCw data-v-ui-9c61dc015e2a :size="16" />Обновить</button>
          <NuxtLink data-v-ui-9c61dc015e2a to="/crm/tasks?create=1" class="light"><ListTodo data-v-ui-9c61dc015e2a :size="20" />Новая задача</NuxtLink>
          <NuxtLink data-v-ui-9c61dc015e2a to="/crm/deals?create=1" class="primary"><Plus data-v-ui-9c61dc015e2a :size="20" />Новая сделка</NuxtLink>
        </div>
      </header>

      <section data-v-ui-9c61dc015e2a v-if="error" class="error-state"><AlertTriangle data-v-ui-9c61dc015e2a :size="18" />{{ error }} <button data-v-ui-9c61dc015e2a @click="load">Повторить</button></section>
      <template v-else-if="dashboard">
        <section data-v-ui-9c61dc015e2a class="kpis">
          <article data-v-ui-9c61dc015e2a class="accent">
            <i data-v-ui-9c61dc015e2a><Target data-v-ui-9c61dc015e2a :size="18" /></i><span data-v-ui-9c61dc015e2a>Прогноз продаж</span>
            <strong data-v-ui-9c61dc015e2a>{{ money(dashboard.forecast) }}</strong><small data-v-ui-9c61dc015e2a>взвешенная сумма открытых сделок</small>
          </article>
          <article data-v-ui-9c61dc015e2a class="crm-kpi-success">
            <i data-v-ui-9c61dc015e2a><CircleDollarSign data-v-ui-9c61dc015e2a :size="18" /></i><span data-v-ui-9c61dc015e2a>Продано за месяц</span>
            <strong data-v-ui-9c61dc015e2a>{{ money(dashboard.wonMonth?.amount) }}</strong><small data-v-ui-9c61dc015e2a>{{ dashboard.wonMonth?.count || 0 }} успешных сделок</small>
          </article>
          <article data-v-ui-9c61dc015e2a>
            <i data-v-ui-9c61dc015e2a><Kanban data-v-ui-9c61dc015e2a :size="18" /></i><span data-v-ui-9c61dc015e2a>Открытые сделки</span>
            <strong data-v-ui-9c61dc015e2a>{{ dashboard.openLeads }}</strong><small data-v-ui-9c61dc015e2a>{{ dashboard.customers }} клиентов в единой базе</small>
          </article>
          <article data-v-ui-9c61dc015e2a :class="{ danger: dashboard.overdueTasks, 'crm-kpi-attention': !dashboard.overdueTasks && dashboard.dueToday }">
            <i data-v-ui-9c61dc015e2a><CalendarClock data-v-ui-9c61dc015e2a :size="18" /></i><span data-v-ui-9c61dc015e2a>Контроль задач</span>
            <strong data-v-ui-9c61dc015e2a>{{ dashboard.overdueTasks }}</strong><small data-v-ui-9c61dc015e2a>просрочено · {{ dashboard.dueToday }} на сегодня</small>
          </article>
        </section>

        <section data-v-ui-9c61dc015e2a class="dashboard-grid">
          <article data-v-ui-9c61dc015e2a class="panel tasks-panel">
            <header data-v-ui-9c61dc015e2a>
              <div data-v-ui-9c61dc015e2a><p data-v-ui-9c61dc015e2a>СЕГОДНЯ В РАБОТЕ</p><h2 data-v-ui-9c61dc015e2a>Ближайшие задачи</h2></div>
              <NuxtLink data-v-ui-9c61dc015e2a to="/crm/tasks">Все задачи <ArrowRight data-v-ui-9c61dc015e2a :size="14" /></NuxtLink>
            </header>
            <div data-v-ui-9c61dc015e2a v-if="urgentTasks.length" class="task-list">
              <button data-v-ui-9c61dc015e2a v-for="task in urgentTasks" :key="task.id" @click="navigateTo('/crm/tasks')">
                <span data-v-ui-9c61dc015e2a class="task-check" :class="task.status.toLowerCase()"><AlertTriangle v-if="task.status === 'OVERDUE'" :size="18" /><Circle v-else :size="18" /></span>
                <span data-v-ui-9c61dc015e2a class="task-copy"><b data-v-ui-9c61dc015e2a>{{ task.title }}</b><small data-v-ui-9c61dc015e2a>{{ person(task.assignedTo) }}</small></span>
                <span data-v-ui-9c61dc015e2a class="task-date" :class="{ late: task.status === 'OVERDUE' }">
                  <b data-v-ui-9c61dc015e2a>{{ taskStatus[task.status] || task.status }}</b>
                  <small data-v-ui-9c61dc015e2a>{{ task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Без срока' }}</small>
                </span>
              </button>
            </div>
            <div data-v-ui-9c61dc015e2a v-else class="empty">Нет активных задач — отличный момент запланировать следующий шаг.</div>
          </article>

          <article data-v-ui-9c61dc015e2a class="panel funnel-panel">
            <header data-v-ui-9c61dc015e2a>
              <div data-v-ui-9c61dc015e2a><p data-v-ui-9c61dc015e2a>ВОРОНКА</p><h2 data-v-ui-9c61dc015e2a>Продажи по этапам</h2></div>
              <NuxtLink data-v-ui-9c61dc015e2a to="/crm/deals">Открыть воронку <ArrowRight data-v-ui-9c61dc015e2a :size="14" /></NuxtLink>
            </header>
            <div data-v-ui-9c61dc015e2a v-if="dashboard.funnel?.length" class="funnel">
              <button data-v-ui-9c61dc015e2a v-for="stage in dashboard.funnel" :key="stage.id" @click="navigateTo('/crm/deals')">
                <span data-v-ui-9c61dc015e2a class="stage-name"><i data-v-ui-9c61dc015e2a :style="{ background: stage.color }"></i>{{ stage.name }}</span>
                <span data-v-ui-9c61dc015e2a class="stage-value"><b data-v-ui-9c61dc015e2a>{{ stage.count }}</b><small data-v-ui-9c61dc015e2a>{{ money(stage.amount) }}</small></span>
                <span data-v-ui-9c61dc015e2a class="bar"><i data-v-ui-9c61dc015e2a :style="{ width: `${Math.max(stage.count ? 8 : 0, stage.count / funnelMax * 100)}%`, background: stage.color }"></i></span>
              </button>
            </div>
            <div data-v-ui-9c61dc015e2a v-else class="empty">Здесь появятся этапы и суммы сделок. Начните с настройки воронки продаж.</div>
          </article>



          <article data-v-ui-9c61dc015e2a class="panel activity-panel">
            <header data-v-ui-9c61dc015e2a>
              <div data-v-ui-9c61dc015e2a><p data-v-ui-9c61dc015e2a>ЛЕНТА</p><h2 data-v-ui-9c61dc015e2a>Последние контакты</h2></div>
            </header>
            <div data-v-ui-9c61dc015e2a v-if="dashboard.recentInteractions?.length" class="activity-list">
              <button data-v-ui-9c61dc015e2a v-for="item in dashboard.recentInteractions" :key="item.id" @click="navigateTo('/crm/deals')">
                <i data-v-ui-9c61dc015e2a><MessageSquareText data-v-ui-9c61dc015e2a :size="14" /></i>
                <span data-v-ui-9c61dc015e2a><b data-v-ui-9c61dc015e2a>{{ item.lead?.title || item.lead?.contactName || 'Контакт с клиентом' }}</b><small data-v-ui-9c61dc015e2a>{{ item.content }}</small></span>
                <time data-v-ui-9c61dc015e2a>{{ person(item.user) }}<small data-v-ui-9c61dc015e2a>{{ new Date(item.createdAt).toLocaleString('ru-RU') }}</small></time>
              </button>
            </div>
            <div data-v-ui-9c61dc015e2a v-else class="empty">История взаимодействий появится после первого звонка, письма или заметки в сделке.</div>
          </article>

          <article data-v-ui-9c61dc015e2a class="panel quick-panel">
            <header data-v-ui-9c61dc015e2a><div data-v-ui-9c61dc015e2a><p data-v-ui-9c61dc015e2a>БЫСТРЫЙ ДОСТУП</p><h2 data-v-ui-9c61dc015e2a>Рабочие разделы</h2></div></header>
            <div data-v-ui-9c61dc015e2a class="quick-grid">
              <NuxtLink data-v-ui-9c61dc015e2a to="/crm/deals"><Kanban data-v-ui-9c61dc015e2a :size="20" /><span data-v-ui-9c61dc015e2a><b data-v-ui-9c61dc015e2a>Воронка продаж</b><small data-v-ui-9c61dc015e2a>Сделки и прогноз</small></span><ArrowRight data-v-ui-9c61dc015e2a :size="15" /></NuxtLink>
              <NuxtLink data-v-ui-9c61dc015e2a to="/crm/customers"><ContactRound data-v-ui-9c61dc015e2a :size="20" /><span data-v-ui-9c61dc015e2a><b data-v-ui-9c61dc015e2a>Клиенты 360°</b><small data-v-ui-9c61dc015e2a>История и заказы</small></span><ArrowRight data-v-ui-9c61dc015e2a :size="15" /></NuxtLink>
              <NuxtLink data-v-ui-9c61dc015e2a to="/crm/tasks"><ListTodo data-v-ui-9c61dc015e2a :size="20" /><span data-v-ui-9c61dc015e2a><b data-v-ui-9c61dc015e2a>Задачи</b><small data-v-ui-9c61dc015e2a>Канбан, Гант, календарь</small></span><ArrowRight data-v-ui-9c61dc015e2a :size="15" /></NuxtLink>
            </div>
          </article>
        </section>
      </template>
    </template>
  </main>
</template>
