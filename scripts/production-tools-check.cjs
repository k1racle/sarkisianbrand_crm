const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const { preflight } = require('./production-preflight.cjs');
const root = path.resolve(__dirname, '..'), parent = path.join(root, '.screenshots'), directory = path.join(parent, `production-tools-${crypto.randomUUID()}`);
fs.mkdirSync(path.join(directory, 'scripts'), { recursive: true });
try {
  fs.copyFileSync(path.join(root, 'scripts/init-production-env.cjs'), path.join(directory, 'scripts/init-production-env.cjs'));
  fs.copyFileSync(path.join(root, '.env.production.example'), path.join(directory, '.env.production.example'));
  const args = [path.join(directory, 'scripts/init-production-env.cjs'), 'release.example.invalid', 'release@example.invalid'];
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(first.status, 0);
  const envFile = path.join(directory, '.env.production'), original = fs.readFileSync(envFile, 'utf8');
  const second = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(second.status, 1); assert.ok(fs.readFileSync(envFile, 'utf8') === original, 'Existing environment must remain unchanged');
  const defaults = preflight(envFile).services.backend.environment;
  assert.equal(defaults.WB_FBS_AUTOPOLL_ENABLED, 'false');
  assert.equal(defaults.WB_FBS_ALLOW_SANDBOX_IMPORT, 'false');
  fs.writeFileSync(envFile, original.replace(/^WB_FBS_AUTOPOLL_ENABLED=false$/m, 'WB_FBS_AUTOPOLL_ENABLED=true').replace(/^WB_FBS_ALLOW_SANDBOX_IMPORT=false$/m, 'WB_FBS_ALLOW_SANDBOX_IMPORT=true'));
  const enabled = preflight(envFile).services.backend.environment;
  assert.equal(enabled.WB_FBS_AUTOPOLL_ENABLED, 'true', 'WB opt-in must reach backend');
  assert.equal(enabled.WB_FBS_ALLOW_SANDBOX_IMPORT, 'true', 'Sandbox opt-in must reach backend');
  fs.writeFileSync(envFile, original.replace(/^WB_FBS_AUTOPOLL_ENABLED=false$/m, 'WB_FBS_AUTOPOLL_ENABLED=yes'));
  assert.throws(() => preflight(envFile), /must be true or false/);
  fs.writeFileSync(envFile, original.replace(/^JWT_SECRET=.+$/m, 'JWT_SECRET=weak-private-test-value'));
  const rejected = spawnSync(process.execPath, [path.join(root, 'scripts/production-preflight.cjs'), envFile], { encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.ok(!rejected.stdout.includes('weak-private-test-value') && !rejected.stderr.includes('weak-private-test-value'));
  console.log('PASS production tools: independent random secrets, no existing env overwrite, compose preflight and secret-free weak-config rejection');
} finally {
  if (path.dirname(directory) !== parent || !/^production-tools-[a-f0-9-]+$/.test(path.basename(directory))) throw new Error('Unsafe test cleanup path');
  fs.rmSync(directory, { recursive: true, force: true });
}
