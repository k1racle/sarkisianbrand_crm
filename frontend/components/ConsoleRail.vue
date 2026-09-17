<script setup lang="ts">
import { Award, BarChart3, Boxes, Cable, ChevronDown, Headphones, Images, LayoutDashboard, Menu, Palette, PanelLeftClose, PanelLeftOpen, Settings, Search, ShoppingBag, Star, Users, X } from '@lucide/vue';
import { WORKSPACE_AREAS } from '~/composables/useWorkspaceNavigation';
const route = useRoute();
const router = useRouter();
const { user, token } = useWorkspaceSession();
const config = useRuntimeConfig();
const { openProfile } = useUserProfilePanel();
const { refreshUnread, connectRealtime } = usePlatformChat();
const { groups, active, favorites, paletteOpen } = useWorkspaceNavigation();
const { railCollapsed, setRailCollapsed, toggleRail } = useWorkspaceLayout();
const areaSelect = ref<HTMLSelectElement | null>(null);
const access = useWorkspaceAccess();
const icons: Record<string, any> = { Award, BarChart3, Boxes, Cable, Headphones, Images, LayoutDashboard, Palette, Settings, ShoppingBag, Users };
const mobileOpen = ref(false);
const expanded = ref<string[]>(['sales', 'catalog', 'site', 'marketing', 'crm', 'support', 'channels', 'reports', 'media', 'settings']);
const areas = computed(() => WORKSPACE_AREAS.filter(area => groups.value.some(group => (area.groupIds as readonly string[]).includes(group.id))));
const areaSelection = useState('workspace-studio-area', () => ({ owner: '', id: '' }));
const selectedArea = computed(() => areas.value.find(area => area.id === areaSelection.value.id && areaSelection.value.owner === user.value?.id) || areas.value[0]);
const visibleGroups = computed(() => groups.value.filter(group => (selectedArea.value?.groupIds as readonly string[] | undefined)?.includes(group.id)));
const shopOverview = computed(() => groups.value.find(group => group.id === 'dashboard')?.items.find(item => item.id === 'web-dashboard'));
watch(() => `${user.value?.id || ''}:${active.value?.id || ''}`, () => {
  const area = active.value?.id === 'web-dashboard' ? areas.value.find(item => item.id === 'site') : areas.value.find(item => (item.groupIds as readonly string[]).includes(active.value?.groupId || ''));
  if (areaSelection.value.owner !== user.value?.id || area) areaSelection.value = { owner: user.value?.id || '', id: area?.id || areas.value[0]?.id || '' };
}, { immediate: true });
async function switchArea(event: Event) {
  const area = areas.value.find(item => item.id === (event.target as HTMLSelectElement).value);
  if (!area) return;
  const destination = area.id === 'site' && shopOverview.value ? shopOverview.value : groups.value.find(group => (area.groupIds as readonly string[]).includes(group.id))?.items[0];
  if (!destination) return;
  const failure = await router.push(destination.to);
  if (!failure) areaSelection.value = { owner: user.value?.id || '', id: area.id };
  else (event.target as HTMLSelectElement).value = selectedArea.value?.id || '';
}
const rail = ref<HTMLElement | null>(null);
const mobileTrigger = ref<HTMLButtonElement | null>(null);
const avatar = computed(() => {
  if (!user.value?.avatarUrl) return '';
  try { const url = new URL(user.value.avatarUrl, config.public.apiBase); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
});
let chatPoll: ReturnType<typeof setInterval> | undefined;
function expand(id: string) {
  if (railCollapsed.value && window.matchMedia('(min-width: 801px)').matches) {
    setRailCollapsed(false);
    if (!expanded.value.includes(id)) expanded.value.push(id);
    return;
  }
  expanded.value = expanded.value.includes(id) ? expanded.value.filter(value => value !== id) : [...expanded.value, id];
}
async function revealArea() { setRailCollapsed(false); await nextTick(); areaSelect.value?.focus(); }
async function revealFavorites() { setRailCollapsed(false); await nextTick(); rail.value?.querySelector<HTMLElement>('.wn-favorites-group a')?.focus(); }
function closeMobile() { mobileOpen.value = false; nextTick(() => mobileTrigger.value?.focus()); }
function mobileKeys(event: KeyboardEvent) {
  if (!mobileOpen.value) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMobile(); }
  if (event.key !== 'Tab') return;
  const controls = [...(rail.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled)') || [])].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
watch(() => active.value?.groupId, id => { if (id && !expanded.value.includes(id)) expanded.value.push(id); }, { immediate: true });
watch(() => route.fullPath, () => { mobileOpen.value = false; });
watch(() => `${user.value?.id || ''}:${token.value}`, () => { access.refresh(); mobileOpen.value = false; });
watch(() => user.value?.forcePasswordChange, required => { if (required) openProfile(); });
watch(mobileOpen, async open => { if (open) { await nextTick(); rail.value?.querySelector<HTMLElement>('.wn-mobile-close')?.focus(); } });
onMounted(() => {
  access.refresh();
  if (user.value?.forcePasswordChange) openProfile();
  connectRealtime(); refreshUnread();
  chatPoll = setInterval(refreshUnread, 60000);
});
onBeforeUnmount(() => { if (chatPoll) clearInterval(chatPoll); });
</script>

<template>
  <div class="wn-rail-dock">
    <NuxtLink to="/workspace" aria-label="Рабочий стол"><LayoutDashboard :size="22" /><span>Стол</span></NuxtLink>
    <button ref="mobileTrigger" type="button" :aria-expanded="mobileOpen" aria-controls="workspace-navigation-rail" aria-label="Открыть разделы" @click="mobileOpen = true"><Menu :size="22" /><span>Разделы</span></button>
    <button type="button" aria-label="Найти раздел" @click="paletteOpen = true"><Search :size="22" /><span>Поиск</span></button>
    <button type="button" aria-label="Открыть профиль" @click="openProfile"><Users :size="22" /><span>Профиль</span></button>
  </div>
  <div v-if="mobileOpen" class="wn-rail-backdrop" @click="closeMobile" />
  <aside id="workspace-navigation-rail" ref="rail" class="console-rail wn-rail studio-rail" :class="{ 'wn-rail--open': mobileOpen, 'studio-rail--collapsed': railCollapsed }" :role="mobileOpen ? 'dialog' : undefined" :aria-modal="mobileOpen ? true : undefined" aria-label="Разделы рабочего пространства" @keydown="mobileKeys">
    <div class="wn-rail-head">
      <NuxtLink to="/workspace" class="console-rail-brand"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
      <button type="button" class="studio-rail-toggle" :aria-label="railCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'" :title="railCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'" :aria-expanded="!railCollapsed" aria-controls="workspace-navigation-links" @click="toggleRail"><component :is="railCollapsed ? PanelLeftOpen : PanelLeftClose" :size="20" /></button>
      <button type="button" class="wn-mobile-close" aria-label="Закрыть разделы" @click="closeMobile"><X :size="22" /></button>
    </div>
    <button type="button" class="studio-area-reveal" :aria-label="'Рабочее пространство: ' + (selectedArea?.label || 'Выбрать')" :title="selectedArea?.label" @click="revealArea"><component :is="icons[selectedArea?.icon || ''] || LayoutDashboard" :size="20" /></button>
    <label class="studio-area-switch"><span>Рабочее пространство</span><select ref="areaSelect" :value="selectedArea?.id || ''" aria-label="Выбрать рабочее пространство" @change="switchArea"><option v-for="area in areas" :key="area.id" :value="area.id">{{ area.label }}</option></select></label>
    <nav id="workspace-navigation-links" aria-label="Основная навигация">
      <NuxtLink to="/workspace" class="studio-home-link" aria-label="Рабочий стол" title="Рабочий стол" :class="{ active: active?.id === 'workspace' }" :aria-current="active?.id === 'workspace' ? 'page' : undefined"><LayoutDashboard :size="18" /><span>Рабочий стол</span></NuxtLink>
      <NuxtLink v-if="shopOverview && selectedArea?.id === 'site'" :to="shopOverview.to" :aria-label="shopOverview.label" :title="shopOverview.label" :class="{ active: active?.id === shopOverview.id }" :aria-current="active?.id === shopOverview.id ? 'page' : undefined"><BarChart3 :size="18" /><span>{{ shopOverview.label }}</span></NuxtLink>
      <section v-if="favorites.length" class="wn-nav-group wn-favorites-group"><button type="button" class="studio-favorites-reveal" aria-label="Показать избранное" title="Избранное" @click="revealFavorites"><Star :size="18" /></button><h2><Star :size="16" /> Избранное</h2><NuxtLink v-for="item in favorites" :key="item.id" :to="item.to" :class="{ active: active?.id === item.id }" :aria-current="active?.id === item.id ? 'page' : undefined"><span>{{ item.label }}</span></NuxtLink></section>
      <section v-for="group in visibleGroups" :key="group.id" class="wn-nav-group">
        <button type="button" class="wn-group-toggle" :class="{ 'wn-group-toggle--active': active?.groupId === group.id }" :aria-label="group.label" :title="group.label" :aria-expanded="expanded.includes(group.id) && (!railCollapsed || mobileOpen)" :aria-controls="'wn-group-' + group.id" @click="expand(group.id)"><component :is="icons[group.icon] || LayoutDashboard" :size="18" /><span>{{ group.label }}</span><ChevronDown :size="16" :class="{ 'wn-chevron--open': expanded.includes(group.id) }" /></button>
        <div v-if="expanded.includes(group.id)" :id="'wn-group-' + group.id" class="wn-group-items"><NuxtLink v-for="item in group.items" :key="item.id" :to="item.to" :class="{ active: active?.id === item.id }" :aria-current="active?.id === item.id ? 'page' : undefined"><span>{{ item.label }}</span></NuxtLink></div>
      </section>
      <p v-if="!groups.length" class="wn-nav-empty">Разделы появятся после проверки учётной записи.</p>
    </nav>
    <div class="rail-bottom"><button type="button" class="rail-user" aria-label="Открыть профиль" @click="openProfile"><i><img v-if="avatar" :src="avatar" alt="" /><template v-else>{{ (user?.firstName || 'S').slice(0, 1).toUpperCase() }}</template></i><span><strong>{{ [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Сотрудник' }}</strong><small>{{ user?.email }}</small></span></button></div>
  </aside>
</template>
