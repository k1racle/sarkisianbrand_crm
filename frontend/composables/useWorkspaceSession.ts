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
    persist();
    return result.user;
  }

  async function restoreUser() {
    if (!token.value) return null;
    try {
      user.value = await $fetch<WorkspaceUser>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` } });
      persist();
      return user.value;
    } catch {
      if (!refreshToken.value) { logout(); return null; }
      try {
        const refreshed = await $fetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: refreshToken.value } });
        token.value = refreshed.accessToken;
        refreshToken.value = refreshed.refreshToken;
        user.value = await $fetch<WorkspaceUser>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` } });
        persist();
        return user.value;
      } catch { logout(); return null; }
    }
  }

  function logout() {
    token.value = '';
    refreshToken.value = '';
    user.value = null;
    persist();
  }

  return { token, refreshToken, user, hydrated, hydrate, persist, login, restoreUser, logout };
}
