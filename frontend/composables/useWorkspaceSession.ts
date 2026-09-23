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

export function useWorkspaceSession() {
  const config = useRuntimeConfig();
  const token = useState<string>('workspace-token', () => '');
  const refreshToken = useState<string>('workspace-refresh-token', () => '');
  const user = useState<WorkspaceUser | null>('workspace-user', () => null);
  const hydrated = useState<boolean>('workspace-hydrated', () => false);
  const logoutWarning = useState<string>('workspace-logout-warning', () => '');

  function hydrate() {
    if (!import.meta.client || hydrated.value) return;
    token.value = localStorage.getItem(storageKeys.token) || '';
    refreshToken.value = localStorage.getItem(storageKeys.refresh) || '';
    const storedUser = localStorage.getItem(storageKeys.user);
    if (storedUser) {
      try { user.value = JSON.parse(storedUser); } catch { localStorage.removeItem(storageKeys.user); }
    }
    hydrated.value = true;
  }

  function persist() {
    if (!import.meta.client) return;
    token.value ? localStorage.setItem(storageKeys.token, token.value) : localStorage.removeItem(storageKeys.token);
    refreshToken.value ? localStorage.setItem(storageKeys.refresh, refreshToken.value) : localStorage.removeItem(storageKeys.refresh);
    user.value ? localStorage.setItem(storageKeys.user, JSON.stringify(user.value)) : localStorage.removeItem(storageKeys.user);
  }

  async function login(email: string, password: string) {
    const result = await $fetch<{ accessToken: string; refreshToken: string; user: WorkspaceUser }>('/auth/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { email, password },
    });
    const internalRoles = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'CURATOR', 'WAREHOUSE'];
    if (!internalRoles.includes(result.user.role)) throw new Error('Для этой учётной записи предназначен клиентский кабинет');
    token.value = result.accessToken;
    refreshToken.value = result.refreshToken;
    user.value = result.user;
    logoutWarning.value = '';
    persist();
    return result.user;
  }

  async function restoreUser() {
    if (!token.value) return null;
    const initialToken = token.value, initialRefresh = refreshToken.value;
    let issuedToken = '';
    try {
      const account = await $fetch<WorkspaceUser>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${initialToken}` }, timeout: 10000 });
      if (token.value !== initialToken || refreshToken.value !== initialRefresh) return user.value;
      user.value = account;
      persist();
      return user.value;
    } catch {
      if (token.value !== initialToken || refreshToken.value !== initialRefresh) return user.value;
      if (!initialRefresh) { logout(); return null; }
      try {
        const refreshed = await $fetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: initialRefresh }, timeout: 10000, retry: 0 });
        if (token.value !== initialToken || refreshToken.value !== initialRefresh) return user.value;
        if (!refreshed?.accessToken || !refreshed?.refreshToken) throw new Error('Invalid session response');
        issuedToken = refreshed.accessToken;
        token.value = refreshed.accessToken;
        refreshToken.value = refreshed.refreshToken;
        const account = await $fetch<WorkspaceUser>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${issuedToken}` }, timeout: 10000 });
        if (token.value !== issuedToken) return user.value;
        user.value = account;
        persist();
        return user.value;
      } catch { if (token.value === initialToken || (issuedToken && token.value === issuedToken)) logout(); return user.value; }
    }
  }

  function logout() {
    token.value = '';
    refreshToken.value = '';
    user.value = null;
    persist();
  }

  async function endSession() {
    const actorToken = token.value;
    let revoked = !actorToken;
    try {
      if (actorToken) {
        const response = await $fetch<{ loggedOut: boolean }>('/auth/logout', {
          baseURL: config.public.apiBase, method: 'POST', timeout: 10000, retry: 0,
          headers: { Authorization: `Bearer ${actorToken}` },
        });
        revoked = response?.loggedOut === true;
      }
    } catch { /* Local sign-out still works offline, but is not reported as server revocation. */ }
    finally {
      if (token.value === actorToken) {
        logout();
        logoutWarning.value = revoked ? '' : 'Вы вышли на этом устройстве. Сервер не подтвердил отзыв сессии. Когда связь восстановится, войдите и завершите прежнюю сессию в своём профиле.';
      }
    }
    return { revoked };
  }

  return { token, refreshToken, user, hydrated, logoutWarning, hydrate, persist, login, restoreUser, logout, endSession };
}
