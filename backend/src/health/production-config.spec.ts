const { validate } = require('../../scripts/production-config-check.cjs');
function config() {
  return { JWT_SECRET: 'a'.repeat(64), JWT_REFRESH_SECRET: 'b'.repeat(64), INTEGRATION_ENCRYPTION_KEY: 'c'.repeat(64),
    DATABASE_URL: `postgresql://app:${'d'.repeat(64)}@postgres:5432/app`, REDIS_URL: `redis://:${'e'.repeat(64)}@redis:6379`,
    SITE_URL: 'https://example.invalid', PUBLIC_APP_URL: 'https://example.invalid', CORS_ORIGIN: 'https://example.invalid', TRUST_PROXY_HOPS: '1', API_DOCS_ENABLED: 'false' };
}
describe('Production configuration boundary', () => {
  it('accepts the generated production bundle configuration', () => expect(() => validate(config())).not.toThrow());
  it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'INTEGRATION_ENCRYPTION_KEY'])('rejects missing or weak %s', key => {
    expect(() => validate({ ...config(), [key]: '' })).toThrow(); expect(() => validate({ ...config(), [key]: 'changeme' })).toThrow();
  });
  it('rejects reused signing keys, HTTP, public docs and arbitrary proxy trust', () => {
    expect(() => validate({ ...config(), JWT_REFRESH_SECRET: config().JWT_SECRET })).toThrow('independent');
    expect(() => validate({ ...config(), SITE_URL: 'http://example.invalid' })).toThrow('HTTPS');
    expect(() => validate({ ...config(), API_DOCS_ENABLED: 'true' })).toThrow('disabled');
    expect(() => validate({ ...config(), TRUST_PROXY_HOPS: 'true' })).toThrow('one private reverse proxy');
  });
  it('rejects weak storage passwords and cross-origin configuration', () => {
    expect(() => validate({ ...config(), DATABASE_URL: 'postgresql://app:weak@postgres/app' })).toThrow('Database password');
    expect(() => validate({ ...config(), REDIS_URL: 'redis://:weak@redis' })).toThrow('Redis password');
    expect(() => validate({ ...config(), CORS_ORIGIN: '*' })).toThrow('CORS_ORIGIN');
    expect(() => validate({ ...config(), PUBLIC_APP_URL: 'https://other.invalid' })).toThrow('PUBLIC_APP_URL');
  });
  it.each(['WB_FBS_AUTOPOLL_ENABLED', 'WB_FBS_ALLOW_SANDBOX_IMPORT'])('accepts explicit boolean %s and rejects typos', key => {
    expect(() => validate({ ...config(), [key]: 'false' })).not.toThrow();
    expect(() => validate({ ...config(), [key]: 'true' })).not.toThrow();
    expect(() => validate({ ...config(), [key]: 'yes' })).toThrow(`${key} must be true or false`);
  });
});
