export type LiveJoin = { url: string; token: string; room: string; role: 'host' | 'viewer'; expiresIn: number };

/** Never send a room token to an address not explicitly configured by the site. */
export function validateLiveJoin(value: unknown, role: 'host' | 'viewer', sessionId: string, allowedOrigin: unknown): LiveJoin {
  const invalid = () => new Error('Адрес видеосервера не подтверждён. Обратитесь в поддержку.');
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof allowedOrigin !== 'string' || !allowedOrigin) throw invalid();
  const data = value as Record<string, unknown>;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId) || data.role !== role || data.room !== `lms-${sessionId}` || typeof data.url !== 'string' || typeof data.token !== 'string' || data.token.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.token) || typeof data.expiresIn !== 'number' || !Number.isInteger(data.expiresIn) || data.expiresIn < 1 || data.expiresIn > 60) throw invalid();
  let expected: URL, actual: URL;
  try { expected = new URL(allowedOrigin); actual = new URL(data.url); } catch { throw invalid(); }
  const allowed = (url: URL) => url.protocol === 'wss:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && (!url.port || url.port === '443');
  if (!allowed(expected) || !allowed(actual) || actual.origin !== expected.origin) throw invalid();
  return { url: actual.origin, token: data.token, room: data.room, role, expiresIn: data.expiresIn };
}
