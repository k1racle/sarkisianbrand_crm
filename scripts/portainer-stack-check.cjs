/* Disposable Portainer Compose acceptance. Only synthetic secrets/data; no
 * published ports or external business calls. Never targets an existing stack. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), id = crypto.randomBytes(5).toString('hex');
const project = `sb-portainer-check-${id}`, network = `${project}-npm`, reports = path.join(root, '.screenshots');
const envPath = path.join(reports, `${project}.env`);
if (!/^sb-portainer-check-[a-f0-9]{10}$/.test(project)) throw new Error('Unsafe fixture project');
fs.mkdirSync(reports, { recursive: true });
const env = { COMPOSE_PROJECT_NAME: project, RELEASE_IMAGE_PREFIX: project, RELEASE_TAG: 'fixture', PORTAINER_PROXY_NETWORK: network, SITE_HOST: 'release.example.invalid', ACME_EMAIL: 'release@example.invalid' };
for (const key of ['DB_PASSWORD', 'DB_MIGRATION_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'INTEGRATION_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
fs.writeFileSync(envPath, Object.entries(env).map(([k,v]) => `${k}=${v}`).join('\n')+'\n', { mode: 0o600, flag: 'wx' });
const base = ['compose', '--env-file', envPath, '-f', 'docker-compose.production.yml', '-f', 'docker-compose.portainer.yml', '-p', project];
const docker = (args, input) => execFileSync('docker', args, { cwd: root, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
const compose = (args, input) => docker([...base, ...args], input);
let networkCreated = false, stage = 'configuration';
try {
  const config = JSON.parse(compose(['config', '--format', 'json']));
  for (const name of ['backend','frontend','gateway','postgres','redis','migrations']) assert.ok(config.services[name], `Missing ${name}`);
  for (const name of ['backend','frontend','gateway','postgres','redis']) assert.ok(!config.services[name].ports?.length, `${name} publishes a host port`);
  assert.equal(config.services.backend.depends_on.migrations.condition, 'service_completed_successfully');
  assert.ok(!config.services.migrations.profiles?.length, 'Migrations must run on normal startup');
  assert.equal(config.networks.portainer_proxy.external, true);
  stage = 'fixture network'; docker(['network','create','--internal',network]); networkCreated = true;
  stage = 'build'; compose(['build']);
  stage = 'start and migrate'; compose(['up','-d','--wait','--wait-timeout','240','gateway']);
  const migration = compose(['ps','-a','-q','migrations']).trim();
  const info = JSON.parse(docker(['inspect', migration]))[0];
  assert.equal(info.State.Status, 'exited'); assert.equal(info.State.ExitCode, 0);
  const count = Number(compose(['exec','-T','postgres','psql','-U','postgres','-d','sarkisian_brand','-Atc','SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL']));
  const expected = fs.readdirSync(path.join(root,'backend/prisma/migrations'),{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(root,'backend/prisma/migrations',x.name,'migration.sql'))).length;
  assert.equal(count, expected, 'A migration was missed');
  stage = 'bootstrap administrator';
  const credentials = { email: 'fixture-admin@example.invalid', password: 'Aa1!' + crypto.randomBytes(24).toString('hex') };
  compose(['exec','-T','backend','node','scripts/bootstrap-admin.cjs'], JSON.stringify(credentials));
  stage = 'HTTP and login';
  const check = `const fs=require('fs'),assert=require('assert/strict');(async()=>{const credentials=JSON.parse(fs.readFileSync(0,'utf8')),base='http://sarkisian-gateway:8080';for(const p of ['/','/crm/login','/b2b'])assert.equal((await fetch(base+p)).status,200,p);for(const p of ['/api/v1/health/ready','/__health','/docs','/docs-json'])assert.equal((await fetch(base+p)).status,404,p);const r=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Real-IP':'198.51.100.30'},body:JSON.stringify(credentials)});assert.equal(r.status,200);const session=await r.json();assert.equal(session.user.role,'ADMIN');const a=await fetch(base+'/api/v1/auth/access',{headers:{Authorization:'Bearer '+session.accessToken,'X-Real-IP':'198.51.100.30'}});assert.equal(a.status,200);assert.ok((await a.json()).permissions.includes('system.manage'));})().catch(e=>{console.error(e.message);process.exit(1)});`;
  docker(['run','--rm','-i','--network',network,'--entrypoint','node','node:22.23.3-alpine','-e',check], JSON.stringify(credentials));
  console.log(`PASS Portainer overlay: ${count} migrations, bootstrap, actual login, permissions, routing, closed internal endpoints, no published ports`);
} catch (error) {
  console.error(`Portainer isolated check failed during ${stage}; no credentials printed.`);
  process.exitCode = 1;
} finally {
  try { compose(['down','--volumes','--remove-orphans']); } catch { process.exitCode = 1; }
  if (networkCreated) try { docker(['network','rm',network]); } catch { process.exitCode = 1; }
  try { fs.unlinkSync(envPath); } catch { process.exitCode = 1; }
}
