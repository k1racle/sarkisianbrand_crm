export const apiProxyEnabled = (value: unknown) => value === true || value === 'true';

export function browserApiBase(configured: string, pageOrigin: string, proxyEnabled: unknown): string {
  return apiProxyEnabled(proxyEnabled) ? `${pageOrigin}/api/v1` : configured;
}

export function browserRealtimeOrigin(apiBase: string, pageOrigin: string, proxyEnabled: unknown, port: string): string {
  if (!apiProxyEnabled(proxyEnabled)) return apiBase.replace(/\/api\/v1\/?$/, '');
  const origin = new URL(pageOrigin);
  if (port) origin.port = port;
  return origin.origin;
}
