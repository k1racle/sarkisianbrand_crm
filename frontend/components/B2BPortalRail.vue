<script setup lang="ts">
import { BarChart3, CalendarDays, CircleHelp, ClipboardList, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, Scissors, Settings, ShoppingBag, Users, X } from '@lucide/vue';
const route = useRoute(); const config = useRuntimeConfig(); const { user } = useB2BSession(); const { openProfile } = useUserProfilePanel();
const allItems = [
  { id:'dashboard',label:'Обзор бизнеса',icon:BarChart3 }, { id:'calendar',label:'Записи',icon:CalendarDays },
  { id:'clients',label:'Мои клиенты',icon:Users }, { id:'services',label:'Услуги и цены',icon:Scissors },
  { id:'catalog',label:'Закупить товары',icon:PackageSearch }, { id:'orders',label:'Мои заказы',icon:ShoppingBag },
  { id:'team',label:'Команда',icon:ClipboardList }, { id:'support',label:'Поддержка',icon:CircleHelp },
  { id:'purchases',label:'Обзор закупок',icon:BarChart3 }, { id:'online-booking',label:'Онлайн-запись',icon:Settings },
  { id:'settings',label:'Настройки',icon:Settings },
];
const { area, section, path: sectionPath } = useBusinessWorkspace();
const { railCollapsed, toggleRail } = useWorkspaceLayout();
const branding=useState<any>('salon-branding',()=>null);
const logoSrc=computed(()=>branding.value?.logoUrl?new URL(branding.value.logoUrl,config.public.apiBase).toString():'/sarkisian-logo.png');
watch(()=>user.value?.id,()=>{branding.value=null;});
const items = computed(() => (area.value === 'salon' ? ['dashboard','calendar','clients','services','online-booking','team','support','settings'] : ['purchases','catalog','orders','team','support','settings']).map(id => ({...allItems.find(item => item.id === id)!,...(id==='settings'?{label:area.value==='salon'?'Настройки салона':'Настройки компании'}:{})})));
const mobileOpen = ref(false);
const rail = ref<HTMLElement | null>(null);
const mobileTrigger = ref<HTMLButtonElement | null>(null);
const mobileItems = computed(() => (area.value === 'salon' ? ['dashboard','calendar','clients','services'] : ['purchases','catalog','orders','support']).map(id => allItems.find(item => item.id === id)!));
const mobileLabels: Record<string, string> = { dashboard: 'Обзор', purchases: 'Обзор', calendar: 'Запись', clients: 'Клиенты', services: 'Услуги', catalog: 'Каталог', orders: 'Заказы', support: 'Помощь' };
useMobileNavigationSheet(mobileOpen);
function closeMobile() { mobileOpen.value = false; nextTick(() => mobileTrigger.value?.focus()); }
function closeActiveLink(event: MouseEvent) {
  if (mobileOpen.value && (event.target as Element).closest('a[aria-current="page"]')) closeMobile();
}
function mobileKeys(event: KeyboardEvent) {
  if (!mobileOpen.value) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMobile(); }
  if (event.key !== 'Tab') return;
  const controls = [...(rail.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || [])].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
function mobileProfile() { closeMobile(); openProfile(); }
watch(() => route.fullPath, () => { mobileOpen.value = false; });
watch(mobileOpen, async value => { if (value) { await nextTick(); rail.value?.querySelector<HTMLElement>('.ui-mobile-close')?.focus(); } });
onMounted(()=>{if(user.value?.forcePasswordChange)openProfile()});
watch(()=>user.value?.forcePasswordChange,(required)=>{if(required)openProfile()});
</script>
<template>
  <nav data-v-ui-4da4dbf479f1 class="ui-mobile-dock b2b-mobile-dock" aria-label="Быстрая навигация кабинета партнёра">
    <NuxtLink data-v-ui-4da4dbf479f1 v-for="item in mobileItems" :key="item.id" :to="sectionPath(item.id)" :class="{ active: !mobileOpen && section === item.id }" :aria-current="section === item.id ? 'page' : undefined">
      <component data-v-ui-4da4dbf479f1 :is="item.icon" :size="22" /><span data-v-ui-4da4dbf479f1>{{ mobileLabels[item.id] }}</span>
    </NuxtLink>
    <button data-v-ui-4da4dbf479f1 ref="mobileTrigger" type="button" class="ui-mobile-menu" aria-label="Открыть меню кабинета" :aria-expanded="mobileOpen" aria-controls="b2b-navigation-rail" @click="mobileOpen = true"><Menu data-v-ui-4da4dbf479f1 :size="22" /><span data-v-ui-4da4dbf479f1>Ещё</span></button>
  </nav>
  <div data-v-ui-4da4dbf479f1 v-if="mobileOpen" class="ui-mobile-backdrop" @click="closeMobile" />
  <aside data-v-ui-4da4dbf479f1 id="b2b-navigation-rail" ref="rail" class="b2b-rail" :class="{ 'b2b-rail--open': mobileOpen, 'b2b-rail--collapsed': railCollapsed }" :role="mobileOpen ? 'dialog' : undefined" :aria-modal="mobileOpen ? true : undefined" aria-label="Разделы кабинета партнёра" @keydown="mobileKeys">
    <div data-v-ui-4da4dbf479f1 class="b2b-rail-head">
      <NuxtLink data-v-ui-4da4dbf479f1 to="/b2b" class="brand"><img data-v-ui-4da4dbf479f1 :src="logoSrc" :class="{'salon-tenant-logo':branding?.logoUrl}" :alt="branding?.displayName||'SARKISIAN'" /></NuxtLink>
      <button type="button" class="b2b-rail-toggle" :aria-label="railCollapsed?'Развернуть боковую панель':'Свернуть боковую панель'" :title="railCollapsed?'Развернуть боковую панель':'Свернуть боковую панель'" :aria-expanded="!railCollapsed" aria-controls="b2b-navigation-links" @click="toggleRail"><component :is="railCollapsed?PanelLeftOpen:PanelLeftClose" :size="20"/></button>
      <button data-v-ui-4da4dbf479f1 type="button" class="ui-mobile-close" aria-label="Закрыть меню кабинета" @click="closeMobile"><X data-v-ui-4da4dbf479f1 :size="22" /></button>
    </div>
    <nav data-v-ui-4da4dbf479f1 id="b2b-navigation-links" aria-label="Основная навигация партнёра" @click="closeActiveLink">
      <NuxtLink data-v-ui-4da4dbf479f1 v-for="item in items" :key="item.id" :to="sectionPath(item.id)" :aria-label="item.id==='dashboard'?'Обзор салона':item.label" :title="item.id==='dashboard'?'Обзор салона':item.label" :class="{ active: section === item.id }" :aria-current="section === item.id ? 'page' : undefined"><component data-v-ui-4da4dbf479f1 :is="item.icon" :size="18" /><span data-v-ui-4da4dbf479f1>{{ item.id === 'dashboard' ? 'Обзор салона' : item.label }}</span></NuxtLink>
    </nav>
    <div data-v-ui-4da4dbf479f1 class="bottom">
      <button data-v-ui-4da4dbf479f1 type="button" class="person" title="Открыть профиль" @click="mobileProfile">
        <i data-v-ui-4da4dbf479f1><img data-v-ui-4da4dbf479f1 v-if="user?.avatarUrl" :src="new URL(user.avatarUrl, config.public.apiBase).toString()" alt="" /><template v-else>{{ (user?.firstName || user?.email || 'B').slice(0, 1).toUpperCase() }}</template></i>
        <span data-v-ui-4da4dbf479f1><b data-v-ui-4da4dbf479f1>{{ [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Партнёр' }}</b><small data-v-ui-4da4dbf479f1>{{ user?.email }}</small></span>
      </button>
    </div>
  </aside>
</template>
