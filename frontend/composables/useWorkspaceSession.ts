import { browserSession } from '~/shared/browser-session';
export type WorkspaceUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  phone?: string | null;
  isActive?: boolean;
  avatarUrl?: string | null;
  timezone?: string;
  city?: string | null;
  country?: string | null;
  forcePasswordChange?: boolean;
};

const storageKeys = {
  token: 'sarkisian-workspace-token',
  refresh: 'sarkisian-workspace-refresh',
  user: 'sarkisian-workspace-user',
};
const internalRoles = new Set(['ADMIN', 'CONTENT_MANAGER', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'CURATOR', 'WAREHOUSE']);
type WorkspaceFlight<T> = { generation: number; promise: Promise<T> };
const workspaceRefreshes = new WeakMap<object, WorkspaceFlight<boolean>>();
const workspaceRestores = new WeakMap<object, WorkspaceFlight<WorkspaceUser | null>>();
const workspaceStatus = (error: any) => Number(error?.response?.status || error?.statusCode || error?.status || 0);

export function useWorkspaceSession() {
  const config = useRuntimeConfig();
  const app = useNuxtApp();
  const token = useState<string>('workspace-token', () => '');
  const refreshToken = useState<string>('workspace-refresh-token', () => '');
  const user = useState<WorkspaceUser | null>('workspace-user', () => null);
  const hydrated = useState<boolean>('workspace-hydrated', () => false);
  const logoutWarning = useState<string>('workspace-logout-warning', () => '');
  const generation = useState<number>('workspace-session-generation', () => 0);
  const sessionError = useState<string>('workspace-session-error', () => '');
  const browser = browserSession<WorkspaceUser>(app, 'sarkisian-workspace-session', storageKeys,
    () => ({ token: token.value, refreshToken: refreshToken.value, user: user.value }),
    (value, initial) => {
      const nextUser = value.user && internalRoles.has(value.user.role) ? value.user : null;
      const valid = !value.user || Boolean(nextUser);
      const nextToken = valid ? value.token : '', nextRefresh = valid ? value.refreshToken : '';
      if (!initial && (user.value?.id !== nextUser?.id || (!nextToken && !nextRefresh))) {
        generation.value++; workspaceRefreshes.delete(app); workspaceRestores.delete(app);
      }
      token.value = nextToken; refreshToken.value = nextRefresh; user.value = nextUser;
      sessionError.value = '';
    });
  const syncStoredSession = () => import.meta.client ? browser.sync() : false;

  function hydrate() {
    if (!import.meta.client || hydrated.value) return;
    browser.sync(true);
    hydrated.value = true;
  }

  function persist(force = false, expectedRefresh?: string) { return import.meta.client ? browser.persist(force, expectedRefresh) : true; }

  async function login(email: string, password: string) {
    hydrate(); syncStoredSession();
    const actor = generation.value;
    const result = await $fetch<{ accessToken: string; refreshToken: string; user: WorkspaceUser }>('/auth/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { email, password },
    });
    syncStoredSession();
    if (generation.value !== actor) throw new Error('Сессия изменилась. Повторите вход.');
    if (!internalRoles.has(result.user.role)) throw new Error('Для этой учётной записи предназначен клиентский кабинет');
    generation.value++;
    workspaceRefreshes.delete(app); workspaceRestores.delete(app);
    token.value = result.accessToken;
    refreshToken.value = result.refreshToken;
    user.value = result.user;
    logoutWarning.value = '';
    sessionError.value = '';
    hydrated.value = true; persist(true);
    return result.user;
  }

  async function refresh() {
    syncStoredSession();
    const actor = generation.value, pending = workspaceRefreshes.get(app);
    if (pending?.generation === actor) return pending.promise;
    const initialRefresh = refreshToken.value;
    if (!initialRefresh) { logout(false); return false; }
    const promise = browser.locked(async () => {
      try {
        syncStoredSession();
        if (generation.value !== actor) return false;
        if (refreshToken.value !== initialRefresh) return Boolean(token.value);
        const result = await $fetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: initialRefresh }, timeout: 10000, retry: 0 });
        syncStoredSession();
        if (generation.value !== actor) return false;
        if (refreshToken.value !== initialRefresh) return Boolean(token.value);
        if (!result?.accessToken || !result?.refreshToken) throw new Error('Не удалось обновить сессию. Повторите попытку.');
        token.value = result.accessToken; refreshToken.value = result.refreshToken;
        persist(false, initialRefresh); // Persist rotation even if the subsequent profile request fails.
        return generation.value === actor && Boolean(token.value);
      } catch (error) {
        syncStoredSession();
        if (generation.value === actor && refreshToken.value !== initialRefresh && token.value) return true;
        if (generation.value === actor && refreshToken.value === initialRefresh && [401, 403].includes(workspaceStatus(error))) logout(false);
        throw error;
      }
    });
    const flight = { generation: actor, promise }; workspaceRefreshes.set(app, flight);
    try { return await promise; } finally { if (workspaceRefreshes.get(app) === flight) workspaceRefreshes.delete(app); }
  }

  async function request<T = any>(path: string, options: any = {}): Promise<T> {
    const beforeSync = generation.value; syncStoredSession();
    if (generation.value !== beforeSync) throw new Error('Сессия изменилась в другой вкладке. Повторите действие.');
    const actor = generation.value, initialToken = token.value;
    const send = async () => {
      const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${token.value}`);
      const result = await $fetch<T>(path, { baseURL: config.public.apiBase, timeout: 10000, retry: 0, ...options, headers });
      syncStoredSession();
      if (generation.value !== actor) throw new Error('Сессия изменилась. Повторите действие.');
      return result;
    };
    try { return await send(); }
    catch (error) {
      if (workspaceStatus(error) !== 401 || generation.value !== actor || options.signal?.aborted) throw error;
      syncStoredSession();
      if (generation.value !== actor) throw error;
      if (token.value === initialToken && !(await refresh())) throw error;
      if (generation.value !== actor || !token.value) throw error;
      return send();
    }
  }

  async function restoreUser(): Promise<WorkspaceUser | null> {
    syncStoredSession();
    const actor = generation.value, pending = workspaceRestores.get(app);
    if (pending?.generation === actor) return pending.promise;
    if (!token.value && !refreshToken.value) return null;
    const promise = (async () => {
      try {
        if (!token.value && !(await refresh())) return null;
        const account = await request<WorkspaceUser>('/auth/me');
        syncStoredSession();
        if (generation.value !== actor) return user.value;
        if (!account || !internalRoles.has(account.role)) { logout(false); return null; }
        user.value = account; sessionError.value = ''; persist(); return account;
      } catch (error) {
        if (generation.value !== actor) return user.value;
        if ([401, 403].includes(workspaceStatus(error))) { logout(false); return null; }
        sessionError.value = 'Не удалось проверить сессию. Проверьте соединение и повторите попытку.';
        throw error;
      }
    })();
    const flight = { generation: actor, promise }; workspaceRestores.set(app, flight);
    try { return await promise; } finally { if (workspaceRestores.get(app) === flight) workspaceRestores.delete(app); }
  }

  function logout(explicit = true) {
    // An authentication failure from an old request cannot erase a newer pair.
    // A deliberate sign-out does publish a tombstone even after same-user rotation.
    if (!explicit && syncStoredSession()) return;
    generation.value++;
    workspaceRefreshes.delete(app); workspaceRestores.delete(app);
    token.value = '';
    refreshToken.value = '';
    user.value = null;
    sessionError.value = '';
    persist(explicit);
  }

  async function endSession() {
    const actor = generation.value;
    let revoked = !token.value && !refreshToken.value;
    try {
      if (token.value || refreshToken.value) {
        const response = await request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', timeout: 10000 });
        revoked = response?.loggedOut === true;
      }
    } catch { /* Local sign-out still works offline, but is not reported as server revocation. */ }
    finally {
      syncStoredSession();
      if (generation.value === actor) {
        logout();
        logoutWarning.value = revoked ? '' : 'Вы вышли на этом устройстве. Сервер не подтвердил отзыв сессии. Когда связь восстановится, войдите и завершите прежнюю сессию в своём профиле.';
      }
    }
    return { revoked };
  }

  return { token, refreshToken, user, hydrated, generation, logoutWarning, sessionError, syncStoredSession, storageKey: browser.storageKey, hydrate, persist, login, refresh, request, restoreUser, logout, endSession };
}
