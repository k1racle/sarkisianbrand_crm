<script setup lang="ts">
import { ChevronRight, Grid2X2, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, Star, WifiOff, X } from '@lucide/vue';
const route = useRoute();
const router = useRouter();
const { user, token, endSession } = useWorkspaceSession();
const { items, groups, active, favorites, home, search, toggleFavorite } = useCrmNavigation();
const access = useWorkspaceAccess();
const { unread, toggleChat, isOpen: chatOpen, connectRealtime, refreshUnread, disconnectRealtime } = usePlatformChat();
const { openProfile } = useUserProfilePanel();
const { online } = useCrmPwa();
const signingOut = useState<boolean>('workspace-signing-out', () => false);
const menuOpen = ref(false);
const railCollapsed = useCookie<boolean>('sarkisian-crm-sidebar-compact', { default: () => false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 180 });
const searchOpen = ref(false);
const query = ref('');
const expandedModules = ref<string[]>([]);
const allSectionsOpen = ref(false);
const orderDestination = computed(() => items.value.find(item => item.id === 'b2b-orders') || items.value.find(item => item.id === 'web-orders'));
const primaryNavigation = computed(() => ['crm-dashboard', 'customers', 'pipeline', orderDestination.value?.id, 'tasks', 'crm-meetings']
  .flatMap(id => items.value.filter(item => item.id === id)));
const primaryName: Record<string, string> = { 'crm-dashboard': 'Мой день', customers: 'Клиенты', pipeline: 'Сделки', 'b2b-orders': 'Заказы', 'web-orders': 'Заказы', tasks: 'Задачи', 'crm-meetings': 'Календарь' };
const shortcutItems = computed(() => favorites.value.length ? favorites.value : ['order-fulfillment', 'partner-documents-settings', 'leadership'].flatMap(id => items.value.filter(item => item.id === id)));
const remainingGroups = computed(() => groups.value.map(group => ({ ...group, entries: group.entries.filter(entry => !entry.item || !primaryNavigation.value.some(item => item.id === entry.item!.id)) })).filter(group => group.entries.length));
const initials = computed(() => [user.value?.firstName?.[0], user.value?.lastName?.[0]].filter(Boolean).join('').toLocaleUpperCase('ru-RU') || user.value?.email?.[0]?.toLocaleUpperCase('ru-RU') || 'Я');
function toggleSections() {
  if (railCollapsed.value) { railCollapsed.value = false; allSectionsOpen.value = true; }
  else allSectionsOpen.value = !allSectionsOpen.value;
}
watch([active, primaryNavigation], ([current, primary]) => { if (current && !primary.some(item => item.id === current.id)) allSectionsOpen.value = true; }, { immediate: true });
function moduleToggle(id: string, event: Event) {
  const open = (event.currentTarget as HTMLDetailsElement).open;
  expandedModules.value = open ? [...new Set([...expandedModules.value, id])] : expandedModules.value.filter(value => value !== id);
}
async function openCompactModule(id: string, event: MouseEvent) {
  if (!railCollapsed.value || window.innerWidth < 1024) return;
  const summary = event.currentTarget as HTMLElement;
  event.preventDefault();
  railCollapsed.value = false;
  if (!expandedModules.value.includes(id)) expandedModules.value.push(id);
  await nextTick();
  summary.focus();
}
watch(() => active.value?.parent, id => { if (id && !expandedModules.value.includes(id)) expandedModules.value.push(id); }, { immediate: true });
const { panel: menuPanel, keyboard: menuKeys } = useCatalogDialog(computed(() => menuOpen.value), () => { menuOpen.value = false; });
const { panel: searchPanel, keyboard: searchKeys } = useCatalogDialog(computed(() => searchOpen.value), () => { searchOpen.value = false; });
const searchInput = ref<HTMLInputElement | null>(null);
const results = computed(() => search(query.value));
const tabs = computed(() => {
  const priority = ['crm-dashboard', 'customers', orderDestination.value?.id].filter(Boolean);
  const primary = priority.flatMap(id => items.value.filter(item => item.id === id));
  return [...primary, ...search('').filter(item => !priority.includes(item.id))].slice(0, 3);
});
const tabName: Record<string, string> = { ...primaryName };
const fullName = computed(() => [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ') || 'Мой профиль');
function openSearch() { menuOpen.value = false; query.value = ''; searchOpen.value = true; }
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    const failure = await router.push('/crm/login');
    if (!failure) { disconnectRealtime(); await endSession(); }
  } finally { signingOut.value = false; }
}
function shortcuts(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (searchOpen.value) { searchInput.value?.focus(); return; }
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    openSearch();
  }
}
function resize() { if (window.innerWidth >= 1024) menuOpen.value = false; }
watch(() => route.fullPath, () => { menuOpen.value = false; searchOpen.value = false; });
watch(searchOpen, async open => { if (open) { await nextTick(); searchInput.value?.focus(); } });
watch(() => user.value?.forcePasswordChange, required => { if (required) openProfile(); });
watch(() => `${user.value?.id || ''}:${token.value}`, () => { void access.refresh(); if (token.value) connectRealtime(); else disconnectRealtime(); });
let poll: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void access.ensure(); connectRealtime(); void refreshUnread();
  if (user.value?.forcePasswordChange) openProfile();
  poll = setInterval(refreshUnread, 60000);
  window.addEventListener('keydown', shortcuts);
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => { if (poll) clearInterval(poll); window.removeEventListener('keydown', shortcuts); window.removeEventListener('resize', resize); });
</script>
<template>
  <div class="crm-app" :class="{ 'crm-app--compact': railCollapsed }">
    <a href="#crm-content" class="crm-skip-link">Перейти к содержимому</a>
    <div v-if="menuOpen" class="crm-menu-backdrop" @click="menuOpen = false" />
    <aside ref="menuPanel" class="crm-app-sidebar" :class="{ 'is-open': menuOpen }" :role="menuOpen ? 'dialog' : undefined" :aria-modal="menuOpen ? true : undefined" aria-label="Разделы CRM" tabindex="-1" @keydown="menuOpen && menuKeys($event)">
      <header class="crm-brand"><NuxtLink :to="home" aria-label="SARKISIAN CRM — рабочий стол"><img class="crm-brand-mark" src="/crm/pwa/icon.svg?v=brand2" width="42" height="42" alt="" /><span>SARKISIAN<small>Рабочее пространство</small></span></NuxtLink><button type="button" class="crm-icon-button crm-rail-toggle" :aria-label="railCollapsed ? 'Развернуть меню CRM' : 'Свернуть меню CRM'" :title="railCollapsed ? 'Развернуть меню' : 'Свернуть меню'" :aria-expanded="!railCollapsed" @click="railCollapsed = !railCollapsed"><PanelLeftOpen v-if="railCollapsed" :size="18" /><PanelLeftClose v-else :size="18" /></button><button type="button" class="crm-icon-button crm-close-menu" aria-label="Закрыть разделы CRM" @click="menuOpen = false"><X :size="20" /></button></header>
      <button class="crm-sidebar-search" type="button" title="Найти раздел CRM · Ctrl K" @click="openSearch"><Search :size="17" /><span>Найти в CRM</span><kbd>Ctrl K</kbd></button>
      <nav class="crm-navigation" aria-label="Основная навигация CRM">
        <section class="crm-primary-navigation" aria-label="Частые разделы">
          <NuxtLink v-for="item in primaryNavigation" :key="item.id" :to="item.to" :title="primaryName[item.id] || item.label" :aria-current="active?.id === item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="item.icon" :size="18" /><span>{{ primaryName[item.id] || item.label }}</span></NuxtLink>
          <button type="button" class="crm-all-sections" aria-controls="crm-all-sections-list" :aria-expanded="allSectionsOpen" title="Все разделы CRM" @click="toggleSections"><Grid2X2 :size="18" /><span>Все разделы</span><ChevronRight :size="14" class="crm-all-sections-chevron" /></button>
        </section>
        <section v-if="shortcutItems.length" class="crm-shortcuts"><h2><Star v-if="favorites.length" :size="14" />{{ favorites.length ? 'Избранное' : 'Быстрый доступ' }}</h2><NuxtLink v-for="item in shortcutItems" :key="item.id" :to="item.to" :title="item.label" :aria-current="active?.id === item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="item.icon" :size="18" /><span>{{ item.label }}</span></NuxtLink></section>
        <div id="crm-all-sections-list" v-show="allSectionsOpen" class="crm-all-sections-list">
        <section v-for="group in remainingGroups" :key="group.label" :aria-label="group.label">
          <h2>{{ group.label }}</h2>
          <template v-for="entry in group.entries" :key="entry.id">
            <NuxtLink v-if="entry.item" :to="entry.item.to" :title="entry.label" :aria-current="active?.id === entry.item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="entry.icon" :size="20" /><span>{{ entry.label }}</span></NuxtLink>
            <details v-else class="crm-nav-module" :data-module="entry.id" :data-active="active?.parent === entry.id || undefined" :open="expandedModules.includes(entry.id)" @toggle="moduleToggle(entry.id, $event)">
              <summary :title="entry.label" @click="openCompactModule(entry.id, $event)"><WorkspaceSectionIcon :name="entry.icon" :size="20" /><span>{{ entry.label }}</span><ChevronRight class="crm-nav-chevron" :size="16" /></summary>
              <div class="crm-nav-children"><NuxtLink v-for="item in entry.children" :key="item.id" :to="item.to" :aria-current="active?.id === item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="item.icon" :size="18" /><span>{{ item.label }}</span></NuxtLink></div>
            </details>
          </template>
        </section>
        </div>
        <p v-if="!items.length" class="crm-menu-empty">Для вашей роли пока нет доступных разделов CRM.</p>
      </nav>
      <div class="crm-sidebar-tools"><CrmInstallButton /></div>
      <footer class="crm-sidebar-footer"><button class="crm-sidebar-profile" type="button" :title="fullName" @click="openProfile"><span class="crm-profile-avatar" aria-hidden="true">{{ initials }}</span><span>{{ fullName }}<small>Мой профиль</small></span></button><button class="crm-sidebar-signout" type="button" aria-label="Выйти из CRM" title="Выйти из CRM" :disabled="signingOut" @click="signOut"><LogOut :size="18" /></button></footer>
    </aside>
    <div class="workspace-frame crm-frame" :inert="menuOpen || searchOpen || undefined">
      <header class="crm-topbar">
        <NuxtLink :to="home" class="crm-mobile-brand" aria-label="SARKISIAN CRM — рабочий стол"><img src="/crm/pwa/icon.svg?v=brand2" width="32" height="32" alt="" /><span>CRM</span></NuxtLink>
        <button class="crm-icon-button crm-topbar-menu" type="button" aria-label="Открыть главное меню" :aria-expanded="menuOpen" @click="menuOpen = true"><Menu :size="20" /></button>
        <div class="crm-section-title"><span class="crm-topbar-wordmark">SARKISIAN CRM</span><ChevronRight class="crm-topbar-divider" :size="14" /><CrmSectionNavigation mode="breadcrumb" /></div>
        <div class="crm-topbar-actions"><CrmDensityToggle /><CrmThemeToggle /><button type="button" class="crm-icon-button crm-search-button" aria-label="Найти раздел CRM" @click="openSearch"><Search :size="20" /><span>Найти раздел</span><kbd>⌘ / Ctrl K</kbd></button><button type="button" class="crm-icon-button" aria-label="Открыть чат команды" :aria-expanded="chatOpen" @click="toggleChat"><MessageCircle :size="20" /><span v-if="unread" class="crm-unread">{{ unread > 99 ? '99+' : unread }}</span></button><CrmNotificationCenter /><button v-if="active" type="button" class="crm-icon-button crm-favorite-button" :aria-label="favorites.some(item => item.id === active!.id) ? 'Убрать из избранного' : 'Добавить в избранное'" :aria-pressed="favorites.some(item => item.id === active!.id)" @click="toggleFavorite(active.id)"><Star :size="20" /></button><CrmInstallButton /></div>
      </header>
      <p v-if="!online" class="crm-offline-notice" role="status"><WifiOff :size="18" />Нет соединения. Проверьте интернет перед сохранением изменений.</p>
      <div id="crm-content" tabindex="-1" class="crm-content-anchor" />
      <CrmAccessBoundary>
        <div class="crm-workspace-content">
        <CrmSectionNavigation mode="tabs" />
        <slot />
        </div>
      </CrmAccessBoundary>
    </div>
    <nav class="crm-mobile-tabs" aria-label="Быстрая навигация CRM" :inert="menuOpen || searchOpen || undefined"><NuxtLink v-for="item in tabs" :key="item.id" :to="item.to" :aria-label="tabName[item.id] || item.label" :title="tabName[item.id] || item.label" :aria-current="active?.id === item.id ? 'page' : undefined"><WorkspaceSectionIcon :name="item.icon" :size="21" /><span :class="{'crm-mobile-label-full--day':item.id==='crm-dashboard'}">{{ tabName[item.id] || item.label }}</span><span v-if="item.id==='crm-dashboard'" class="crm-mobile-label-short" aria-hidden="true">День</span></NuxtLink><button class="crm-navigation-action" type="button" aria-label="Открыть разделы CRM" :aria-expanded="menuOpen" @click="menuOpen = true"><Menu :size="21" /><span>Ещё</span></button></nav>
    <WorkspaceContextMenu />
    <PlatformChatDrawer />
    <UserProfileDrawer mode="workspace" />
    <Teleport to="body"><div v-if="searchOpen" class="crm-dialog-backdrop" @click.self="searchOpen = false"><section ref="searchPanel" class="crm-search-dialog" role="dialog" aria-modal="true" aria-labelledby="crm-search-title" tabindex="-1" @keydown="searchKeys"><header><h2 id="crm-search-title">Найти раздел CRM</h2><button type="button" class="crm-icon-button" aria-label="Закрыть поиск" @click="searchOpen = false"><X :size="22" /></button></header><label class="crm-search-field"><Search :size="20" /><input class="crm-input" ref="searchInput" v-model="query" type="search" aria-label="Название раздела CRM" placeholder="Клиенты, заказы, задачи…" /></label><nav aria-label="Результаты поиска CRM"><NuxtLink v-for="item in results" :key="item.id" :to="item.to" @click="searchOpen = false"><span><strong>{{ item.label }}</strong><small>{{ [item.group, item.parentLabel].filter(Boolean).join(' / ') }}</small></span><ChevronRight :size="18" /></NuxtLink><p v-if="!results.length">Разделов с таким названием нет.</p></nav></section></div></Teleport>
  </div>
</template>
