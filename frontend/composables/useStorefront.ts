type CustomerSession = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  avatarUrl?: string | null;
};

// Per Nuxt application, never shared across SSR requests or serialized into HTML.
const favoriteSyncFlights = new WeakMap<object, { token: string; ownerId: string; promise: Promise<string[]> }>();
const favoriteWrites = new WeakMap<object, Map<string, Promise<unknown>>>();
type FavoriteIntent = { method: 'POST' | 'DELETE'; id: string };

function favoriteIntentKey(ownerId: string) { return `sb-favorites-pending:${ownerId}`; }
function favoriteIntents(ownerId: string): Record<string, FavoriteIntent> {
  if (!import.meta.client) return {};
  const raw = localStorage.getItem(favoriteIntentKey(ownerId));
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Некорректная очередь избранного');
  const result: Record<string, FavoriteIntent> = Object.create(null);
  for (const [productId, intent] of Object.entries(parsed)) {
    const item = intent as FavoriteIntent;
    if (!/^[A-Za-z0-9-]{1,80}$/.test(productId) || !item || !['POST', 'DELETE'].includes(item.method) || typeof item.id !== 'string' || !item.id) throw new Error('Некорректная очередь избранного');
    result[productId] = { method: item.method, id: item.id };
  }
  return result;
}
function saveFavoriteIntents(ownerId: string, intents: Record<string, FavoriteIntent>) {
  if (import.meta.client) localStorage.setItem(favoriteIntentKey(ownerId), JSON.stringify(intents));
}
function setFavoriteIntent(ownerId: string, productId: string, method: FavoriteIntent['method']) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(productId)) throw new Error('Некорректный товар');
  const intents = favoriteIntents(ownerId), id = crypto.randomUUID();
  intents[productId] = { method, id };
  saveFavoriteIntents(ownerId, intents);
  return id;
}

export function useStorefront() {
  const config = useRuntimeConfig();
  const app = useNuxtApp();
  const accessToken = useCookie<string | null>('sb-customer-token', { sameSite: 'lax', default: () => null });
  const refreshToken = useCookie<string | null>('sb-customer-refresh', { sameSite: 'lax', default: () => null });
  const initialCartSession = useState<string>('storefront-cart-session-id', () => `web-${crypto.randomUUID()}`);
  const cartSession = useCookie<string>('sb-cart-session', {
    sameSite: 'lax',
    default: () => initialCartSession.value,
  });
  const user = useState<CustomerSession | null>('storefront-user', () => null);
  const cart = useState<any | null>('storefront-cart', () => null);
  const authReady = useState('storefront-auth-ready', () => false);
  const favoriteIds = useState<string[]>('storefront-favorites', () => []);
  const favoriteSyncError = useState('storefront-favorites-sync-error', () => false);

  const authHeaders = computed(() => accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {});
  const cartCount = computed(() => (cart.value?.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0));

  async function loadCart() {
    cart.value = await $fetch('/cart', {
      baseURL: config.public.apiBase,
      headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
    });
    return cart.value;
  }

  async function addToCart(product: any, quantity = 1, variantId?: string) {
    const variant = variantId ? product?.variants?.find((item: any) => item.id === variantId && item.isActive !== false) : product?.variants?.find((item: any) => item.isActive !== false && (product.productType === 'GIFT_CARD' || Number(item.stock) - Number(item.reserved || 0) >= quantity));
    if (!variant) throw new Error('У товара нет доступного варианта');
    cart.value = await $fetch('/cart/items', {
      baseURL: config.public.apiBase,
      method: 'POST',
      headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
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
    } catch (exception: any) {
      if (![401,403].includes(Number(exception?.statusCode || exception?.status))) return user.value;
      if (!refreshToken.value) return logout();
      try {
        const session = await $fetch<any>('/auth/refresh', { baseURL: config.public.apiBase, method: 'POST', body: { refreshToken: refreshToken.value } });
        accessToken.value = session.accessToken;
        refreshToken.value = session.refreshToken;
        user.value = await $fetch<CustomerSession>('/auth/me', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${session.accessToken}` } });
      } catch (exception: any) {
        if ([400,401,403].includes(Number(exception?.statusCode || exception?.status))) logout();
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
    } catch (exception) { throw exception; }
  }

  function logout() {
    const headers = { ...authHeaders.value };
    if (accessToken.value) $fetch('/auth/logout', { baseURL: config.public.apiBase, method: 'POST', headers }).catch(() => undefined);
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    cartSession.value = `web-${crypto.randomUUID()}`;
    cart.value = null;
    favoriteIds.value = [];
    favoriteSyncError.value = false;
    authReady.value = true;
    return null;
  }

  function loadLocalFavorites() {
    if (!import.meta.client) return;
    try { const stored = JSON.parse(localStorage.getItem(user.value ? `sb-favorites:${user.value.id}` : 'sb-favorites') || '[]'); favoriteIds.value = Array.isArray(stored) ? [...new Set<string>(stored.filter(id => typeof id === 'string'))] : []; } catch { favoriteIds.value = []; }
  }

  function favoriteWrite(productId: string, method: 'POST' | 'DELETE', token: string, ownerId: string, intentId: string) {
    let queue = favoriteWrites.get(app);
    if (!queue) { queue = new Map(); favoriteWrites.set(app, queue); }
    const key = `${ownerId}:${productId}`, previous = queue.get(key) || Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      // Queued work from a logged-out or switched account must never be sent.
      if (accessToken.value !== token || user.value?.id !== ownerId) return;
      if (favoriteIntents(ownerId)[productId]?.id !== intentId) return;
      await $fetch(`/storefront/favorites/${encodeURIComponent(productId)}`, { baseURL: config.public.apiBase, method, headers: { Authorization: `Bearer ${token}` } });
      if (accessToken.value !== token || user.value?.id !== ownerId) return;
      const pending = favoriteIntents(ownerId);
      if (pending[productId]?.id === intentId) { delete pending[productId]; saveFavoriteIntents(ownerId, pending); }
    });
    queue.set(key, operation);
    void operation.finally(() => { if (queue!.get(key) === operation) queue!.delete(key); }).catch(() => undefined);
    return operation;
  }

  async function syncFavorites() {
    const token = accessToken.value, ownerId = user.value?.id;
    if (token && !ownerId) { favoriteIds.value = []; favoriteSyncError.value = true; return favoriteIds.value; }
    if (!token) { loadLocalFavorites(); favoriteSyncError.value = false; return favoriteIds.value; }
    const existing = favoriteSyncFlights.get(app);
    if (existing && existing.token === token && existing.ownerId === ownerId) return existing.promise;
    const promise = (async () => {
      loadLocalFavorites();
      favoriteSyncError.value = false;
      try {
        // Replay the latest local intent after a network error or a previous logout.
        const pending = Object.entries(favoriteIntents(ownerId!));
        const local = new Set(favoriteIds.value);
        for (const [id, intent] of pending) { if (intent.method === 'DELETE') local.delete(id); else local.add(id); }
        favoriteIds.value = [...local];
        const initial = [...favoriteIds.value];
        if (import.meta.client) localStorage.setItem(`sb-favorites:${ownerId}`, JSON.stringify(favoriteIds.value));
        for (let offset = 0; offset < pending.length; offset += 4) {
          if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
          await Promise.all(pending.slice(offset, offset + 4).map(([id, intent]) => favoriteWrite(id, intent.method, token, ownerId!, intent.id)));
        }
        if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
        const pendingAtRead = favoriteIntents(ownerId!);
        const remote = await $fetch<any[]>('/storefront/favorites', { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token}` } });
        if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
        const remoteIds = remote.map((item) => item.productId);
        const remoteSet = new Set(remoteIds);
        const missing = favoriteIds.value.filter((id) => !remoteSet.has(id));
        // Keep large lists bounded; a click during sync is ordered per product.
        for (let offset = 0; offset < missing.length; offset += 4) {
          if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
          const batch = missing.slice(offset, offset + 4).filter(id => favoriteIds.value.includes(id));
          await Promise.all(batch.map(id => {
            const existing = favoriteIntents(ownerId!)[id];
            if (existing?.method === 'DELETE') return Promise.resolve();
            const intentId = existing?.id || setFavoriteIntent(ownerId!, id, 'POST');
            return favoriteWrite(id, 'POST', token, ownerId!, intentId);
          }));
        }
        if (accessToken.value !== token || user.value?.id !== ownerId) return favoriteIds.value;
        // Preserve clicks made while requests were in flight, especially a
        // deletion of an id also returned by the old remote snapshot.
        const current = [...favoriteIds.value], currentSet = new Set(current);
        const removed = new Set(initial.filter(id => !currentSet.has(id)));
        const pendingNow = favoriteIntents(ownerId!);
        for (const [id, intent] of [...Object.entries(pendingAtRead), ...Object.entries(pendingNow)]) if (intent.method === 'DELETE' && !currentSet.has(id)) removed.add(id);
        favoriteIds.value = [...new Set([...remoteIds.filter(id => !removed.has(id)), ...current])];
        if (import.meta.client) localStorage.setItem(`sb-favorites:${ownerId}`, JSON.stringify(favoriteIds.value));
      } catch {
        if (accessToken.value === token && user.value?.id === ownerId) favoriteSyncError.value = true;
      }
      return favoriteIds.value;
    })();
    favoriteSyncFlights.set(app, { token, ownerId: ownerId!, promise });
    try { return await promise; } finally { if (favoriteSyncFlights.get(app)?.promise === promise) favoriteSyncFlights.delete(app); }
  }

  function toggleFavorite(productId: string) {
    const removing = favoriteIds.value.includes(productId);
    const token = accessToken.value, ownerId = user.value?.id;
    let intentId: string | undefined;
    if (token && !ownerId) { favoriteSyncError.value = true; return; }
    if (token && ownerId) {
      // Persist the desired operation before the optimistic UI update. It has no
      // credentials and belongs only to this account's local storage namespace.
      try { intentId = setFavoriteIntent(ownerId, productId, removing ? 'DELETE' : 'POST'); }
      catch { favoriteSyncError.value = true; return; }
    }
    favoriteIds.value = removing ? favoriteIds.value.filter((id) => id !== productId) : [...favoriteIds.value, productId];
    if (import.meta.client) try { localStorage.setItem(user.value ? `sb-favorites:${user.value.id}` : 'sb-favorites', JSON.stringify(favoriteIds.value)); } catch { favoriteSyncError.value = true; }
    if (token && ownerId && intentId) void favoriteWrite(productId, removing ? 'DELETE' : 'POST', token, ownerId, intentId).catch(() => {
      if (accessToken.value === token && user.value?.id === ownerId) favoriteSyncError.value = true;
    });
  }

  return {
    accessToken, refreshToken, cartSession, user, cart, authReady, favoriteIds, favoriteSyncError,
    authHeaders, cartCount, loadCart, addToCart, loadMe, login, register, logout,
    bindCart, loadLocalFavorites, syncFavorites, toggleFavorite,
  };
}
