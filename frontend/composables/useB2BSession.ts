import { browserSession } from '~/shared/browser-session';
type B2BUser = { id: string; email: string; phone?: string | null; firstName?: string | null; lastName?: string | null; role: string; avatarUrl?: string | null; forcePasswordChange?: boolean };
type B2BOrganization = { id: string; name: string; status: string; role: string; canOrder: boolean; canSeeFinance: boolean; canUseSalon: boolean };
const keys = { token: 'sarkisian-b2b-token', refresh: 'sarkisian-b2b-refresh', user: 'sarkisian-b2b-user' };
// Nuxt returns a new toRef wrapper on each useState call. Coalesce by app identity,
// which is stable across components and isolated across SSR requests.
const refreshes = new WeakMap<object, Promise<boolean>>();
const restores = new WeakMap<object, Promise<B2BUser | null>>();
const statusOf = (error: any) => Number(error?.response?.status || error?.statusCode || error?.status || 0);

export function useB2BSession() {
  const sessionApp = useNuxtApp();
  const config = useRuntimeConfig();
  const token = useState<string>('b2b-token', () => '');
  const refreshToken = useState<string>('b2b-refresh', () => '');
  const user = useState<B2BUser | null>('b2b-user', () => null);
  const hydrated = useState<boolean>('b2b-hydrated', () => false);
  const generation = useState<number>('b2b-session-generation', () => 0);
  const logoutWarning = useState<string>('b2b-logout-warning', () => '');
  const organizations = useState<B2BOrganization[]>('b2b-organizations', () => []);
  const selectedOrganizationId = useState<string>('b2b-organization', () => '');
  const organizationRevision = useState<number>('b2b-organization-revision', () => 0);
  const organizationUser = useState<string>('b2b-organization-user', () => '');
  const organizationSelectionRequired = useState<boolean>('b2b-organization-selection-required', () => false);
  const branding = useState<any>('salon-branding', () => null);
  const organizationStorageKey = () => `sarkisian-b2b-organization:${user.value?.id || ''}`;
  function resetOrganizations() { organizations.value = []; selectedOrganizationId.value = ''; organizationUser.value = ''; organizationSelectionRequired.value = false; organizationRevision.value++; branding.value = null; }
  function selectOrganization(id: string) {
    if (id && !organizations.value.some(item => item.id === id)) throw new Error('Нет доступа к выбранной организации');
    organizationSelectionRequired.value = !id;
    if (selectedOrganizationId.value === id) return;
    selectedOrganizationId.value = id; organizationRevision.value++; branding.value = null;
    if (import.meta.client && user.value?.id) id ? localStorage.setItem(organizationStorageKey(), id) : localStorage.removeItem(organizationStorageKey());
  }
  async function loadOrganizations(force = false) {
    if (!user.value?.id) return [];
    if (!force && organizationUser.value === user.value.id) return organizations.value;
    const currentUser = user.value.id;
    const rows = await request<B2BOrganization[]>('/b2b/organizations');
    if (user.value?.id !== currentUser) return [];
    organizations.value = rows; organizationUser.value = currentUser;
    const remembered = import.meta.client ? localStorage.getItem(organizationStorageKey()) || '' : '';
    const lostSelection = Boolean(selectedOrganizationId.value) || organizationSelectionRequired.value;
    const selected = rows.some(item => item.id === selectedOrganizationId.value) ? selectedOrganizationId.value
      : lostSelection ? '' : rows.some(item => item.id === remembered) ? remembered : rows.length === 1 ? rows[0].id : '';
    selectOrganization(selected); return rows;
  }
  const browser = browserSession<B2BUser>(sessionApp, 'sarkisian-b2b-session', keys,
    () => ({ token: token.value, refreshToken: refreshToken.value, user: user.value }),
    (value, initial) => {
      const nextUser = value.user?.role === 'CUSTOMER_B2B' ? value.user : null;
      const valid = !value.user || Boolean(nextUser), nextToken = valid ? value.token : '', nextRefresh = valid ? value.refreshToken : '';
      if (!initial && (user.value?.id !== nextUser?.id || (!nextToken && !nextRefresh))) {
        generation.value++; resetOrganizations(); refreshes.delete(sessionApp); restores.delete(sessionApp);
      }
      token.value = nextToken; refreshToken.value = nextRefresh; user.value = nextUser;
    });
  const syncStoredSession = () => import.meta.client ? browser.sync() : false;
  function persist(force = false, expectedRefresh?: string) { return import.meta.client ? browser.persist(force, expectedRefresh) : true; }
  function hydrate() { if (!import.meta.client || hydrated.value) return; browser.sync(true); hydrated.value = true; }
  async function login(email: string, password: string) {
    hydrate(); syncStoredSession();
    const actor = generation.value;
    const result = await $fetch<any>('/auth/login', { baseURL: config.public.apiBase, method: 'POST', body: { email, password }, timeout: 15000, retry: 0 });
    syncStoredSession();
    if (generation.value !== actor) throw new Error('Сессия изменилась. Повторите вход.');
    if (result.user.role !== 'CUSTOMER_B2B') throw new Error('Для этой учётной записи предназначен другой кабинет');
    adoptSession(result, actor); return result.user;
  }
  function adoptSession(result: { user: B2BUser; accessToken: string; refreshToken: string }, expectedGeneration?: number) {
    hydrate(); syncStoredSession();
    if (expectedGeneration !== undefined && generation.value !== expectedGeneration) throw new Error('Сессия изменилась. Войдите в созданный бизнес-аккаунт отдельно.');
    if (result.user?.role !== 'CUSTOMER_B2B' || !result.accessToken || !result.refreshToken) throw new Error('Требуется отдельная бизнес-учётная запись');
    generation.value++;
    resetOrganizations();
    refreshes.delete(sessionApp); restores.delete(sessionApp);
    token.value = result.accessToken; refreshToken.value = result.refreshToken; user.value = result.user;
    logoutWarning.value = ''; hydrated.value = true; persist(true);
  }
  function logout(explicit = true) {
    if (!explicit && syncStoredSession()) return;
    generation.value++;
    token.value = ''; refreshToken.value = ''; user.value = null;
    resetOrganizations();
    refreshes.delete(sessionApp); restores.delete(sessionApp); persist(explicit);
  }
  async function refresh() {
    syncStoredSession();
    const pending = refreshes.get(sessionApp);
    if (pending) return pending;
    const actor = generation.value, initialRefresh = refreshToken.value;
    if (!initialRefresh) { logout(false); return false; }
    const work = browser.locked(async () => {
      try {
        syncStoredSession();
        if (generation.value !== actor) return false;
        if (refreshToken.value !== initialRefresh) return Boolean(token.value);
        const result = await $fetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
          baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: initialRefresh }, timeout: 10000, retry: 0,
        });
        syncStoredSession();
        if (generation.value !== actor) return false;
        if (refreshToken.value !== initialRefresh) return Boolean(token.value);
        if (!result?.accessToken || !result?.refreshToken) throw new Error('Сервер не вернул данные сессии. Повторите попытку.');
        token.value = result.accessToken; refreshToken.value = result.refreshToken;
        // Save rotation before another request: a temporary outage must not lose it.
        persist(false, initialRefresh); return generation.value === actor && Boolean(token.value);
      } catch (error) {
        syncStoredSession();
        if (generation.value === actor && refreshToken.value !== initialRefresh && token.value) return true;
        if (generation.value === actor && refreshToken.value === initialRefresh && [401, 403].includes(statusOf(error))) logout(false);
        throw error;
      }
    });
    refreshes.set(sessionApp, work);
    try { return await work; } finally { if (refreshes.get(sessionApp) === work) refreshes.delete(sessionApp); }
  }
  async function request<T = any>(path: string, options: any = {}): Promise<T> {
    const beforeSync = generation.value; syncStoredSession();
    if (generation.value !== beforeSync) throw new Error('Сессия изменилась в другой вкладке. Повторите действие.');
    const actor = generation.value, initialToken = token.value;
    const businessRequest = path.startsWith('/b2b/') && path !== '/b2b/organizations';
    const organization = selectedOrganizationId.value, revision = organizationRevision.value;
    const send = () => {
      if (businessRequest && organizationUser.value === user.value?.id && !organization) throw new Error('Выберите организацию перед продолжением работы');
      if (businessRequest && organizationRevision.value !== revision) throw new Error('Организация изменилась. Повторите действие в выбранном кабинете.');
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token.value}`);
      headers.delete('X-B2B-Organization-Id');
      if (businessRequest && organization) headers.set('X-B2B-Organization-Id', organization);
      return $fetch<T>(path, { baseURL: config.public.apiBase, timeout: 20000, retry: 0, ...options, headers }).then(result => {
        syncStoredSession();
        if (generation.value !== actor) throw new Error('Сессия изменилась. Повторите действие в текущем кабинете.');
        if (businessRequest && organizationRevision.value !== revision) throw new Error('Организация изменилась. Данные предыдущей организации не загружены.');
        return result;
      });
    };
    try { return await send(); }
    catch (error) {
      if (statusOf(error) !== 401 || generation.value !== actor || options.signal?.aborted) throw error;
      syncStoredSession();
      if (generation.value !== actor) throw error;
      // A concurrent request may already have rotated the session.
      if (token.value === initialToken && !(await refresh())) throw error;
      if (generation.value !== actor || !token.value) throw error;
      return send();
    }
  }
  async function restore(): Promise<B2BUser | null> {
    syncStoredSession();
    const pending = restores.get(sessionApp);
    if (pending) return pending;
    if (!token.value && !refreshToken.value) return null;
    const actor = generation.value;
    const work = (async () => {
      try {
        if (!token.value && !(await refresh())) return null;
        const account = await request<B2BUser>('/auth/me');
        syncStoredSession();
        if (generation.value !== actor) return user.value;
        if (account?.role !== 'CUSTOMER_B2B') { logout(false); return null; }
        user.value = account; persist(); return account;
      } catch (error) {
        if (generation.value !== actor) return user.value;
        if ([401, 403].includes(statusOf(error))) { logout(false); return null; }
        // Offline/5xx is recoverable; keep credentials and offer retry on screen.
        throw error;
      }
    })();
    restores.set(sessionApp, work);
    try { return await work; } finally { if (restores.get(sessionApp) === work) restores.delete(sessionApp); }
  }
  async function endSession() {
    const actor = generation.value;
    let revoked = !token.value;
    try {
      if (token.value) revoked = (await request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', timeout: 10000 }))?.loggedOut === true;
    } catch { /* Local sign-out is available offline. */ }
    finally {
      syncStoredSession();
      if (generation.value === actor) {
        logout();
        logoutWarning.value = revoked ? '' : 'Вы вышли на этом устройстве. Сервер не подтвердил завершение сессии. Проверьте активные сессии в профиле после восстановления связи.';
      }
    }
    return { revoked };
  }
  return { token, refreshToken, user, hydrated, generation, logoutWarning, syncStoredSession, storageKey: browser.storageKey, organizations, selectedOrganizationId, organizationRevision, loadOrganizations, selectOrganization, adoptSession, hydrate, persist, login, restore, refresh, request, logout, endSession };
}
