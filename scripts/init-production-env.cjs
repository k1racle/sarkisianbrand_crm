const fs = require('node:fs'), path = require('node:path'), { randomBytes } = require('node:crypto');
const [host, email] = process.argv.slice(2);
if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host || '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
  console.error('Usage: node scripts/init-production-env.cjs your-domain.ru admin@your-domain.ru'); process.exit(1);
}
const root = path.resolve(__dirname, '..'), destination = path.join(root, '.env.production');
let body = fs.readFileSync(path.join(root, '.env.production.example'), 'utf8');
for (const key of ['DB_PASSWORD', 'DB_MIGRATION_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'INTEGRATION_ENCRYPTION_KEY']) body = body.replace(new RegExp(`^${key}=$`, 'm'), `${key}=${randomBytes(32).toString('hex')}`);
body = body.replace(/^SITE_HOST=$/m, `SITE_HOST=${host.toLowerCase()}`).replace(/^ACME_EMAIL=$/m, `ACME_EMAIL=${email}`);
try { fs.writeFileSync(destination, body, { flag: 'wx', mode: 0o600 }); console.log('Created .env.production with independent random secrets. No services started.'); }
catch (error) { console.error(error.code === 'EEXIST' ? '.env.production already exists; unchanged.' : 'Cannot write production environment'); process.exitCode = 1; }
