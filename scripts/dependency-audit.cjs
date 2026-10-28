/* Fail on new advisories; known exceptions require source/runtime constraints. */
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), reports = path.join(root, '.screenshots');
fs.mkdirSync(reports, { recursive: true });
function sourceFiles(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? sourceFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]).filter(f => /\.(ts|vue)$/.test(f)); }
function main() {
  for (const area of ['backend', 'frontend']) {
    let output;
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npm', args = process.platform === 'win32' ? ['/d', '/c', 'npm.cmd audit --omit=dev --json'] : ['audit', '--omit=dev', '--json'];
    try { output = execFileSync(command, args, { cwd: path.join(root, area), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { output = error.stdout; }
    if (!output) throw new Error(`${area}: audit service unavailable`);
    const report = JSON.parse(output);
    if (!report.metadata || report.error) throw new Error(`${area}: invalid audit response`);
    fs.writeFileSync(path.join(reports, `release-${area}-audit-current.json`), output);
    const allowed = area === 'backend' ? new Set(['https://github.com/advisories/GHSA-36xv-jgw5-4q75']) : new Set(['https://github.com/advisories/GHSA-86w9-cpqp-85rv', 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4']);
    const unexpected = Object.values(report.vulnerabilities || {}).flatMap(v => v.via.filter(a => typeof a === 'object' && !allowed.has(a.url)).map(a => a.url));
    if (unexpected.length) throw new Error(`${area}: unreviewed advisories: ${[...new Set(unexpected)].join(', ')}`);
    const files = area === 'backend' ? sourceFiles(path.join(root, 'backend/src')) : sourceFiles(path.join(root, 'frontend/server'));
    for (const file of files.filter(f => !f.endsWith('.spec.ts'))) {
      const source = fs.readFileSync(file, 'utf8');
      if (area === 'backend' && /@Sse\s*\(|\bSseStream\b/.test(source)) throw new Error('Nest SSE exception is no longer valid: upgrade Nest before adding SSE');
      if (area === 'frontend' && /(?:from\s*|require\s*\(|import\s*\()\s*['"](?:node-forge|listhen)/.test(source)) throw new Error('Development TLS dependency is imported into production server code');
    }
    if (area === 'frontend') {
      // deepmerge has no upstream patch. Its only remaining parent is Rollup's
      // build-time resolver; production packaging checks the actual image too.
      const packages = JSON.parse(fs.readFileSync(path.join(root, 'frontend/package-lock.json'), 'utf8')).packages;
      const users = Object.entries(packages).filter(([, p]) => ['dependencies', 'optionalDependencies'].some(field => Object.hasOwn(p[field] || {}, 'deepmerge'))).map(([name]) => name);
      if (users.length !== 1 || users[0] !== 'node_modules/@rollup/plugin-node-resolve') throw new Error('deepmerge dependency path changed; reassess production exposure');
      const appFiles = ['server', 'components', 'pages', 'composables'].flatMap(dir => sourceFiles(path.join(root, 'frontend', dir)));
      appFiles.push(path.join(root, 'frontend/nuxt.config.ts'));
      if (appFiles.some(file => /(?:from\s*|require\s*\(|import\s*\()\s*['"]deepmerge(?:\/|['"])/.test(fs.readFileSync(file, 'utf8')))) throw new Error('deepmerge is imported into frontend application code');
    }
    console.log(`${area}: no unreviewed production-tree advisory; ${JSON.stringify(report.metadata.vulnerabilities)}`);
  }
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
