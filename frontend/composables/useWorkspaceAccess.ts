// Menu visibility is a convenience; the server remains authoritative for every action.
export function useWorkspaceAccess() {
  const session = useWorkspaceSession();
  const config = useRuntimeConfig();
  const identity = computed(() => `${session.user.value?.id || ''}:${session.token.value}`);
  const state = useState<{ identity: string; permissions: string[]; ready: boolean; loading: boolean; error: string; version: number }>('workspace-access', () => ({ identity: '', permissions: [], ready: false, loading: false, error: '', version: 0 }));
  const current = computed(() => state.value.identity === identity.value && state.value.ready);
  const loading = computed(() => state.value.identity === identity.value && state.value.loading);
  const error = computed(() => state.value.identity === identity.value ? state.value.error : '');
  async function refresh() {
    const requestedIdentity = identity.value;
    if (state.value.identity === requestedIdentity && state.value.loading) return;
    const version = state.value.version + 1;
    state.value = { identity: requestedIdentity, permissions: [], ready: false, loading: Boolean(session.token.value), error: '', version };
    if (!session.token.value) return;
    try {
      const result = await $fetch<{ permissions: string[] }>('/auth/access', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.token.value}` }, timeout: 10000 });
      if (requestedIdentity !== identity.value || state.value.version !== version) return;
      if (!Array.isArray(result.permissions)) throw new Error('Invalid access response');
      state.value = { identity: requestedIdentity, permissions: result.permissions.filter(key => typeof key === 'string'), ready: true, loading: false, error: '', version };
    } catch {
      if (requestedIdentity === identity.value && state.value.version === version) state.value.error = 'Не удалось проверить права доступа.';
      // Role-based navigation remains usable; every API action is still server-authorized.
    } finally { if (requestedIdentity === identity.value && state.value.version === version) state.value.loading = false; }
  }
  function can(permission?: string) { return !permission || !current.value || state.value.permissions.includes(permission); }
  return { ready: current, loading, error, can, refresh };
}
