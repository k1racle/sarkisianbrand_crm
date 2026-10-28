const path = require('node:path'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const { validate } = require('../backend/scripts/production-config-check.cjs');
function preflight(envFile = '.env.production', project) {
  const root = path.resolve(__dirname, '..');
  const config = JSON.parse(execFileSync('docker', ['compose', '--env-file', path.resolve(root, envFile), '-f', path.join(root, 'docker-compose.production.yml'), ...(project ? ['-p', project] : []), '--profile', 'tools', '--profile', 'edge', 'config', '--format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  validate(config.services.backend.environment);
  const migrationPassword = config.services.postgres.environment.POSTGRES_PASSWORD;
  assert.match(migrationPassword, /^[a-f0-9]{64,}$/i, 'DB_MIGRATION_PASSWORD must be at least 32 random bytes in hex');
  const app = config.services.backend.environment;
  const allSecrets = [app.JWT_SECRET, app.JWT_REFRESH_SECRET, app.INTEGRATION_ENCRYPTION_KEY, new URL(app.DATABASE_URL).password, new URL(app.REDIS_URL).password, migrationPassword];
  assert.equal(new Set(allSecrets).size, allSecrets.length, 'All storage, signing and encryption keys must be independent');
  for (const service of ['postgres', 'redis', 'backend', 'frontend']) assert.ok(!config.services[service].ports?.length, `${service} must not publish host ports`);
  assert.equal(config.networks.data.internal, true, 'Storage network must be private');
  return config;
}
if (require.main === module) {
  try { preflight(process.argv[2], process.argv[3]); console.log('PASS production preflight: required independent secrets, HTTPS origin, private storage network and closed app ports'); }
  catch (error) { console.error(error.status ? 'Production Compose validation failed; no credentials printed' : error.message.split('\n')[0]); process.exitCode = 1; }
}
module.exports = { preflight };
