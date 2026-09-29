export function useCrmReminders() {
  const config = useRuntimeConfig();
  const { token, user } = useWorkspaceSession();
  const { can } = useWorkspaceAccess();
  const allowed = computed(() => Boolean(token.value) && ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE'].includes(user.value?.role || '') && can('crm.read'));
  const canDismiss = computed(() => allowed.value && can('crm.write'));
  const identity = computed(() => JSON.stringify([user.value?.id, token.value, allowed.value]));
  const reminders = ref<any[]>([]), error = ref(''), busy = ref(false);
  let sequence = 0;

  async function load() {
    if (!allowed.value || busy.value) return;
    const key = identity.value, request = ++sequence;
    try {
      const rows = await $fetch<any[]>('/crm/reminders', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 10000 });
      if (request === sequence && key === identity.value && allowed.value) reminders.value = Array.isArray(rows) ? rows : [];
    } catch {
      // Do not leave names from a revoked record on screen after an API denial.
      if (request === sequence && key === identity.value) reminders.value = [];
    }
  }
  async function dismiss(id: string) {
    if (!canDismiss.value || busy.value || !reminders.value.some(item => item.id === id)) return;
    const key = identity.value;
    busy.value = true; error.value = '';
    ++sequence; // An older poll must not resurrect this reminder after dismissal.
    try {
      await $fetch(`/crm/reminders/${encodeURIComponent(id)}/dismiss`, { baseURL: config.public.apiBase, method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, timeout: 10000 });
      if (key === identity.value && allowed.value) reminders.value = reminders.value.filter(item => item.id !== id);
    } catch {
      if (key === identity.value && allowed.value) {
        error.value = 'Не удалось скрыть напоминание. Проверяем актуальный доступ.';
        busy.value = false;
        await load();
      }
    } finally { if (key === identity.value) busy.value = false; }
  }
  watch(identity, () => {
    ++sequence; reminders.value = []; error.value = ''; busy.value = false;
    if (allowed.value) void load();
  }, { flush: 'sync' });
  onBeforeUnmount(() => { ++sequence; });
  return { reminders, allowed, canDismiss, error, busy, load, dismiss };
}
