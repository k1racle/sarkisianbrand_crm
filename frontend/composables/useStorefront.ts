type CustomerSession = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  avatarUrl?: string | null;
};

export function useStorefront() {
  const config = useRuntimeConfig();
  const accessToken = useCookie<string | null>('sb-customer-token', { sameSite: 'lax', default: () => null });
  const refreshToken = useCookie<string | null>('sb-customer-refresh', { sameSite: 'lax', default: () => null });
  const cartSession = useCookie<string>('sb-cart-session', {
    sameSite: 'lax',
    default: () => `web-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  const user = useState<CustomerSession | null>('storefront-user', () => null);
  const cart = useState<any | null>('storefront-cart', () => null);
  const authReady = useState('storefront-auth-ready', () => false);
  const favoriteIds = useState<string[]>('storefront-favorites', () => []);

  const authHeaders = computed(() => accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {});
  const cartCount = computed(() => (cart.value?.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0));

  async function loadCart() {
    cart.value = await $fetch('/cart', {
      baseURL: config.public.apiBase,
      headers: { 'x-cart-session': cartSession.value },
    });
    return cart.value;
  }

  async function addToCart(product: any, quantity = 1) {
    const variant = product?.variants?.find((item: any) => item.isActive !== false) || product?.variants?.[0];
    if (!variant) throw new Error('У товара нет доступного варианта');
    cart.value = await $fetch('/cart/items', {
      baseURL: config.public.apiBase,
      method: 'POST',
      headers: { 'x-cart-session': cartSession.value },
      body: { variantId: variant.id, quantity },
    });
    return cart.value;
  }

  async function loadMe() {
    if (!accessToken.value) {
      user.value = null;
      authReady.value = true;
      return null;
    }
    try {
      user.value = await $fetch<CustomerSession>('/auth/me', { baseURL: config.public.apiBase, headers: authHeaders.value });
    } catch {
      if (!refreshToken.value) return logout();
      try {
        const session = await $fetch<any>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: refreshToken.value } });
        accessToken.value = session.accessToken;
        refreshToken.value = session.refreshToken;
        user.value = await $fetch<CustomerSession>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.accessToken}` } });
      } catch {
        logout();
      }
    } finally {
      authReady.value = true;
    }
    return user.value;
  }

  function saveSession(session: any) {
    accessToken.value = session.accessToken;
    refreshToken.value = session.refreshToken;
    user.value = session.user;
    authReady.value = true;
  }

  async function login(email: string, password: string) {
    const session = await $fetch<any>('/auth/login', { baseURL: config.public.apiBase, method: 'POST', body: { email, password } });
    saveSession(session);
    await bindCart();
    return session;
  }

  async function register(payload: Record<string, string>) {
    const session = await $fetch<any>('/auth/register', { baseURL: config.public.apiBase, method: 'POST', body: payload });
    saveSession(session);
    await bindCart();
    return session;
  }

  async function bindCart() {
    if (!accessToken.value) return;
    try {
      cart.value = await $fetch('/storefront/cart/bind', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
      });
    } catch {
      // Старый backend может быть запущен во время hot reload — корзина останется гостевой.
    }
  }

  function logout() {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    authReady.value = true;
    return null;
  }

  function loadLocalFavorites() {
    if (!import.meta.client) return;
    try { favoriteIds.value = JSON.parse(localStorage.getItem('sb-favorites') || '[]'); } catch { favoriteIds.value = []; }
  }

  async function syncFavorites() {
    loadLocalFavorites();
    if (!accessToken.value) return favoriteIds.value;
    try {
      const remote = await $fetch<any[]>('/storefront/favorites', { baseURL: config.public.apiBase, headers: authHeaders.value });
      const remoteIds = remote.map((item) => item.productId);
      const missing = favoriteIds.value.filter((id) => !remoteIds.includes(id));
      await Promise.all(missing.map((id) => $fetch(`/storefront/favorites/${id}`, { baseURL: config.public.apiBase, method: 'POST', headers: authHeaders.value })));
      favoriteIds.value = [...new Set([...remoteIds, ...missing])];
      if (import.meta.client) localStorage.setItem('sb-favorites', JSON.stringify(favoriteIds.value));
    } catch {
      // Избранное остаётся доступным локально при временной недоступности API.
    }
    return favoriteIds.value;
  }

  function toggleFavorite(productId: string) {
    const removing = favoriteIds.value.includes(productId);
    favoriteIds.value = removing ? favoriteIds.value.filter((id) => id !== productId) : [...favoriteIds.value, productId];
    if (import.meta.client) localStorage.setItem('sb-favorites', JSON.stringify(favoriteIds.value));
    if (accessToken.value) $fetch(`/storefront/favorites/${productId}`, {
      baseURL: config.public.apiBase,
      method: removing ? 'DELETE' : 'POST',
      headers: authHeaders.value,
    }).catch(() => undefined);
  }

  return {
    accessToken, refreshToken, cartSession, user, cart, authReady, favoriteIds,
    authHeaders, cartCount, loadCart, addToCart, loadMe, login, register, logout,
    bindCart, loadLocalFavorites, syncFavorites, toggleFavorite,
  };
}
