<script setup lang="ts">
import { BarChart3, ChevronDown, LayoutDashboard, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, Star, Users, X } from '@lucide/vue';
const route = useRoute();
const { user, token } = useWorkspaceSession();
const config = useRuntimeConfig();
const { openProfile, isOpen: profileOpen } = useUserProfilePanel();
const { refreshUnread, connectRealtime, toggleChat, isOpen: chatOpen, unread } = usePlatformChat();
const { groups, active, favorites, paletteOpen } = useWorkspaceNavigation();
const { railCollapsed, setRailCollapsed, toggleRail } = useWorkspaceLayout();
const { selectedArea, visibleGroups, shopOverview } = useWorkspaceAreaSelection();
const access = useWorkspaceAccess();
const mobileOpen = ref(false);
useMobileNavigationSheet(mobileOpen);
const expanded = ref<string[]>([]);
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
async function revealFavorites() { setRailCollapsed(false); await nextTick(); rail.value?.querySelector<HTMLElement>('.wn-favorites-group a')?.focus(); }
function closeMobile() { mobileOpen.value = false; nextTick(() => mobileTrigger.value?.focus()); }
function closeActiveLink(event: MouseEvent) {
  if (mobileOpen.value && (event.target as Element).closest('a[aria-current="page"]')) closeMobile();
}
function mobileKeys(event: KeyboardEvent) {
  if (!mobileOpen.value) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMobile(); }
  if (event.key !== 'Tab') return;
  const controls = [...(rail.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled)') || [])].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
function showActiveGroup() { expanded.value = active.value?.groupId ? [active.value.groupId] : []; }
watch(() => active.value?.groupId, showActiveGroup, { immediate: true });
watch(() => route.fullPath, () => { mobileOpen.value = false; showActiveGroup(); });
watch(() => `${user.value?.id || ''}:${token.value}`, () => { access.refresh(); mobileOpen.value = false; showActiveGroup(); });
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
  <nav class="wn-rail-dock ui-mobile-dock" aria-label="Быстрая навигация рабочего пространства">
    <NuxtLink to="/workspace" aria-label="Рабочий стол" :class="{ active: route.path === '/workspace' }" :aria-current="route.path === '/workspace' ? 'page' : undefined"><LayoutDashboard :size="22" /><span>Стол</span></NuxtLink>
    <button type="button" aria-label="Найти раздел" :aria-expanded="paletteOpen" :class="{ active: paletteOpen }" @click="paletteOpen = true"><Search :size="22" /><span>Поиск</span></button>
    <button type="button" aria-label="Открыть чат" :aria-expanded="chatOpen" :class="{ active: chatOpen }" @click="toggleChat"><MessageCircle :size="22" /><span>Чат</span><small v-if="unread" class="ui-mobile-unread" :aria-label="`${unread} непрочитанных сообщений`">{{ unread > 99 ? '99+' : unread }}</small></button>
    <button type="button" aria-label="Открыть профиль" :aria-expanded="profileOpen" :class="{ active: profileOpen }" @click="openProfile"><Users :size="22" /><span>Профиль</span></button>
    <button ref="mobileTrigger" type="button" class="ui-mobile-menu" :aria-expanded="mobileOpen" aria-controls="workspace-navigation-rail" aria-label="Открыть разделы" @click="mobileOpen = true"><Menu :size="22" /><span>Разделы</span></button>
  </nav>
  <div v-if="mobileOpen" class="wn-rail-backdrop" @click="closeMobile" />
  <aside id="workspace-navigation-rail" ref="rail" class="console-rail wn-rail studio-rail" :class="{ 'wn-rail--open': mobileOpen, 'studio-rail--collapsed': railCollapsed }" :role="mobileOpen ? 'dialog' : undefined" :aria-modal="mobileOpen ? true : undefined" aria-label="Разделы рабочего пространства" @keydown="mobileKeys">
    <div class="wn-rail-head">
      <NuxtLink to="/workspace" class="console-rail-brand"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink>
      <button type="button" class="studio-rail-toggle" :aria-label="railCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'" :title="railCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'" :aria-expanded="!railCollapsed" aria-controls="workspace-navigation-links" @click="toggleRail"><component :is="railCollapsed ? PanelLeftOpen : PanelLeftClose" :size="20" /></button>
      <button type="button" class="wn-mobile-close" aria-label="Закрыть разделы" @click="closeMobile"><X :size="22" /></button>
    </div>
    <nav id="workspace-navigation-links" aria-label="Основная навигация" @click="closeActiveLink">
      <NuxtLink to="/workspace" class="studio-home-link" aria-label="Рабочий стол" title="Рабочий стол" :class="{ active: active?.id === 'workspace' }" :aria-current="active?.id === 'workspace' ? 'page' : undefined"><LayoutDashboard :size="18" /><span>Рабочий стол</span></NuxtLink>
      <NuxtLink v-if="shopOverview && selectedArea?.id === 'site'" :to="shopOverview.to" :aria-label="shopOverview.label" :title="shopOverview.label" :class="{ active: active?.id === shopOverview.id }" :aria-current="active?.id === shopOverview.id ? 'page' : undefined"><BarChart3 :size="18" /><span>{{ shopOverview.label }}</span></NuxtLink>
      <section v-if="favorites.length" class="wn-nav-group wn-favorites-group"><button type="button" class="studio-favorites-reveal" aria-label="Показать избранное" title="Избранное" @click="revealFavorites"><Star :size="18" /></button><h2><Star :size="16" /> Избранное</h2><NuxtLink v-for="item in favorites" :key="item.id" :to="item.to" :class="{ active: active?.id === item.id }" :aria-current="active?.id === item.id ? 'page' : undefined"><span>{{ item.label }}</span></NuxtLink></section>
      <section v-for="group in visibleGroups" :key="group.id" class="wn-nav-group">
        <button type="button" class="wn-group-toggle" :class="{ 'wn-group-toggle--active': active?.groupId === group.id }" :aria-label="group.label" :title="group.label" :aria-expanded="expanded.includes(group.id) && (!railCollapsed || mobileOpen)" :aria-controls="'wn-group-' + group.id" @click="expand(group.id)"><WorkspaceSectionIcon :name="group.icon" :size="18" /><span>{{ group.label }}</span><ChevronDown :size="16" :class="{ 'wn-chevron--open': expanded.includes(group.id) }" /></button>
        <div v-if="expanded.includes(group.id)" :id="'wn-group-' + group.id" class="wn-group-items"><NuxtLink v-for="item in group.items" :key="item.id" :to="item.to" :class="{ active: active?.id === item.id }" :aria-current="active?.id === item.id ? 'page' : undefined"><span>{{ item.label }}</span></NuxtLink></div>
      </section>
      <p v-if="!groups.length" class="wn-nav-empty">Разделы появятся после проверки учётной записи.</p>
    </nav>
    <div class="rail-bottom"><button type="button" class="rail-user" aria-label="Открыть профиль" @click="openProfile"><i><img v-if="avatar" :src="avatar" alt="" /><template v-else>{{ (user?.firstName || 'S').slice(0, 1).toUpperCase() }}</template></i><span><strong>{{ [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Сотрудник' }}</strong><small>{{ user?.email }}</small></span></button></div>
  </aside>
</template>
