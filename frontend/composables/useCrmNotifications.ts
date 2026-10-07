export type CrmNotification = { id: string; category: string; kind: string; title: string; body: string; createdAt: string; read: boolean; url: string; channelId?: string };
type NotificationPage = { items: CrmNotification[]; fresh: CrmNotification[]; unreadCount: number; nextCursor: string | null; through: string; popupsEnabled: boolean };

export function useCrmNotifications() {
  const config = useRuntimeConfig(), { token, user } = useWorkspaceSession();
  const chat = usePlatformChat();
  const open = useState('crm-notifications-open', () => false), unreadCount = useState('crm-notifications-count', () => 0);
  const items = useState<CrmNotification[]>('crm-notifications-items', () => []), toasts = useState<CrmNotification[]>('crm-notifications-toasts', () => []);
  const category = useState('crm-notifications-category', () => 'ALL'), unreadOnly = useState('crm-notifications-unread-only', () => false);
  const popupsEnabled = useState('crm-notifications-popups', () => true);
  const loading = ref(false), busy = ref(false), error = ref(''), nextCursor = ref<string | null>(null);
  let version = 0, through = '', baseline = '', initialized = false;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const api = <T>(path = '', options: any = {}) => $fetch<T>('/staff-notifications' + path, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 15000, retry: 0, ...options });
  function dismissToast(id: string) { const timer = timers.get(id); if (timer) clearTimeout(timer); timers.delete(id); toasts.value = toasts.value.filter(row => row.id !== id); }
  function pauseToast(id: string) { const timer = timers.get(id); if (timer) clearTimeout(timer); timers.delete(id); }
  function resumeToast(id: string) { pauseToast(id); timers.set(id, setTimeout(() => dismissToast(id), 8000)); }
  function reset() {
    ++version; initialized = false; through = ''; baseline = ''; nextCursor.value = null; open.value = false; items.value = []; unreadCount.value = 0; error.value = ''; loading.value = false; busy.value = false;
    [...timers.keys()].forEach(dismissToast); toasts.value = [];
  }
  function announce(rows: CrmNotification[]) {
    // Only IDs are stored; another browser tab must not repeat the same popup.
    const key = 'crm-notification-seen:' + user.value?.id;
    let seen: string[] = []; try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(stored)) seen = stored.filter(id => typeof id === 'string'); } catch { /* Storage can be disabled. */ }
    const fresh = rows.filter(row => !row.read && !seen.includes(row.id) && row.createdAt > baseline);
    const ids = [...new Set([...seen, ...rows.map(row => row.id)])].slice(-300);
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* Popups still work without persistence. */ }
    if (!initialized || !popupsEnabled.value || open.value || document.hidden) return;
    fresh.reverse().forEach(row => {
      if (row.channelId && chat.isOpen.value && chat.activeChannelId.value === row.channelId) return;
      if (toasts.value.some(item => item.id === row.id)) return;
      toasts.value.push(row); resumeToast(row.id);
      while (toasts.value.length > 3) dismissToast(toasts.value[0].id);
    });
  }
  async function load(append = false) {
    if (!token.value || (append && (!nextCursor.value || loading.value))) return;
    const request = ++version, identity = token.value;
    const current = () => request === version && identity === token.value;
    loading.value = true;
    try {
      const response = await api<NotificationPage>('', { query: { category: category.value, unread: String(unreadOnly.value), ...(append ? { cursor: nextCursor.value } : {}) } });
      if (!current()) return;
      error.value = ''; unreadCount.value = response.unreadCount; popupsEnabled.value = response.popupsEnabled;
      if (!append) {
        items.value = response.items;
        // Withdraw popups after access/read status changes, rather than retaining stale payloads.
        const visible = new Set(response.fresh.map(row => row.id));
        toasts.value.filter(row => !visible.has(row.id)).forEach(row => dismissToast(row.id));
        announce(response.fresh); through = response.through; if (!initialized) baseline = response.through; initialized = true;
      } else items.value = [...items.value, ...response.items.filter(row => !items.value.some(existing => existing.id === row.id))];
      nextCursor.value = response.nextCursor;
    } catch (e: any) {
      if (!current()) return;
      error.value = e?.data?.message || 'Не удалось обновить уведомления'; items.value = []; unreadCount.value = 0;
      [...timers.keys()].forEach(dismissToast);
    } finally { if (current()) loading.value = false; }
  }
  async function action(fn: () => Promise<unknown>) {
    if (busy.value) return false; const identity = token.value; busy.value = true;
    try { await fn(); if (token.value !== identity) return false; error.value = ''; return true; }
    catch (e: any) { if (token.value === identity) error.value = e?.data?.message || 'Не удалось выполнить действие'; return false; }
    finally { if (token.value === identity) busy.value = false; }
  }
  async function read(row: CrmNotification) { if (await action(() => api('/' + row.id + '/read', { method: 'POST' }))) { dismissToast(row.id); await load(); } }
  async function readAll() { if (through && await action(() => api('/read-all', { method: 'POST', body: { through } }))) { [...timers.keys()].forEach(dismissToast); await load(); } }
  async function togglePopups() {
    const desired = !popupsEnabled.value;
    if (await action(() => api('/preferences', { method: 'PATCH', body: { popupsEnabled: desired } }))) {
      popupsEnabled.value = desired; if (!desired) [...timers.keys()].forEach(dismissToast);
    }
  }
  async function follow(row: CrmNotification) {
    const identity = token.value;
    const ok = await action(async () => {
      const current = await api<CrmNotification>('/' + row.id);
      await api('/' + row.id + '/read', { method: 'POST' });
      if (identity !== token.value) return;
      open.value = false; dismissToast(row.id);
      if (current.channelId) chat.openChat(current.channelId);
      else if (/^\/crm\/(tasks|fulfillment|support\/tickets|messages)\?/.test(current.url)) await navigateTo(current.url);
    });
    if (identity === token.value) { if (!ok) { dismissToast(row.id); items.value = items.value.filter(item => item.id !== row.id); open.value = true; } else await load(); }
  }
  return { open, unreadCount, items, toasts, category, unreadOnly, popupsEnabled, loading, busy, error, nextCursor, load, reset, read, readAll, togglePopups, follow, dismissToast, pauseToast, resumeToast };
}
