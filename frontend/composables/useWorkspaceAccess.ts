const workspaceAccessFlights = new WeakMap<object, { generation: number; promise: Promise<void> }>();
// Menu visibility is a convenience; the server remains authoritative for every action.
export function useWorkspaceAccess() {
  const session = useWorkspaceSession(), app = useNuxtApp();
  const identity = computed(() => `${session.user.value?.id || ''}:${session.token.value}`);
  const state = useState<{ identity: string; permissions: string[]; ready: boolean; loading: boolean; error: string; version: number }>('workspace-access', () => ({ identity: '', permissions: [], ready: false, loading: false, error: '', version: 0 }));
  const current = computed(() => state.value.identity === identity.value && state.value.ready);
  const loading = computed(() => state.value.identity === identity.value && state.value.loading);
  const error = computed(() => state.value.identity === identity.value ? state.value.error : '');
  async function refresh() {
    const actor = session.generation.value, pending = workspaceAccessFlights.get(app);
    if (pending?.generation === actor) return pending.promise;
    const version = state.value.version + 1;
    state.value = { identity: identity.value, permissions: [], ready: false, loading: Boolean(session.token.value || session.refreshToken.value), error: '', version };
    if (!session.token.value && !session.refreshToken.value) return;
    const promise = (async () => {
      try {
        // A rotation changes the identity marker. Recheck permissions under that
        // exact identity rather than relabel an old response with the new token.
        for (let attempt = 0; attempt < 3; attempt++) {
          const requestedIdentity = identity.value;
          state.value.identity = requestedIdentity; state.value.loading = true;
          const result = await session.request<{ permissions: string[] }>('/auth/access');
          if (session.generation.value !== actor || state.value.version !== version) return;
          if (requestedIdentity !== identity.value) continue;
          if (!Array.isArray(result.permissions) || result.permissions.some(key => typeof key !== 'string')) throw new Error('Invalid access response');
          state.value = { identity: requestedIdentity, permissions: result.permissions, ready: true, loading: false, error: '', version };
          return;
        }
        throw new Error('Session changed during access check');
      } catch {
        if (session.generation.value === actor && state.value.version === version) state.value = { identity: identity.value, permissions: [], ready: false, loading: false, error: 'Не удалось проверить права доступа. Проверьте соединение и повторите попытку.', version };
        // Offline or failed permission checks never grant a protected action.
      } finally {
        if (state.value.version === version) state.value.loading = false;
      }
    })();
    const flight = { generation: actor, promise }; workspaceAccessFlights.set(app, flight);
    try { await promise; } finally { if (workspaceAccessFlights.get(app) === flight) workspaceAccessFlights.delete(app); }
  }
  function can(permission?: string) { return !permission || (current.value && state.value.permissions.includes(permission)); }
  async function ensure() { if (!current.value) await refresh(); }
  return { ready: current, loading, error, can, refresh, ensure };
}
