/** Exact allowed frontend origins. Keep production closed without configuration.
 * CORS_ORIGIN is canonical; CORS_ORIGINS is accepted for older launch scripts.
 */
export function apiCorsOrigins(environment: Record<string, string | undefined> = process.env): string[] | false {
  const configured = environment.CORS_ORIGIN?.trim() || environment.CORS_ORIGINS?.trim();
  if (configured) return [...new Set(configured.split(',').map(value => value.trim()).filter(Boolean))];
  return environment.NODE_ENV === 'production' ? false : ['http://localhost:3001', 'http://127.0.0.1:3001'];
}
