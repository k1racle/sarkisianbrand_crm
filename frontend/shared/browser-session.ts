export type BrowserSessionValue<User> = { token: string; refreshToken: string; user: User | null };
type SessionKeys = { token: string; refresh: string; user: string };
type SessionStorageValue<User> = { value: BrowserSessionValue<User>; revision: string };
const browserSessions = new WeakMap<object, Map<string, ReturnType<typeof makeBrowserSession<any>>>>();
let browserSessionRevision = 0;
function nextSessionRevision() {
  // This is an event marker, never an authentication secret. Keep repeated
  // empty tombstones distinct even on LAN browsers without randomUUID.
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    if (typeof globalThis.crypto?.getRandomValues === 'function') return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
  } catch { /* Storage event identity also works without a secure context. */ }
  return `${Date.now().toString(36)}-${(++browserSessionRevision).toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readStored<User>(name: string, keys: SessionKeys): SessionStorageValue<User> | null {
  try {
    const envelope = localStorage.getItem(name);
    if (envelope !== null) {
      const row = JSON.parse(envelope);
      if (row.version !== 1 || typeof row.token !== 'string' || typeof row.refreshToken !== 'string' || (row.user !== null && (typeof row.user !== 'object' || typeof row.user.id !== 'string'))) return null;
      return { value: { token: row.token, refreshToken: row.refreshToken, user: row.user }, revision: envelope };
    }
    // Legacy keys remain readable for existing installations and injected sessions.
    for (let attempt = 0; attempt < 3; attempt++) {
      const first = [localStorage.getItem(keys.token), localStorage.getItem(keys.refresh), localStorage.getItem(keys.user)];
      const second = [localStorage.getItem(keys.token), localStorage.getItem(keys.refresh), localStorage.getItem(keys.user)];
      if (JSON.stringify(first) === JSON.stringify(second)) return { value: { token: first[0] || '', refreshToken: first[1] || '', user: first[2] ? JSON.parse(first[2]) : null }, revision: JSON.stringify(first) };
    }
  } catch { /* Unavailable or malformed storage never overwrites live state. */ }
  return null;
}
function makeBrowserSession<User>(name: string, keys: SessionKeys, get: () => BrowserSessionValue<User>, adopt: (value: BrowserSessionValue<User>, initial: boolean) => void) {
  let observed: string | undefined;
  function sync(initial = false) {
    const row = readStored<User>(name, keys);
    if (!row || (!initial && observed === undefined) || row.revision === observed) return false;
    observed = row.revision; adopt(row.value, initial); return true;
  }
  function persist(force = false, expectedRefresh?: string) {
    const row = readStored<User>(name, keys);
    const current = get();
    const expectedPair = expectedRefresh !== undefined && row?.value.refreshToken === expectedRefresh && (row.value.user as any)?.id === (current.user as any)?.id;
    if (!force && row && observed !== undefined && row.revision !== observed && !expectedPair) { sync(); return false; }
    if (!force && row && JSON.stringify(row.value) === JSON.stringify(current)) { observed = row.revision; return true; }
    const value = get();
    const envelope = JSON.stringify({ version: 1, revision: nextSessionRevision(), ...value });
    // Publish a coherent pair atomically, including a logout tombstone. Legacy
    // mirrors are for older readers and are never preferred to this envelope.
    localStorage.setItem(name, envelope); observed = envelope;
    value.token ? localStorage.setItem(keys.token, value.token) : localStorage.removeItem(keys.token);
    value.refreshToken ? localStorage.setItem(keys.refresh, value.refreshToken) : localStorage.removeItem(keys.refresh);
    value.user ? localStorage.setItem(keys.user, JSON.stringify(value.user)) : localStorage.removeItem(keys.user);
    return true;
  }
  async function locked<T>(action: () => Promise<T>): Promise<T> {
    // Web Locks serialize refreshes across tabs/windows in HTTPS/localhost.
    // Plain HTTP LAN falls back to bounded storage synchronization, not a fake mutex.
    if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(name + ':refresh', action);
    return action();
  }
  return { sync, persist, locked, storageKey: name };
}
export function browserSession<User>(app: object, name: string, keys: SessionKeys, get: () => BrowserSessionValue<User>, adopt: (value: BrowserSessionValue<User>, initial: boolean) => void) {
  let sessions = browserSessions.get(app);
  if (!sessions) { sessions = new Map(); browserSessions.set(app, sessions); }
  if (!sessions.has(name)) sessions.set(name, makeBrowserSession(name, keys, get, adopt));
  return sessions.get(name)! as ReturnType<typeof makeBrowserSession<User>>;
}
