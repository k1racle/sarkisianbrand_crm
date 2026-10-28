/* Production packaging acceptance in a unique, disposable Compose project.
 * No host ports, no existing volumes, no seed, no external business operations.
 */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const { backup, verify, unpack } = require('./production-backup.cjs');
const { preflight } = require('./production-preflight.cjs');
const root = path.resolve(__dirname, '..'), reportDir = path.join(root, '.screenshots');
const project = `sb-release-check-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const envFile = path.join(reportDir, `${project}.env`);
fs.mkdirSync(reportDir, { recursive: true });
const settings = { COMPOSE_PROJECT_NAME: project, SITE_HOST: 'release.example.invalid', ACME_EMAIL: 'release@example.invalid' };
for (const name of ['DB_PASSWORD', 'DB_MIGRATION_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'INTEGRATION_ENCRYPTION_KEY']) settings[name] = crypto.randomBytes(32).toString('hex');
fs.writeFileSync(envFile, Object.entries(settings).map(([name, value]) => `${name}=${value}`).join('\n') + '\n', { mode: 0o600 });
const base = ['compose', '--env-file', envFile, '-f', 'docker-compose.production.yml', '-p', project];
function run(args, input) { return execFileSync('docker', args, { cwd: root, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 12 * 1024 * 1024 }); }
const compose = (args, input) => run([...base, ...args], input);
let phase = 'preflight';
async function main() {
  const checks = []; let backupPath, migrationCount;
  try {
    preflight(envFile, project);
    compose(['--profile', 'tools', '--profile', 'edge', 'config', '--quiet']);
    const config = JSON.parse(compose(['--profile', 'tools', '--profile', 'edge', 'config', '--format', 'json']));
    for (const service of ['postgres', 'redis', 'backend', 'frontend']) assert.equal(config.services[service].ports, undefined, `${service} must not publish a host port`);
    for (const service of ['backend', 'frontend', 'proxy']) { assert.equal(config.services[service].read_only, true); assert.ok(config.services[service].cap_drop.includes('ALL')); }
    phase = 'build production images';
    if (process.argv.includes('--build')) compose(['--profile', 'tools', '--profile', 'edge', 'build']);
    checks.push('Compose fail-closed secrets, read-only app filesystems, no DB/Redis/API/frontend host ports');
    phase = 'validate proxy configuration';
    run(['run', '--rm', '--network', 'none', '-e', `SITE_HOST=${settings.SITE_HOST}`, '-e', `ACME_EMAIL=${settings.ACME_EMAIL}`, config.services.proxy.image, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile']);
    phase = 'start database and Redis';
    compose(['up', '-d', '--wait', '--wait-timeout', '120', 'postgres', 'redis']);
    phase = 'deploy migrations';
    compose(['run', '--rm', 'migrations']);
    migrationCount = Number(compose(['exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'sarkisian_brand', '-Atc', 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL']));
    const expectedMigrations = fs.readdirSync(path.join(root, 'backend/prisma/migrations'), { withFileTypes: true }).filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, 'backend/prisma/migrations', entry.name, 'migration.sql'))).length;
    assert.equal(migrationCount, expectedMigrations, 'Migration image is stale; rebuild production targets before acceptance');
    const roles = JSON.parse(compose(['exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'sarkisian_brand', '-Atc', "SELECT json_build_object('superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole) FROM pg_roles WHERE rolname='sarkisian'"]));
    assert.deepEqual(roles, { superuser: false, createdb: false, createrole: false });
    checks.push(`${migrationCount} migrations deploy on an empty PostgreSQL database; separate non-superuser application role; proxy configuration validates offline`);
    phase = 'start application services';
    compose(['up', '-d', '--wait', '--wait-timeout', '180', 'backend', 'frontend']);
    phase = 'verify administrator and API';
    const credentials = { email: 'release-admin@example.invalid', password: 'Aa1!' + crypto.randomBytes(24).toString('hex') };
    compose(['exec', '-T', 'backend', 'node', 'scripts/bootstrap-admin.cjs'], JSON.stringify(credentials));
    assert.throws(() => compose(['exec', '-T', 'backend', 'node', 'scripts/bootstrap-admin.cjs'], JSON.stringify(credentials)), 'Bootstrap must not reset an existing administrator');
    const apiCheck = `const assert=require('node:assert/strict'),fs=require('fs');(async()=>{const credentials=JSON.parse(fs.readFileSync(0,'utf8'));const base='http://127.0.0.1:3000';for(const p of ['/api/v1/health/live','/api/v1/health/ready'])assert.equal((await fetch(base+p)).status,200);assert.equal((await fetch(base+'/docs')).status,404);const login=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});assert.equal(login.status,200);const session=await login.json();assert.equal(session.user.role,'ADMIN');const access=await fetch(base+'/api/v1/auth/access',{headers:{Authorization:'Bearer '+session.accessToken}});assert.equal(access.status,200);assert.ok((await access.json()).permissions.includes('system.manage'));assert.equal(process.getuid(),1000);fs.writeFileSync('/app/uploads/release-check.txt','uploads fixture');fs.writeFileSync('/app/private-crm-files/release-check.txt','private fixture');assert.throws(()=>fs.writeFileSync('/app/forbidden.txt','x'));console.log('PASS bootstrap/login/permissions, health/docs, non-root and persistent file permissions');})().catch(()=>process.exit(1));`;
    compose(['exec', '-T', 'backend', 'node', '-e', apiCheck], JSON.stringify(credentials));
    phase = 'verify frontend';
    const frontCheck = `(async()=>{const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),forbidden=new Set(['node-forge','listhen','simple-git','shell-quote','@nuxt/devtools','deepmerge']);function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(entry.name==='package.json'){const pkg=JSON.parse(fs.readFileSync(file));assert.ok(!forbidden.has(pkg.name));}else if(/\\.(?:js|cjs|mjs)$/.test(entry.name)){assert.ok(!fs.readFileSync(file,'utf8').includes('cloneUnlessOtherwiseSpecified'),'deepmerge code appears in production output');}}}scan('/app/.output');assert.equal(process.getuid(),1000);assert.equal((await fetch('http://127.0.0.1:3000/__health')).status,200);assert.equal((await fetch('http://127.0.0.1:3000/crm/login')).status,200);assert.equal((await fetch('http://127.0.0.1:3000/api/v1/health/ready')).status,200);console.log('PASS Nuxt health/login/API proxy and excluded build-time dependency tree');})().catch(()=>process.exit(1));`;
    compose(['exec', '-T', 'frontend', 'node', '-e', frontCheck]);
    checks.push('First admin creates once; real login and seeded permissions; both health checks; Nuxt API proxy; non-root + persistent file writes');
    const before = process.env.SARKISIAN_BACKUP_KEY;
    process.env.SARKISIAN_BACKUP_KEY = crypto.randomBytes(32).toString('hex');
    try {
      phase = 'check concurrent backup isolation';
      // Exercise two independent processes, not just two calls in one Node
      // event loop. The second must fail before touching the running stack.
      const lockName = `sarkisian-backup-lock-${crypto.createHash('sha256').update(project).digest('hex').slice(0, 24)}`;
      const child = spawn(process.execPath, [path.join(root, 'scripts/production-backup.cjs'), 'backup', envFile, project], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '', ended = false;
      child.stdout.setEncoding('utf8'); child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.resume(); // Never print potentially sensitive process output.
      const done = new Promise(resolve => { child.once('error', () => { ended = true; resolve(null); }); child.once('close', code => { ended = true; resolve(code); }); });
      try {
        let locked = false;
        for (let attempt = 0; attempt < 60 && !ended; attempt++) {
          try { run(['inspect', lockName]); locked = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
        }
        assert.ok(locked, 'First backup must acquire a daemon-wide lock');
        await assert.rejects(() => backup(envFile, project), /Cannot acquire backup lock/, 'Concurrent backup must be rejected');
        assert.equal(await done, 0, 'First backup must complete normally');
        const match = output.match(/^Encrypted backup ready: (.+)$/m);
        assert.ok(match, 'First backup must return its encrypted output');
        backupPath = match[1].trim();
        assert.equal(JSON.parse(run(['inspect', compose(['ps', '-a', '-q', 'backend']).trim()]))[0].State.Running, true, 'Backend must resume after backup');
        assert.throws(() => run(['inspect', lockName]), 'Backup must release its lock');
      } finally { await done; }
      checks.push('Concurrent production backups are rejected without interrupting the first; API resumes and lock is released');
      const correctKey = process.env.SARKISIAN_BACKUP_KEY;
      process.env.SARKISIAN_BACKUP_KEY = crypto.randomBytes(32).toString('hex');
      phase = 'check wrong backup key';
      try { await assert.rejects(() => verify(backupPath), 'An incorrect encryption key must not export data'); }
      finally { process.env.SARKISIAN_BACKUP_KEY = correctKey; }
      phase = 'verify and unpack backup';
      const recovered = await unpack(backupPath);
      try {
        phase = 'verify recovered file contents';
        const verifyFiles = `const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict');for(const [name,expected]of [['uploads','uploads fixture'],['crm_files','private fixture']]){fs.mkdirSync('/tmp/'+name);cp.execFileSync('tar',['--no-same-owner','-xzf','/backup/'+name+'.tar.gz','-C','/tmp/'+name]);assert.equal(fs.readFileSync('/tmp/'+name+'/release-check.txt','utf8'),expected);}console.log('PASS exact public/private backup file contents');`;
        run(['run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/tmp', '--mount', `type=bind,source=${recovered},target=/backup,readonly`, 'node:22.23.3-alpine', 'node', '-e', verifyFiles]);
      } finally {
        if (path.dirname(recovered) !== path.join(root, 'backups') || !/^recovery-[a-f0-9-]+$/.test(path.basename(recovered))) throw new Error('Unsafe recovery test cleanup');
        fs.rmSync(recovered, { recursive: true, force: true });
      }
    }
    finally { if (before === undefined) delete process.env.SARKISIAN_BACKUP_KEY; else process.env.SARKISIAN_BACKUP_KEY = before; }
    assert.ok(!fs.existsSync(path.join(backupPath, 'payload.tar.gz')));
    assert.ok(!fs.existsSync(path.join(backupPath, '.env.production')));
    checks.push('AES-256-GCM backup rejects a wrong key; isolated PostgreSQL/Redis restore and exact public/private file recovery; no plaintext archive retained');
    phase = 'verify graceful shutdown';
    compose(['up', '-d', '--wait', '--wait-timeout', '120', 'backend', 'frontend']);
    compose(['stop', '-t', '45', 'backend']);
    const backendId = compose(['ps', '-a', '-q', 'backend']).trim(), stopped = JSON.parse(run(['inspect', backendId]))[0];
    // Nest re-emits SIGTERM after closing lifecycle hooks; Linux reports 143.
    assert.ok([0, 143].includes(stopped.State.ExitCode), 'SIGTERM must finish without forced SIGKILL (137)');
    assert.equal(stopped.State.OOMKilled, false);
    checks.push('API SIGTERM finishes without forced SIGKILL or OOM after backup/restart');
    fs.writeFileSync(path.join(reportDir, 'release-packaging.json'), JSON.stringify({ checkedAt: new Date().toISOString(), project, migrationCount, checks, passed: true, externalBusinessCalls: false, existingSourceDataTouched: false }, null, 2));
    for (const check of checks) console.log(`PASS ${check}`);
  } finally {
    // Only the unique project created above is eligible for volume cleanup.
    if (!/^sb-release-check-\d+-[a-f0-9]{6}$/.test(project)) throw new Error('Unsafe cleanup project');
    try { compose(['--profile', 'tools', '--profile', 'edge', 'down', '--volumes', '--remove-orphans']); }
    finally { fs.unlinkSync(envFile); }
  }
}
main().catch(error => {
  const verification = /^Backup verification failed at [a-zA-Z ]+(?: \(exit [0-9]+\))?(?:: (?:permission denied|file or command not found|insufficient disk space|connection refused))?; sensitive output suppressed\.$/.test(error.message) ? ` ${error.message}` : '';
  const status = Number.isInteger(error?.status) ? ` (exit ${error.status})` : '';
  console.error(`Release packaging failed at ${phase}${status}; sensitive output suppressed.${verification}`);
  process.exitCode = 1;
});
