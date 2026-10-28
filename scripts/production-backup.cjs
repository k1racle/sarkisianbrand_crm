/* Encrypted application backup + isolated restore verification. No live restore.
 * SARKISIAN_BACKUP_KEY is an independent 32-byte hex key, never saved in backup.
 */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const root = path.resolve(__dirname, '..'), backups = path.join(root, 'backups');
const hostUser = `${process.getuid ? process.getuid() : 0}:${process.getgid ? process.getgid() : 0}`;
const docker = (...args) => execFileSync('docker', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
const sha256 = file => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256'), stream = fs.createReadStream(file);
  stream.on('data', chunk => hash.update(chunk)); stream.on('error', reject); stream.on('end', () => resolve(hash.digest('hex')));
});
function safeFailureReason(error) {
  // Classify common system errors without exposing command arguments or stderr.
  const text = String(error?.stderr || '').toLowerCase();
  const code = error?.code;
  if (code === 'EACCES' || /permission denied|operation not permitted/.test(text)) return 'permission denied';
  if (code === 'ENOENT' || /no such file or directory/.test(text)) return 'file or command not found';
  if (code === 'ENOSPC' || /no space left on device/.test(text)) return 'insufficient disk space';
  if (code === 'ECONNREFUSED' || /connection refused/.test(text)) return 'connection refused';
  return '';
}
function removeStage(stage) {
  const relative = path.relative(backups, stage);
  if (!/^\.(?:staging|restore)-[a-f0-9-]+$/.test(relative) || path.isAbsolute(relative)) throw new Error('Unsafe temporary backup path');
  fs.rmSync(stage, { recursive: true, force: true });
}
function helper(mounts, args, writable = []) {
  return docker('run', '--rm', '--network', 'none', '--read-only', '--security-opt', 'no-new-privileges:true', '--cap-drop', 'ALL', '--cap-add', 'DAC_OVERRIDE', '--tmpfs', '/tmp',
    ...mounts.flatMap(m => ['--mount', m]), ...writable, 'node:22.23.3-alpine', ...args);
}
function key() {
  if (!/^[a-f0-9]{64}$/i.test(process.env.SARKISIAN_BACKUP_KEY || '')) throw new Error('Set SARKISIAN_BACKUP_KEY to an independent 32-byte hex key; store it separately');
  return Buffer.from(process.env.SARKISIAN_BACKUP_KEY, 'hex');
}
async function encrypt(input, output, secret) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  fs.writeFileSync(output, Buffer.concat([Buffer.from('SBCRM1'), iv]), { flag: 'wx', mode: 0o600 });
  await pipeline(fs.createReadStream(input), cipher, fs.createWriteStream(output, { flags: 'a' }));
  fs.appendFileSync(output, cipher.getAuthTag());
}
async function decrypt(input, output, secret) {
  const fd = fs.openSync(input, 'r'), stat = fs.fstatSync(fd), header = Buffer.alloc(18), tag = Buffer.alloc(16);
  try {
    if (stat.size < 35) throw new Error('Invalid encrypted backup');
    fs.readSync(fd, header, 0, header.length, 0); fs.readSync(fd, tag, 0, tag.length, stat.size - 16);
  } finally { fs.closeSync(fd); }
  if (header.subarray(0, 6).toString() !== 'SBCRM1') throw new Error('Unsupported backup format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secret, header.subarray(6)); decipher.setAuthTag(tag);
  await pipeline(fs.createReadStream(input, { start: 18, end: stat.size - 17 }), decipher, fs.createWriteStream(output, { flags: 'wx', mode: 0o600 }));
}
async function backup(envFile, projectOverride) {
  const secret = key(), environment = path.resolve(root, envFile);
  const base = ['compose', '--env-file', environment, '-f', path.join(root, 'docker-compose.production.yml'), ...(projectOverride ? ['-p', projectOverride] : [])];
  const config = JSON.parse(docker(...base, 'config', '--format', 'json')), project = config.name;
  if (!/^[a-z0-9][a-z0-9_-]+$/.test(project)) throw new Error('Invalid compose project');
  // A stopped container name is a daemon-wide atomic lock. Unlike a local lock
  // file, it also protects a project accessed from different Git checkouts.
  // Never automatically steal a stale lock: the operator must first confirm
  // that no other backup is still running.
  const lockName = `sarkisian-backup-lock-${crypto.createHash('sha256').update(project).digest('hex').slice(0, 24)}`;
  let lockId;
  try {
    lockId = docker('create', '--name', lockName, '--network', 'none', '--read-only', '--label', `com.sarkisian.backup.project=${project}`, 'postgres:15-alpine').trim();
  } catch {
    throw new Error(`Cannot acquire backup lock for project ${project}; another backup may be running or Docker may be unavailable`);
  }
  if (!/^[a-f0-9]{12,64}$/.test(lockId)) throw new Error('Docker returned an invalid backup lock ID');
  try {
  const containers = {};
  for (const service of ['backend', 'postgres', 'redis']) {
    const id = docker(...base, 'ps', '-a', '-q', service).trim();
    if (!/^[a-f0-9]{12,64}$/.test(id)) throw new Error(`${service} container is missing`);
    const inspect = JSON.parse(docker('inspect', id))[0];
    if (inspect.Config.Labels['com.docker.compose.project'] !== project || inspect.Config.Labels['com.docker.compose.service'] !== service) throw new Error('Container ownership mismatch');
    containers[service] = inspect;
  }
  const id = crypto.randomUUID(), stage = path.join(backups, `.staging-${id}`), destination = path.join(backups, `production-${project}-${new Date().toISOString().replace(/[:.]/g, '-')}-${id.slice(0, 8)}`);
  fs.mkdirSync(stage, { recursive: true, mode: 0o700 }); fs.mkdirSync(destination, { mode: 0o700 });
  const restart = containers.backend.State.Running, remote = `/tmp/sb-backup-${id}`;
  try {
    if (restart) docker(...base, 'stop', '-t', '45', 'backend');
    docker('exec', containers.postgres.Id, 'pg_dump', '-U', 'postgres', '-d', 'sarkisian_brand', '--no-owner', '--no-acl', '-Fc', '-f', `${remote}.dump`);
    docker('cp', `${containers.postgres.Id}:${remote}.dump`, path.join(stage, 'database.dump'));
    docker('exec', containers.redis.Id, 'redis-cli', '--rdb', `${remote}.rdb`);
    docker('cp', `${containers.redis.Id}:${remote}.rdb`, path.join(stage, 'redis.rdb'));
    for (const [name, target] of [['uploads', '/app/uploads'], ['crm_files', '/app/private-crm-files']]) {
      const mount = containers.backend.Mounts.find(m => m.Destination === target && m.Type === 'volume');
      if (!mount?.Name) throw new Error(`Missing persistent volume ${name}`);
      helper([`type=volume,source=${mount.Name},target=/data,readonly`, `type=bind,source=${stage},target=/backup`], ['tar', '-czf', `/backup/${name}.tar.gz`, '-C', '/data', '.']);
    }
    fs.copyFileSync(environment, path.join(stage, '.env.production')); fs.chmodSync(path.join(stage, '.env.production'), 0o600);
    const names = ['database.dump', 'redis.rdb', 'uploads.tar.gz', 'crm_files.tar.gz', '.env.production'];
    const files = await Promise.all(names.map(async name => ({ name, sha256: await sha256(path.join(stage, name)), bytes: fs.statSync(path.join(stage, name)).size })));
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify({ version: 1, kind: 'sarkisian-production', project, createdAt: new Date().toISOString(), files }, null, 2));
    helper([`type=bind,source=${stage},target=/data,readonly`, `type=bind,source=${destination},target=/backup`], ['tar', '-czf', '/backup/payload.tar.gz', '-C', '/data', '.']);
    await encrypt(path.join(destination, 'payload.tar.gz'), path.join(destination, 'backup.sbk'), secret);
    fs.unlinkSync(path.join(destination, 'payload.tar.gz'));
    fs.writeFileSync(path.join(destination, 'backup.json'), JSON.stringify({ version: 1, encryption: 'AES-256-GCM', sha256: await sha256(path.join(destination, 'backup.sbk')), createdAt: new Date().toISOString() }, null, 2));
    console.log(`Encrypted backup ready: ${destination}`);
    return destination;
  } finally {
    for (const [service, suffix] of [['postgres', 'dump'], ['redis', 'rdb']]) { try { docker('exec', containers[service].Id, 'rm', '-f', `${remote}.${suffix}`); } catch {} }
    removeStage(stage);
    // A failed encryption must not leave plaintext credentials in the output.
    try { fs.unlinkSync(path.join(destination, 'payload.tar.gz')); } catch {}
    if (restart) docker(...base, 'start', 'backend');
  }
  } finally {
    // Remove only the container we created, never a later replacement by name.
    docker('rm', lockId);
  }
}
async function verify(directory) {
  const secret = key(), source = path.resolve(root, directory), metadata = JSON.parse(fs.readFileSync(path.join(source, 'backup.json'), 'utf8'));
  if (metadata.version !== 1 || metadata.encryption !== 'AES-256-GCM' || metadata.sha256 !== await sha256(path.join(source, 'backup.sbk'))) throw new Error('Backup checksum or format mismatch');
  const id = crypto.randomUUID(), stage = path.join(backups, `.restore-${id}`), name = `sb-restore-check-${id}`; let created = false, phase = 'decrypt backup';
  fs.mkdirSync(stage, { recursive: true, mode: 0o700 });
  try {
    await decrypt(path.join(source, 'backup.sbk'), path.join(stage, 'payload.tar.gz'), secret);
    const allowed = new Set(['./', './database.dump', './redis.rdb', './uploads.tar.gz', './crm_files.tar.gz', './.env.production', './manifest.json']);
    phase = 'inspect backup archive';
    const archiveNames = helper([`type=bind,source=${stage},target=/backup,readonly`], ['tar', '-tzf', '/backup/payload.tar.gz']).trim().split('\n');
    if (archiveNames.some(entry => !allowed.has(entry))) throw new Error('Unexpected backup entry');
    phase = 'extract backup archive';
    helper([`type=bind,source=${stage},target=/backup`], ['tar', '--no-same-owner', '-xzf', '/backup/payload.tar.gz', '-C', '/backup'], ['--user', hostUser]);
    phase = 'check backup manifest and file checksums';
    const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'manifest.json'), 'utf8'));
    if (manifest.version !== 1 || manifest.kind !== 'sarkisian-production') throw new Error('Unsupported manifest');
    for (const expected of ['database.dump', 'redis.rdb', 'uploads.tar.gz', 'crm_files.tar.gz', '.env.production']) {
      const entries = manifest.files.filter(f => f.name === expected);
      if (entries.length !== 1 || entries[0].sha256 !== await sha256(path.join(stage, expected))) throw new Error(`Checksum mismatch: ${expected}`);
    }
    phase = 'start isolated PostgreSQL';
    docker('run', '-d', '--name', name, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=restore_check', 'postgres:15-alpine'); created = true;
    // The image first starts a temporary, Unix-socket-only server while
    // initializing the cluster. It then stops that server and starts the real
    // one. A socket-only pg_isready can succeed during this transition and
    // pg_restore would race the shutdown. Connect to the final TCP listener and
    // execute a real query against the requested database instead.
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if (docker('exec', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'restore_check', '-Atc', 'SELECT 1').trim() === '1') { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Temporary restore database did not start');
    phase = 'copy PostgreSQL backup';
    docker('cp', path.join(stage, 'database.dump'), `${name}:/tmp/database.dump`);
    phase = 'restore isolated PostgreSQL';
    docker('exec', name, 'pg_restore', '--exit-on-error', '--no-owner', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'restore_check', '/tmp/database.dump');
    phase = 'check restored PostgreSQL tables';
    const tables = Number(docker('exec', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'restore_check', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"));
    if (!tables) throw new Error('No application tables restored');
    phase = 'validate Redis snapshot';
    docker('run', '--rm', '--network', 'none', '--read-only', '--mount', `type=bind,source=${stage},target=/backup,readonly`, 'redis:7-alpine', 'redis-check-rdb', '/backup/redis.rdb');
    phase = 'verify file archives';
    for (const volume of ['uploads', 'crm_files']) helper([`type=bind,source=${stage},target=/backup,readonly`], ['tar', '--no-same-owner', '-xzf', `/backup/${volume}.tar.gz`, '-C', '/tmp']);
    phase = 'write verification report';
    const report = { verifiedAt: new Date().toISOString(), databaseTables: tables, redisRdb: 'validated', fileArchives: 'extracted', isolation: 'temporary containers, no network or published ports', liveSourceUntouched: true };
    fs.writeFileSync(path.join(source, 'restore-check.json'), JSON.stringify(report, null, 2));
    console.log(`PASS isolated restore: ${tables} tables, Redis RDB and both file archives; live source untouched.`);
    return report;
  } catch (error) {
    // Docker output may contain credentials or document contents: report only
    // the fixed operation name and exit status, never stdout/stderr or arguments.
    const status = Number.isInteger(error?.status) ? ` (exit ${error.status})` : '';
    const reason = safeFailureReason(error);
    throw new Error(`Backup verification failed at ${phase}${status}${reason ? `: ${reason}` : ''}; sensitive output suppressed.`);
  } finally { if (created) docker('rm', '-f', name); removeStage(stage); }
}
async function unpack(directory) {
  // Export only after a complete isolated restore check. Never overwrite a live
  // database or existing files; an operator receives a fresh recovery directory.
  await verify(directory);
  const source = path.resolve(root, directory), id = crypto.randomUUID(), stage = path.join(backups, `.restore-${id}`), destination = path.join(backups, `recovery-${id}`);
  fs.mkdirSync(stage, { recursive: true, mode: 0o700 });
  try {
    await decrypt(path.join(source, 'backup.sbk'), path.join(stage, 'payload.tar.gz'), key());
    helper([`type=bind,source=${stage},target=/backup`], ['tar', '--no-same-owner', '-xzf', '/backup/payload.tar.gz', '-C', '/backup'], ['--user', hostUser]);
    fs.unlinkSync(path.join(stage, 'payload.tar.gz'));
    if (path.dirname(destination) !== backups || !/^recovery-[a-f0-9-]+$/.test(path.basename(destination)) || fs.existsSync(destination)) throw new Error('Unsafe recovery output');
    fs.renameSync(stage, destination);
    console.log(`Verified recovery files exported to ${destination}; no live services changed.`);
    return destination;
  } finally { if (fs.existsSync(stage)) removeStage(stage); }
}
if (require.main === module) {
  const [command, argument = '.env.production', project] = process.argv.slice(2);
  const operation = command === 'backup' ? backup(argument, project) : command === 'verify' ? verify(argument) : command === 'unpack' ? unpack(argument) : Promise.reject(new Error('Usage: node scripts/production-backup.cjs backup [env-file] [project] | verify <backup-directory> | unpack <backup-directory>'));
  operation.catch(error => { console.error(error instanceof Error && !error.status ? error.message : 'Backup operation failed; inspect service health without printing credentials'); process.exitCode = 1; });
}
module.exports = { backup, verify, unpack };
