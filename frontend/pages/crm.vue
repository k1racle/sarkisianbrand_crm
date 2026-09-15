<script setup lang="ts">
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, ClipboardList, MessageSquareText, Plus, RefreshCw, Target, Users } from '@lucide/vue';

const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const { openChat } = usePlatformChat();
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
  <main class="crm-main">
    <WorkspaceLoading v-if="loading" label="Собираем показатели CRM" />
    <template v-else>
      <header class="page-head">
        <div>
          <p>CRM / ЦЕНТР ПРОДАЖ</p>
          <h1>Обзор команды</h1>
          <span>Сделки, клиенты, задачи и коммуникации в одном рабочем пространстве</span>
        </div>
        <div class="head-actions">
          <button class="light" @click="load"><RefreshCw :size="16" />Обновить</button>
          <NuxtLink to="/crm-tasks?create=1" class="light"><ClipboardList :size="16" />Новая задача</NuxtLink>
          <NuxtLink to="/crm-pipeline?create=1"><Plus :size="16" />Новая сделка</NuxtLink>
        </div>
      </header>

      <section v-if="error" class="error-state"><AlertTriangle :size="18" />{{ error }} <button @click="load">Повторить</button></section>
      <template v-else-if="dashboard">
        <section class="kpis">
          <article class="accent">
            <i><Target :size="18" /></i><span>Прогноз продаж</span>
            <strong>{{ money(dashboard.forecast) }}</strong><small>взвешенная сумма открытых сделок</small>
          </article>
          <article>
            <i><CircleDollarSign :size="18" /></i><span>Продано за месяц</span>
            <strong>{{ money(dashboard.wonMonth?.amount) }}</strong><small>{{ dashboard.wonMonth?.count || 0 }} успешных сделок</small>
          </article>
          <article>
            <i><Users :size="18" /></i><span>Открытые сделки</span>
            <strong>{{ dashboard.openLeads }}</strong><small>{{ dashboard.customers }} клиентов в единой базе</small>
          </article>
          <article :class="{ danger: dashboard.overdueTasks }">
            <i><CalendarClock :size="18" /></i><span>Контроль задач</span>
            <strong>{{ dashboard.overdueTasks }}</strong><small>просрочено · {{ dashboard.dueToday }} на сегодня</small>
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="panel funnel-panel">
            <header>
              <div><p>ВОРОНКА</p><h2>Продажи по этапам</h2></div>
              <NuxtLink to="/crm-pipeline">Открыть воронку <ArrowRight :size="14" /></NuxtLink>
            </header>
            <div class="funnel">
              <button v-for="stage in dashboard.funnel" :key="stage.id" @click="navigateTo('/crm-pipeline')">
                <span class="stage-name"><i :style="{ background: stage.color }"></i>{{ stage.name }}</span>
                <span class="stage-value"><b>{{ stage.count }}</b><small>{{ money(stage.amount) }}</small></span>
                <span class="bar"><i :style="{ width: `${Math.max(stage.count ? 8 : 0, stage.count / funnelMax * 100)}%`, background: stage.color }"></i></span>
              </button>
            </div>
          </article>

          <article class="panel tasks-panel">
            <header>
              <div><p>ФОКУС</p><h2>Ближайшие задачи</h2></div>
              <NuxtLink to="/crm-tasks">Все задачи <ArrowRight :size="14" /></NuxtLink>
            </header>
            <div v-if="urgentTasks.length" class="task-list">
              <button v-for="task in urgentTasks" :key="task.id" @click="navigateTo('/crm-tasks')">
                <span class="task-check" :class="task.status.toLowerCase()"><CheckCircle2 :size="15" /></span>
                <span class="task-copy"><b>{{ task.title }}</b><small>{{ person(task.assignedTo) }}</small></span>
                <span class="task-date" :class="{ late: task.status === 'OVERDUE' }">
                  <b>{{ taskStatus[task.status] || task.status }}</b>
                  <small>{{ task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Без срока' }}</small>
                </span>
              </button>
            </div>
            <div v-else class="empty">Нет активных задач — отличный момент запланировать следующий шаг.</div>
          </article>

          <article class="panel activity-panel">
            <header>
              <div><p>ЛЕНТА</p><h2>Последние контакты</h2></div>
            </header>
            <div v-if="dashboard.recentInteractions?.length" class="activity-list">
              <button v-for="item in dashboard.recentInteractions" :key="item.id" @click="navigateTo('/crm-pipeline')">
                <i><MessageSquareText :size="14" /></i>
                <span><b>{{ item.lead?.title || item.lead?.contactName || 'Контакт с клиентом' }}</b><small>{{ item.content }}</small></span>
                <time>{{ person(item.user) }}<small>{{ new Date(item.createdAt).toLocaleString('ru-RU') }}</small></time>
              </button>
            </div>
            <div v-else class="empty">История взаимодействий появится после первого звонка, письма или заметки в сделке.</div>
          </article>

          <article class="panel quick-panel">
            <header><div><p>БЫСТРЫЙ ДОСТУП</p><h2>Рабочие разделы</h2></div></header>
            <div class="quick-grid">
              <NuxtLink to="/crm-pipeline"><Target :size="20" /><span><b>Воронка продаж</b><small>Сделки и прогноз</small></span><ArrowRight :size="15" /></NuxtLink>
              <NuxtLink to="/crm-customers"><Users :size="20" /><span><b>Клиенты 360°</b><small>История и заказы</small></span><ArrowRight :size="15" /></NuxtLink>
              <NuxtLink to="/crm-tasks"><ClipboardList :size="20" /><span><b>Задачи</b><small>Канбан, Гант, календарь</small></span><ArrowRight :size="15" /></NuxtLink>
              <button @click="openChat"><MessageSquareText :size="20" /><span><b>Чат платформы</b><small>Обсуждения всех отделов</small></span><ArrowRight :size="15" /></button>
            </div>
          </article>
        </section>
      </template>
    </template>
  </main>
</template>

<style scoped>
.crm-main{min-height:100vh;background:var(--sb-bg);color:var(--sb-ink);font-family:var(--sb-font)}.page-head{min-height:120px;background:#fff;border-bottom:1px solid var(--sb-line);padding:24px 4%;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:20px}.page-head p,.panel header p{margin:0 0 7px;color:var(--sb-coral);font-size:9px;letter-spacing:.16em}.page-head h1{font-size:28px;margin:0 0 6px}.page-head>div>span{font-size:10px;color:var(--sb-muted)}.head-actions{display:flex;gap:8px}.head-actions a,.head-actions button{height:40px;border:0;background:#1d1e22;color:#fff;padding:0 14px;display:flex;align-items:center;gap:7px;text-decoration:none;font:10px var(--sb-font);cursor:pointer;box-sizing:border-box}.head-actions .light{background:#fff;color:var(--sb-ink);border:1px solid var(--sb-line)}.error-state{margin:24px 4%;padding:18px;background:#fff0ed;color:#9d4136;display:flex;align-items:center;gap:10px;font-size:10px}.error-state button{margin-left:auto;border:0;background:#9d4136;color:#fff;padding:8px 12px}.kpis{margin:24px 4% 0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpis article{min-height:150px;background:#fff;border:1px solid var(--sb-line);padding:20px;box-sizing:border-box;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto;column-gap:10px}.kpis article>i{width:32px;height:32px;background:#f0f1f3;display:grid;place-items:center;grid-row:1;color:#656971}.kpis article>span{align-self:center;color:#7b7e85;font-size:9px}.kpis strong{grid-column:1/-1;font-size:27px;margin-top:15px}.kpis small{grid-column:1/-1;font-size:8px;color:#8c8f95;margin-top:5px}.kpis .accent{background:#202124;color:#fff;border-color:#202124}.kpis .accent>i{background:#ffffff17;color:var(--sb-coral)}.kpis .accent>span,.kpis .accent small{color:#b9bbc0}.kpis .danger>i,.kpis .danger strong{color:#b74d40}.dashboard-grid{margin:14px 4% 55px;display:grid;grid-template-columns:1.25fr .95fr;gap:12px}.panel{background:#fff;border:1px solid var(--sb-line);min-width:0}.panel>header{min-height:72px;padding:16px 20px;border-bottom:1px solid #eceef0;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box}.panel h2{font-size:16px;margin:0}.panel header>a{display:flex;align-items:center;gap:6px;color:#555960;text-decoration:none;font-size:8px}.funnel{padding:10px 20px 18px}.funnel>button{border:0;background:none;width:100%;display:grid;grid-template-columns:1.3fr .7fr;gap:8px;padding:11px 0;text-align:left;cursor:pointer}.stage-name{display:flex;align-items:center;gap:9px;font-size:9px}.stage-name>i{width:5px;height:24px}.stage-value{display:flex;align-items:center;justify-content:flex-end;gap:11px}.stage-value b{font-size:13px}.stage-value small{color:#888;font-size:8px}.bar{height:4px;background:#f0f1f2;grid-column:1/-1}.bar i{display:block;height:100%;transition:width .25s}.task-list>button,.activity-list>button{width:100%;border:0;border-bottom:1px solid #eceef0;background:#fff;display:grid;align-items:center;text-align:left;cursor:pointer}.task-list>button{grid-template-columns:31px 1fr auto;gap:10px;padding:13px 18px}.task-check{width:29px;height:29px;background:#eef1f4;color:#6b7078;display:grid;place-items:center}.task-check.overdue{background:#fff0ed;color:#b24a3d}.task-copy{display:grid;gap:5px}.task-copy b{font-size:9px}.task-copy small,.task-date small{font-size:7px;color:#898c92}.task-date{display:grid;gap:5px;text-align:right}.task-date b{font-size:7px;font-weight:500;color:#70737a}.task-date.late b,.task-date.late small{color:#b24a3d}.activity-panel{min-height:280px}.activity-list>button{grid-template-columns:30px 1fr 150px;gap:10px;padding:13px 18px}.activity-list>button>i{width:29px;height:29px;background:#f0f1f3;display:grid;place-items:center;color:#6c7077}.activity-list>button>span,.activity-list time{display:grid;gap:4px}.activity-list b{font-size:9px}.activity-list span small{font-size:8px;color:#74777e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-list time{text-align:right;font-size:7px;color:#666}.activity-list time small{color:#92959a}.empty{padding:35px 20px;color:#8b8e94;font-size:9px;line-height:1.6}.quick-grid{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-grid>a{min-height:76px;border:1px solid #e6e8ea;padding:14px;box-sizing:border-box;color:#333;text-decoration:none;display:grid;grid-template-columns:25px 1fr 15px;gap:9px;align-items:center}.quick-grid>a:hover{border-color:#bfc2c6;background:#fafafa}.quick-grid>a>svg:first-child{color:var(--sb-coral)}.quick-grid span{display:grid;gap:5px}.quick-grid b{font-size:9px}.quick-grid small{font-size:7px;color:#8b8e94}@media(max-width:1050px){.kpis{grid-template-columns:1fr 1fr}.dashboard-grid{grid-template-columns:1fr}}@media(max-width:700px){.page-head{align-items:flex-start;flex-direction:column}.head-actions{flex-wrap:wrap}.kpis{grid-template-columns:1fr 1fr;margin:14px}.dashboard-grid{margin:12px 14px 40px}.quick-grid{grid-template-columns:1fr}.activity-list>button{grid-template-columns:30px 1fr}.activity-list time{display:none}}
.quick-grid>button{min-height:76px;border:1px solid #e6e8ea;padding:14px;box-sizing:border-box;color:#333;background:#fff;display:grid;grid-template-columns:25px 1fr 15px;gap:9px;align-items:center;text-align:left;font:inherit}.quick-grid>button:hover{border-color:#bfc2c6;background:#fafafa}.quick-grid>button>svg:first-child{color:var(--sb-coral)}
</style>
