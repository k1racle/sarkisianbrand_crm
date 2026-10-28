export default defineNuxtPlugin(async nuxtApp => {
  const session = useWorkspaceSession(), access = useWorkspaceAccess(), route = useRoute();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: { generation: number; promise: Promise<void> } | undefined;
  let disposed = false;
  const internal = () => /^\/(?:crm(?:\/|$|-)|workspace(?:\/|$|-)|admin-workspace(?:\/|$)|media-library(?:\/|$)|helpdesk(?:\/|$)|leadership(?:\/|$)|system-settings(?:\/|$))/.test(window.location.pathname);
  function expiresAt() {
    try {
      const encoded = session.token.value.split('.')[1];
      const value = Number(JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))).exp);
      return Number.isFinite(value) && value > 0 ? value * 1000 : null;
    } catch { return null; }
  }
  function clearTimer() { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
  function schedule(retry = false) {
    clearTimer();
    if (disposed || !internal() || document.visibilityState === 'hidden' || (!session.token.value && !session.refreshToken.value)) return;
    const expiry = expiresAt();
    const delay = retry ? 30000 : expiry ? Math.max(1000, expiry - Date.now() - 60000) : 60000;
    timer = setTimeout(() => { void verify(); }, Math.min(delay, 2147483647));
  }
  async function verify() {
    if (disposed || !internal()) { clearTimer(); return; }
    session.hydrate();
    session.syncStoredSession();
    if (!session.token.value && !session.refreshToken.value) { clearTimer(); return; }
    const actor = session.generation.value;
    if (active?.generation === actor) return active.promise;
    let retry = false;
    const promise = (async () => {
      try {
        // Fail closed while a resumed/expired session is checked. The boundary
        // keeps the same employee's draft hidden and inert until grants return.
        const permissions = access.refresh();
        const expiry = expiresAt();
        if ((!session.token.value || (expiry !== null && expiry - Date.now() <= 60000)) && !(await session.refresh())) return;
        const account = await session.restoreUser();
        await permissions;
        if (session.generation.value !== actor || !account) return;
        // Rotation can finish after the first permission response: bind again.
        await access.ensure();
        retry = !access.ready.value;
      } catch { retry = true; /* Outages preserve credentials and never replay writes. */ }
      finally {
        if (active === flight) {
          active = undefined;
          if (session.generation.value === actor) schedule(retry);
        }
      }
    })();
    const flight = { generation: actor, promise }; active = flight;
    return promise;
  }
  const resume = () => { if (document.visibilityState === 'hidden') clearTimer(); else void verify(); };
  const online = () => { void verify(); };
  const storage = (event: StorageEvent) => {
    if ((event.key === session.storageKey || event.key === null) && (session.hydrated.value || internal())) {
      const before = { token: session.token.value, refresh: session.refreshToken.value, generation: session.generation.value, role: session.user.value?.role };
      session.syncStoredSession();
      // Profile-only updates synchronize locally without making two visible
      // tabs trigger each other's /me requests. Identity/rotation still verifies.
      if (internal() && (before.token !== session.token.value || before.refresh !== session.refreshToken.value || before.generation !== session.generation.value || before.role !== session.user.value?.role)) void verify();
    }
  };
  const stopRoute = watch(() => route.fullPath, () => { if (internal()) void verify(); else clearTimer(); }, { flush: 'post' });
  const stopIdentity = watch(() => `${session.generation.value}:${session.token.value}`, () => schedule(), { flush: 'post' });
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', online);
  window.addEventListener('storage', storage);
  nuxtApp.vueApp.onUnmount(() => {
    disposed = true; clearTimer(); stopRoute(); stopIdentity();
    document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', online); window.removeEventListener('storage', storage);
  });
  // Guest and storefront routes never hydrate or refresh a staff login.
  await verify();
});
