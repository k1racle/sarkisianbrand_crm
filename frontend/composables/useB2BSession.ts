type B2BUser = { id: string; email: string; phone?: string | null; firstName?: string | null; lastName?: string | null; role: string; avatarUrl?: string | null; forcePasswordChange?: boolean };
const keys = { token: 'sarkisian-b2b-token', refresh: 'sarkisian-b2b-refresh', user: 'sarkisian-b2b-user' };

export function useB2BSession() {
  const config = useRuntimeConfig();
  const token = useState<string>('b2b-token', () => '');
  const refreshToken = useState<string>('b2b-refresh', () => '');
  const user = useState<B2BUser | null>('b2b-user', () => null);
  const hydrated = useState<boolean>('b2b-hydrated', () => false);
  function persist() { if (!import.meta.client) return; token.value ? localStorage.setItem(keys.token, token.value) : localStorage.removeItem(keys.token); refreshToken.value ? localStorage.setItem(keys.refresh, refreshToken.value) : localStorage.removeItem(keys.refresh); user.value ? localStorage.setItem(keys.user, JSON.stringify(user.value)) : localStorage.removeItem(keys.user); }
  function hydrate() { if (!import.meta.client || hydrated.value) return; token.value = localStorage.getItem(keys.token) || ''; refreshToken.value = localStorage.getItem(keys.refresh) || ''; try { user.value = JSON.parse(localStorage.getItem(keys.user) || 'null'); } catch { user.value = null; } hydrated.value = true; }
  async function login(email: string, password: string) { const result = await $fetch<any>('/auth/login', { baseURL: config.public.apiBase, method: 'POST', body: { email, password } }); if (result.user.role !== 'CUSTOMER_B2B') throw new Error('Для этой учётной записи предназначен другой кабинет'); token.value = result.accessToken; refreshToken.value = result.refreshToken; user.value = result.user; persist(); return result.user; }
  async function restore() { if (!token.value) return null; try { user.value = await $fetch<any>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` } }); if (user.value?.role !== 'CUSTOMER_B2B') throw new Error('Неверный тип кабинета'); persist(); return user.value; } catch { logout(); return null; } }
  function logout() { token.value = ''; refreshToken.value = ''; user.value = null; persist(); }
  return { token, refreshToken, user, hydrated, hydrate, persist, login, restore, logout };
}
