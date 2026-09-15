<script setup lang="ts">
import { Activity, BarChart3, Boxes, Building2, ChevronDown, ClipboardList, ExternalLink, Gauge, Headphones, KeyRound, LayoutGrid, LogOut, ScrollText, Settings, ShieldCheck, ShoppingBag, Store, Users, Warehouse, Wifi, X } from '@lucide/vue';
const route = useRoute();
const { user, logout } = useWorkspaceSession();
const switcherOpen = ref(false);

const workspaces = [
  { id: 'admin', label: 'Управление сайтом', short: 'Сайт', to: '/admin-workspace?section=dashboard', icon: Store, roles: ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'WAREHOUSE'] },
  { id: 'crm', label: 'CRM и клиенты', short: 'CRM', to: '/crm', icon: Users, roles: ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'] },
  { id: 'marketplaces', label: 'Маркетплейсы', short: 'Каналы', to: '/crm-marketplaces?section=dashboard', icon: ShoppingBag, roles: ['ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'WAREHOUSE'] },
  { id: 'leadership', label: 'Кабинет руководителя', short: 'Результаты', to: '/leadership', icon: Gauge, roles: ['ADMIN', 'EXECUTIVE', 'SUPERVISOR'] },
  { id: 'helpdesk', label: 'IT Helpdesk', short: 'Поддержка', to: '/helpdesk', icon: Headphones, roles: ['ADMIN', 'IT_SUPPORT', 'SUPERVISOR'] },
  { id: 'system', label: 'Настройки экосистемы', short: 'Система', to: '/system-settings', icon: ShieldCheck, roles: ['ADMIN'] },
];
const visibleWorkspaces = computed(() => workspaces.filter(item => !user.value || item.roles.includes(user.value.role)));
const current = computed(() => route.path.startsWith('/admin') ? workspaces[0] : route.path.startsWith('/crm-marketplaces') ? workspaces[2] : route.path.startsWith('/crm') ? workspaces[1] : route.path.startsWith('/leadership') ? workspaces[3] : route.path.startsWith('/helpdesk') ? workspaces[4] : route.path.startsWith('/system-settings') ? workspaces[5] : null);
const adminItems = [
  { label: 'Обзор', to: '/admin-workspace?section=dashboard', icon: BarChart3 },
  { label: 'Заказы', to: '/admin-workspace?section=orders', icon: ClipboardList },
  { label: 'Каталог', to: '/admin-workspace?section=products', icon: Boxes },
  { label: 'Клиенты', to: '/admin-workspace?section=customers', icon: Users },
  { label: 'Склад и 1С', to: '/admin-workspace?section=warehouse', icon: Warehouse },
  { label: 'Настройки', to: '/admin-workspace?section=settings', icon: Settings },
];
const crmItems = [
  { label: 'Обзор', to: '/crm', icon: BarChart3 },
  { label: 'Клиенты 360°', to: '/crm-customers', icon: Users },
  { label: 'Организации B2B', to: '/crm-organizations', icon: Building2 },
  { label: 'Задачи', to: '/crm-tasks', icon: ClipboardList },
];
const marketplaceItems = [
  { label: 'Обзор', to: '/crm-marketplaces?section=dashboard', icon: BarChart3 },
  { label: 'Заказы каналов', to: '/crm-marketplaces?section=orders', icon: ClipboardList },
  { label: 'Интеграции', to: '/crm-marketplaces?section=integrations', icon: Wifi },
  { label: 'Настройки', to: '/crm-marketplaces?section=settings', icon: Settings },
];
const leadershipItems = [
  { label: 'Результаты', to: '/leadership', icon: Gauge },
  { label: 'Продажи', to: '/leadership?section=sales', icon: BarChart3 },
  { label: 'Клиенты', to: '/leadership?section=customers', icon: Users },
];
const helpdeskItems = [
  { label: 'Обзор', to: '/helpdesk', icon: BarChart3 },
  { label: 'Все заявки', to: '/helpdesk?section=tickets', icon: ClipboardList },
  { label: 'Очереди', to: '/helpdesk?section=queues', icon: LayoutGrid },
  { label: 'База знаний', to: '/helpdesk?section=knowledge', icon: Building2 },
];
const systemItems = [
  { label: 'Обзор', to: '/system-settings', icon: ShieldCheck },
  { label: 'Сотрудники', to: '/system-settings?section=staff', icon: Users },
  { label: 'Роли и права', to: '/system-settings?section=access', icon: KeyRound },
  { label: 'Журнал действий', to: '/system-settings?section=audit', icon: ScrollText },
  { label: 'Технические журналы', to: '/system-settings?section=logs', icon: Activity },
];
const items = computed(() => current.value?.id === 'admin' ? adminItems : current.value?.id === 'crm' ? crmItems : current.value?.id === 'marketplaces' ? marketplaceItems : current.value?.id === 'leadership' ? leadershipItems : current.value?.id === 'helpdesk' ? helpdeskItems : current.value?.id === 'system' ? systemItems : []);
function isActive(to: string) {
  const [path, query] = to.split('?');
  if (route.path !== path) return false;
  const section = query ? new URLSearchParams(query).get('section') : null;
  return section ? route.query.section === section : !route.query.section;
}
function signOut() { logout(); navigateTo('/workspace-login'); }
</script>

<template>
  <aside class="console-rail">
    <NuxtLink to="/workspace" class="console-rail-brand"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
    <button class="workspace-switch" @click="switcherOpen = !switcherOpen"><component :is="current?.icon || LayoutGrid" :size="17" /><span><small>Рабочее пространство</small><strong>{{ current?.short || 'Все разделы' }}</strong></span><ChevronDown :size="15" /></button>
    <div v-if="switcherOpen" class="workspace-menu"><header><span>Разделы платформы</span><button @click="switcherOpen=false"><X :size="16" /></button></header><NuxtLink v-for="space in visibleWorkspaces" :key="space.id" :to="space.to" :class="{ selected: current?.id === space.id }" @click="switcherOpen=false"><component :is="space.icon" :size="17" /><span>{{ space.label }}</span></NuxtLink></div>
    <nav><NuxtLink v-for="item in items" :key="item.to" :to="item.to" :class="{ active: isActive(item.to) }"><component :is="item.icon" :size="18" /><span>{{ item.label }}</span></NuxtLink></nav>
    <div class="rail-bottom"><NuxtLink to="/" target="_blank"><ExternalLink :size="17" /><span>Открыть магазин</span></NuxtLink><button @click="signOut"><LogOut :size="17" /><span>Выйти</span></button><div class="rail-user"><i>{{ (user?.firstName || user?.email || 'S').slice(0,1).toUpperCase() }}</i><span><strong>{{ [user?.firstName,user?.lastName].filter(Boolean).join(' ') || 'Сотрудник' }}</strong><small>{{ user?.email }}</small></span></div></div>
  </aside>
</template>

<style scoped>
.console-rail{position:fixed;z-index:400;left:0;top:0;bottom:0;width:250px;background:#191919;padding:18px 12px;box-sizing:border-box;color:#fff;display:flex;flex-direction:column;font-family:var(--sb-font)}.console-rail-brand{display:block;padding:8px 10px 20px}.console-rail-brand img{width:145px;filter:brightness(0) invert(1)}.workspace-switch{height:58px;border:1px solid #3a3a3d;background:#252528;color:#fff;border-radius:8px;padding:0 11px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer}.workspace-switch>svg:first-child{color:var(--sb-coral)}.workspace-switch>svg:last-child{margin-left:auto;color:#8f9197}.workspace-switch span{display:grid;gap:3px;min-width:0}.workspace-switch small{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#8f9197}.workspace-switch strong{font-size:12px;font-weight:500;white-space:nowrap}.workspace-menu{position:absolute;left:14px;top:115px;width:278px;padding:9px;background:#fff;color:#202124;border:1px solid var(--sb-line);box-shadow:0 18px 50px #0003}.workspace-menu header{height:36px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;color:#8a8d94;font-size:10px;text-transform:uppercase;letter-spacing:.1em}.workspace-menu header button{border:0;background:none}.workspace-menu a{height:42px;padding:0 10px;display:flex;align-items:center;gap:10px;text-decoration:none;color:#34363a;font-size:12px}.workspace-menu a:hover,.workspace-menu a.selected{background:#f2f3f5}.workspace-menu a.selected svg{color:var(--sb-coral)}nav{display:grid;gap:4px;margin-top:18px}.console-rail nav a,.rail-bottom>a,.rail-bottom>button{height:42px;padding:0 12px;box-sizing:border-box;display:flex;align-items:center;gap:12px;border:0;border-radius:7px;color:#aeb0b5;background:transparent;text-decoration:none;font:12px var(--sb-font);cursor:pointer}.console-rail nav a:hover,.console-rail nav a.active,.rail-bottom>a:hover,.rail-bottom>button:hover{background:#2b2b2f;color:#fff}.console-rail nav a.active svg{color:var(--sb-coral)}.rail-bottom{margin-top:auto;display:grid;gap:3px}.rail-user{margin-top:9px;padding:13px 8px 3px;border-top:1px solid #303033;display:flex;gap:9px;align-items:center}.rail-user i{width:30px;height:30px;border-radius:50%;background:var(--sb-coral);display:grid;place-items:center;font-style:normal;font-size:11px}.rail-user span{display:grid;gap:3px;min-width:0}.rail-user strong{font-size:10px;font-weight:500}.rail-user small{font-size:8px;color:#898c92;overflow:hidden;text-overflow:ellipsis}.rail-bottom>button{width:100%}@media(max-width:800px){.console-rail{width:72px;padding:14px 9px}.console-rail-brand{height:32px;padding:4px}.console-rail-brand img{display:none}.workspace-switch{width:52px;justify-content:center;padding:0}.workspace-switch span,.workspace-switch>svg:last-child,.console-rail nav a span,.rail-bottom>a span,.rail-bottom>button span,.rail-user span{display:none}.console-rail nav a,.rail-bottom>a,.rail-bottom>button{justify-content:center}.workspace-menu{left:64px;top:66px}.rail-user{justify-content:center;padding:12px 0 0}}
</style>
