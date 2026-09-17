<script setup lang="ts">
import { ChevronRight, ExternalLink, LogOut, MessageCircle, Pin, Search, Star, X } from '@lucide/vue';
const router = useRouter();
const { logout } = useWorkspaceSession();
const { unread, toggleChat, isOpen: chatOpen } = usePlatformChat();
const signingOut = useState<boolean>('workspace-signing-out', () => false);
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    // Route guards run before clearing the session, so a declined discard retains the draft.
    const failure = await router.push('/workspace-login');
    if (!failure) logout();
  } finally { signingOut.value = false; }
}
const { active, breadcrumbs, favorites, recent, start, paletteOpen, toggleFavorite, setStart, search } = useWorkspaceNavigation();
const query = ref('');
const selected = ref(0);
const dialog = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const results = computed(() => query.value.trim() ? search(query.value) : search('').sort((a, b) => {
  const priority = (id: string) => favorites.value.some(item => item.id === id) ? 0 : recent.value.some(item => item.id === id) ? 1 : 2;
  return priority(a.id) - priority(b.id);
}));
let returnFocus: HTMLElement | null = null;
function closePalette() { paletteOpen.value = false; }
function globalKeys(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); paletteOpen.value = !paletteOpen.value; }
  if (event.key === 'Escape' && paletteOpen.value) { event.preventDefault(); closePalette(); }
}
function dialogKeys(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const count = results.value.length;
    selected.value = count ? (selected.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count : 0;
    nextTick(() => dialog.value?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
  }
  if (event.key === 'Enter' && event.target === searchInput.value) {
    event.preventDefault();
    const item = results.value[selected.value];
    if (item) { closePalette(); navigateTo(item.to); }
  }
  if (event.key !== 'Tab') return;
  const controls = [...(dialog.value?.querySelectorAll<HTMLElement>('input, button:not(:disabled), a[href]') || [])].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
watch(query, () => { selected.value = 0; });
watch(results, () => { if (selected.value >= results.value.length) selected.value = 0; });
watch(paletteOpen, async open => {
  if (open) { returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; query.value = ''; selected.value = 0; await nextTick(); searchInput.value?.focus(); }
  else { await nextTick(); if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus(); else document.querySelector<HTMLElement>('.wn-command-trigger')?.focus(); }
});
onMounted(() => { window.addEventListener('keydown', globalKeys); });
onBeforeUnmount(() => { window.removeEventListener('keydown', globalKeys); paletteOpen.value = false; });
</script>

<template>
  <div class="wn-toolbar" aria-label="Навигация по рабочему пространству">
    <nav class="wn-breadcrumbs" aria-label="Хлебные крошки"><template v-for="(crumb, index) in breadcrumbs" :key="index"><ChevronRight v-if="index" :size="14" aria-hidden="true" /><NuxtLink :to="crumb.to" :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined">{{ crumb.label }}</NuxtLink></template></nav>
    <div class="wn-toolbar-actions">
      <button type="button" class="wn-command-trigger" aria-label="Найти раздел" @click="paletteOpen = true"><Search :size="18" /><span>Найти раздел</span><kbd aria-hidden="true">Ctrl K</kbd></button>
      <button type="button" class="wn-icon-control wn-chat-trigger" aria-label="Чат платформы" title="Чат платформы" :aria-expanded="chatOpen" @click="toggleChat"><MessageCircle :size="18" /><em v-if="unread" class="wn-unread" aria-label="Непрочитанные сообщения">{{ unread > 99 ? '99+' : unread }}</em></button>
      <NuxtLink to="/" target="_blank" rel="noopener noreferrer" class="wn-icon-control" aria-label="Открыть сайт" title="Открыть сайт"><ExternalLink :size="18" /></NuxtLink>
      <button v-if="active && active.id !== 'workspace'" type="button" class="wn-icon-control" :aria-pressed="favorites.some(item => item.id === active!.id)" :aria-label="favorites.some(item => item.id === active!.id) ? 'Убрать раздел из избранного' : 'Добавить раздел в избранное'" @click="toggleFavorite(active.id)"><Star :size="18" /></button>
      <button v-if="active && active.id !== 'workspace'" type="button" class="wn-icon-control" :aria-pressed="start?.id === active.id" :aria-label="start?.id === active.id ? 'Сбросить стартовый раздел' : 'Сделать раздел стартовым на рабочем столе'" @click="setStart(start?.id === active.id ? null : active.id)"><Pin :size="18" /></button>
      <button type="button" class="wn-icon-control wn-signout" aria-label="Выйти" title="Выйти" :disabled="signingOut" @click="signOut"><LogOut :size="18" /></button>
    </div>
  </div>
  <Teleport to="body"><Transition name="wn-palette"><div v-if="paletteOpen" class="wn-palette-layer admin-dialog-backdrop" @mousedown.self="closePalette" @keydown="dialogKeys"><section ref="dialog" class="wn-command-dialog admin-dialog admin-dialog--modal" role="dialog" aria-modal="true" aria-labelledby="wn-command-title"><header><div><h2 id="wn-command-title">Перейти в раздел</h2><p>Поиск по доступным разделам. Избранное и недавнее — выше.</p></div><button type="button" class="wn-icon-control" aria-label="Закрыть поиск разделов" @click="closePalette"><X :size="22" /></button></header><label class="wn-command-search"><Search :size="20" aria-hidden="true" /><span class="wn-sr-only">Название раздела</span><input ref="searchInput" v-model="query" type="search" placeholder="Например, товары или заявки" autocomplete="off" /></label><p class="wn-command-count" role="status">{{ results.length ? `Доступных разделов: ${results.length}` : 'Ничего не найдено. Попробуйте другое название.' }}</p><nav class="wn-command-results" aria-label="Результаты поиска"><NuxtLink v-for="(item, index) in results" :key="item.id" :to="item.to" :data-selected="index === selected" :class="{ 'wn-result--selected': index === selected }" @focus="selected = index" @click="closePalette"><span><strong>{{ item.label }}</strong><small>{{ item.groupLabel }}</small></span><ChevronRight :size="18" aria-hidden="true" /></NuxtLink></nav><footer>↑ ↓ — выбрать · Enter — перейти · Esc — закрыть</footer></section></div></Transition></Teleport>
</template>
