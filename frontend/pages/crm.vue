<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
const config = useRuntimeConfig();
const { token, logout: clearSession } = useWorkspaceSession();
const { openContextMenu, copyText } = useContextMenu();
const dashboard = ref<any>(null); const leads = ref<any[]>([]); const tasks = ref<any[]>([]); const customers = ref<any[]>([]);
const leadLabels:Record<string,string>={NEW:'Новый',CONTACTED:'Связались',QUALIFIED:'Квалифицирован',NEGOTIATION:'Переговоры',WON:'Успешно',LOST:'Закрыт'};const taskLabels:Record<string,string>={TODO:'К выполнению',IN_PROGRESS:'В работе',DONE:'Выполнена',OVERDUE:'Просрочена'};
async function load() { const headers = { Authorization: `Bearer ${token.value}` }; [dashboard.value, leads.value, tasks.value, customers.value] = await Promise.all([$fetch('/crm/dashboard', { baseURL: config.public.apiBase, headers }), $fetch<any[]>('/crm/leads', { baseURL: config.public.apiBase, headers }), $fetch<any[]>('/crm/tasks', { baseURL: config.public.apiBase, headers }), $fetch<any[]>('/crm/customers', { baseURL: config.public.apiBase, headers })]); }
function logout() { clearSession(); navigateTo('/workspace-login'); }
function leadMenu(event:MouseEvent,lead:any){openContextMenu(event,lead.contactName||lead.companyName||'Лид',[{label:'Открыть клиентов 360°',icon:'open',action:()=>navigateTo('/crm-customers')},...(lead.contactEmail?[{label:'Копировать email',icon:'copy' as const,action:()=>copyText(lead.contactEmail,'Email скопирован')}]:[])],leadLabels[lead.status]||lead.status)}
function taskMenu(event:MouseEvent,task:any){openContextMenu(event,task.title,[{label:'Открыть задачи',icon:'open',action:()=>navigateTo('/crm-tasks')},{label:'Копировать название',icon:'copy',action:()=>copyText(task.title,'Название задачи скопировано')}],taskLabels[task.status]||task.status)}
onMounted(load);
</script>
<template>
  <main class="crm-main">
    <WorkspaceLoading v-if="!dashboard" label="Загружаем CRM" />
    <template v-else>
      <header class="crm-header"><div><small>CRM / КОМАНДА</small><h1>Операционный центр</h1></div><div class="actions"><button @click="load"><RefreshCw :size="16" /> Обновить</button><button @click="logout">Выйти</button></div></header>
      <section class="crm-kpis"><article><span>Клиенты</span><b>{{ dashboard.customers }}</b></article><article><span>Открытые лиды</span><b>{{ dashboard.openLeads }}</b></article><article><span>Активные задачи</span><b>{{ dashboard.activeTasks }}</b></article><article><span>Всего лидов</span><b>{{ leads.length }}</b></article></section>
      <section class="crm-grid"><article><h2>Лиды</h2><p v-if="!leads.length" class="muted">Пока нет лидов</p><div v-for="lead in leads.slice(0, 10)" :key="lead.id" class="crm-row" @contextmenu.prevent="leadMenu($event,lead)"><strong>{{ lead.contactName || lead.companyName || 'Без имени' }}</strong><span>{{ leadLabels[lead.status]||lead.status }}</span></div></article><article><h2>Задачи команды</h2><p v-if="!tasks.length" class="muted">Пока нет задач</p><div v-for="task in tasks.slice(0, 10)" :key="task.id" class="crm-row" @contextmenu.prevent="taskMenu($event,task)"><strong>{{ task.title }}</strong><span>{{ taskLabels[task.status]||task.status }}</span></div></article></section>
    </template>
  </main>
</template>
<style scoped>
.crm-main{min-height:100vh;background:#f4f5f7;color:#202124}.crm-login{min-height:100vh;display:grid;place-items:center}.crm-login form{width:min(430px,90vw);background:#fff;padding:40px;display:grid;gap:14px}.kicker,.crm-header small{font-size:10px;letter-spacing:.14em;color:#f8604a}.crm-login h1{font-size:32px;margin:0}.crm-login p:not(.kicker){font-size:13px;color:#777;line-height:1.6}.crm-login input{height:44px;border:1px solid #ddd;padding:0 12px}.crm-login span{color:#c65a4b;font-size:12px}.crm-login button,.crm-header button{border:0;background:#202124;color:#fff;padding:14px}.crm-header{min-height:100px;background:#fff;padding:24px 5%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e4e8}.crm-header h1{font-size:27px;margin:8px 0 0}.actions{display:flex;gap:10px}.actions button:first-child{display:flex;align-items:center;gap:8px;background:#fff;color:#202124;border:1px solid #ddd}.crm-kpis,.crm-grid{max-width:1200px;margin:28px auto;padding:0 5%;display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.crm-kpis article,.crm-grid article{background:#fff;padding:23px;border:1px solid #e4e6e8}.crm-kpis article{display:grid;gap:12px}.crm-kpis span,.muted{font-size:11px;color:#858991}.crm-kpis b{font-size:28px;font-weight:500}.crm-grid{grid-template-columns:1fr 1fr}.crm-grid h2{font-size:18px;margin:0 0 8px}.crm-row{display:grid;grid-template-columns:1.5fr 1fr;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid #ececef;font-size:12px}.crm-row span{color:#74777f;font-size:11px}@media(max-width:800px){.crm-kpis{grid-template-columns:repeat(2,1fr)}.crm-grid{grid-template-columns:1fr}.crm-header{align-items:flex-start;gap:15px;flex-direction:column}}
</style>
