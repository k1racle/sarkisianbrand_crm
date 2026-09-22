<script setup lang="ts">
import { ArrowUpRight, ChevronRight, LayoutGrid, LogOut, Menu, MessageCircle, Search, Star, UserRound, WifiOff, X } from '@lucide/vue';
const route = useRoute();
const router = useRouter();
const { user, token, logout } = useWorkspaceSession();
const { items, groups, active, favorites, home, toggleFavorite } = useCrmNavigation();
const access = useWorkspaceAccess();
const { unread, toggleChat, isOpen: chatOpen, connectRealtime, refreshUnread, disconnectRealtime } = usePlatformChat();
const { openProfile } = useUserProfilePanel();
const { online } = useCrmPwa();
const signingOut = useState<boolean>('workspace-signing-out', () => false);
const menuOpen = ref(false);
const searchOpen = ref(false);
const query = ref('');
const { panel: menuPanel, keyboard: menuKeys } = useCatalogDialog(computed(() => menuOpen.value), () => { menuOpen.value = false; });
const { panel: searchPanel, keyboard: searchKeys } = useCatalogDialog(computed(() => searchOpen.value), () => { searchOpen.value = false; });
const searchInput = ref<HTMLInputElement | null>(null);
const results = computed(() => {
  const terms = query.value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim().split(/\s+/);
  return items.value.filter(item => terms.every(term => `${item.label} ${item.group} ${item.keywords || ''}`.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').includes(term)));
});
const tabs = computed(() => {
  const priority = ['crm-dashboard', 'pipeline', 'customers', 'tasks'];
  const primary = priority.flatMap(id => items.value.filter(item => item.id === id));
  return [...primary, ...items.value.filter(item => !priority.includes(item.id))].slice(0, 4);
});
const tabName: Record<string, string> = { 'crm-dashboard': 'Сегодня', pipeline: 'Сделки', customers: 'Клиенты', tasks: 'Задачи' };
const fullName = computed(() => [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ') || 'Мой профиль');
function openSearch() { menuOpen.value = false; query.value = ''; searchOpen.value = true; }
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    const failure = await router.push('/crm/login');
    if (!failure) { disconnectRealtime(); logout(); }
  } finally { signingOut.value = false; }
}
function shortcuts(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
}
function resize() { if (window.innerWidth >= 1024) menuOpen.value = false; }
watch(() => route.fullPath, () => { menuOpen.value = false; searchOpen.value = false; });
watch(searchOpen, async open => { if (open) { await nextTick(); searchInput.value?.focus(); } });
watch(() => user.value?.forcePasswordChange, required => { if (required) openProfile(); });
watch(() => `${user.value?.id || ''}:${token.value}`, () => { void access.refresh(); });
let poll: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void access.refresh(); connectRealtime(); void refreshUnread();
  if (user.value?.forcePasswordChange) openProfile();
  poll = setInterval(refreshUnread, 60000);
  window.addEventListener('keydown', shortcuts);
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => { if (poll) clearInterval(poll); window.removeEventListener('keydown', shortcuts); window.removeEventListener('resize', resize); });
</script>
<template>
  <div class="crm-app">
    <a href="#crm-content" class="crm-skip-link">Перейти к содержимому</a>
    <div v-if="menuOpen" class="crm-menu-backdrop" @click="menuOpen = false" />
    <aside ref="menuPanel" class="crm-app-sidebar" :class="{ 'is-open': menuOpen }" :role="menuOpen ? 'dialog' : undefined" :aria-modal="menuOpen ? true : undefined" aria-label="Разделы CRM" tabindex="-1" @keydown="menuOpen && menuKeys($event)">
      <header class="crm-brand"><NuxtLink :to="home" aria-label="SARKISIAN CRM — рабочий стол"><img class="crm-brand-mark" src="/crm/pwa/icon.svg" width="42" height="42" alt="" /><span>SARKISIAN<small>CRM · Команда</small></span></NuxtLink><button type="button" class="crm-icon-button crm-close-menu" aria-label="Закрыть разделы CRM" @click="menuOpen = false"><X :size="20" /></button></header>
      <nav class="crm-navigation" aria-label="Основная навигация CRM">
        <section v-if="favorites.length"><h2><Star :size="16" />Избранное</h2><NuxtLink v-for="item in favorites" :key="item.id" :to="item.to" :aria-current="active?.id === item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="item.icon" :size="20" /><span>{{ item.label }}</span></NuxtLink></section>
        <section v-for="group in groups" :key="group.label"><h2>{{ group.label }}</h2><NuxtLink v-for="item in group.items" :key="item.id" :to="item.to" :aria-current="active?.id === item.id ? 'page' : undefined" @click="menuOpen = false"><WorkspaceSectionIcon :name="item.icon" :size="20" /><span>{{ item.label }}</span></NuxtLink></section>
        <p v-if="!items.length" class="crm-menu-empty">Для вашей роли пока нет доступных разделов CRM.</p>
      </nav>
      <footer class="crm-sidebar-footer"><NuxtLink to="/workspace"><LayoutGrid :size="18" />Управление платформой<ArrowUpRight :size="16" /></NuxtLink><button type="button" @click="openProfile"><UserRound :size="18" /><span>{{ fullName }}</span></button><button type="button" :disabled="signingOut" @click="signOut"><LogOut :size="18" />Выйти из CRM</button></footer>
    </aside>
    <div class="workspace-frame crm-frame" :inert="menuOpen || searchOpen || undefined">
      <header class="crm-topbar">
        <NuxtLink :to="home" class="crm-mobile-brand" aria-label="SARKISIAN CRM — рабочий стол"><img src="/crm/pwa/icon.svg" width="32" height="32" alt="" /><span>CRM</span></NuxtLink>
        <div class="crm-section-title"><span>SARKISIAN CRM</span><strong>{{ active?.label || 'Рабочее пространство' }}</strong></div>
        <div class="crm-topbar-actions"><button type="button" class="crm-icon-button crm-search-button" aria-label="Найти раздел CRM" @click="openSearch"><Search :size="20" /><span>Найти раздел</span><kbd>⌘ / Ctrl K</kbd></button><button type="button" class="crm-icon-button" aria-label="Открыть чат команды" :aria-expanded="chatOpen" @click="toggleChat"><MessageCircle :size="20" /><span v-if="unread" class="crm-unread">{{ unread > 99 ? '99+' : unread }}</span></button><button v-if="active" type="button" class="crm-icon-button crm-favorite-button" :aria-label="favorites.some(item => item.id === active!.id) ? 'Убрать из избранного' : 'Добавить в избранное'" :aria-pressed="favorites.some(item => item.id === active!.id)" @click="toggleFavorite(active.id)"><Star :size="20" /></button><CrmInstallButton /></div>
      </header>
      <p v-if="!online" class="crm-offline-notice" role="status"><WifiOff :size="18" />Нет соединения. Проверьте интернет перед сохранением изменений.</p>
      <p v-if="access.error.value" class="crm-access-notice" role="alert">{{ access.error.value }} <button type="button" @click="access.refresh">Повторить</button></p>
      <div id="crm-content" tabindex="-1" class="crm-content-anchor" />
      <slot />
    </div>
    <nav class="crm-mobile-tabs" aria-label="Быстрая навигация CRM" :inert="menuOpen || searchOpen || undefined"><NuxtLink v-for="item in tabs" :key="item.id" :to="item.to" :aria-current="active?.id === item.id ? 'page' : undefined"><WorkspaceSectionIcon :name="item.icon" :size="21" /><span>{{ tabName[item.id] || item.label }}</span></NuxtLink><button type="button" aria-label="Открыть разделы CRM" :aria-expanded="menuOpen" @click="menuOpen = true"><Menu :size="21" /><span>Ещё</span></button></nav>
    <WorkspaceContextMenu />
    <PlatformChatDrawer />
    <TaskReminderCenter />
    <UserProfileDrawer mode="workspace" />
    <Teleport to="body"><div v-if="searchOpen" class="crm-dialog-backdrop" @click.self="searchOpen = false"><section ref="searchPanel" class="crm-search-dialog" role="dialog" aria-modal="true" aria-labelledby="crm-search-title" tabindex="-1" @keydown="searchKeys"><header><h2 id="crm-search-title">Найти раздел CRM</h2><button type="button" class="crm-icon-button" aria-label="Закрыть поиск" @click="searchOpen = false"><X :size="22" /></button></header><label class="crm-search-field"><Search :size="20" /><input ref="searchInput" v-model="query" type="search" aria-label="Название раздела CRM" placeholder="Клиенты, заказы, задачи…" /></label><nav aria-label="Результаты поиска CRM"><NuxtLink v-for="item in results" :key="item.id" :to="item.to" @click="searchOpen = false"><span><strong>{{ item.label }}</strong><small>{{ item.group }}</small></span><ChevronRight :size="18" /></NuxtLink><p v-if="!results.length">Разделов с таким названием нет.</p></nav></section></div></Teleport>
  </div>
</template>
