const assert = require('node:assert/strict');
function validate(environment = process.env) {
  const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'INTEGRATION_ENCRYPTION_KEY'];
  for (const key of secrets) assert.match(environment[key] || '', /^[a-f0-9]{64,}$/i, `${key} must be at least 32 random bytes in hex`);
  assert.equal(new Set(secrets.map(key => environment[key])).size, secrets.length, 'Application secrets must be independent');
  const db = new URL(environment.DATABASE_URL || 'invalid:');
  const redis = new URL(environment.REDIS_URL || 'invalid:');
  assert.equal(db.protocol, 'postgresql:', 'DATABASE_URL must use postgresql');
  assert.ok(['redis:', 'rediss:'].includes(redis.protocol), 'REDIS_URL must use redis or rediss');
  assert.match(db.password, /^[a-f0-9]{64,}$/i, 'Database password must be at least 32 random bytes in hex');
  assert.match(redis.password, /^[a-f0-9]{64,}$/i, 'Redis password must be at least 32 random bytes in hex');
  const origin = new URL(environment.SITE_URL || 'invalid:');
  assert.equal(origin.protocol, 'https:', 'SITE_URL must use HTTPS');
  assert.equal(origin.origin, environment.SITE_URL, 'SITE_URL must be an origin with no path');
  assert.equal(environment.PUBLIC_APP_URL, origin.origin, 'PUBLIC_APP_URL must match SITE_URL');
  assert.equal(environment.CORS_ORIGIN, origin.origin, 'CORS_ORIGIN must match SITE_URL');
  assert.equal(environment.TRUST_PROXY_HOPS, '1', 'Production bundle expects exactly one private reverse proxy');
  assert.equal(environment.API_DOCS_ENABLED, 'false', 'Public API docs must be disabled');
  for (const key of ['WB_FBS_AUTOPOLL_ENABLED', 'WB_FBS_ALLOW_SANDBOX_IMPORT']) {
    assert.ok(['true', 'false'].includes(environment[key] ?? 'false'), `${key} must be true or false`);
  }
}
if (require.main === module) {
  try { validate(); } catch (error) { console.error(`Production configuration rejected: ${error.message.split('\n')[0]}`); process.exitCode = 1; }
}
module.exports = { validate };
