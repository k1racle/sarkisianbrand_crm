/** Explicit LOCAL setup: index previous uploads and optionally bundled PUBLIC raster assets.
 * Originals/content/private chat/profile files are never changed or imported. No providers/auth.
 * Run from backend: node scripts/media-library-local-setup.cjs --import-existing --include-bundled
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { ConfigService } = require('@nestjs/config');
const { MediaService } = require('../dist/src/media/media.service');
const backend = path.resolve(__dirname, '..');
const repository = path.resolve(backend, '..');
async function main() {
  assert.equal(path.resolve(process.cwd()), backend, 'Run from the backend directory');
  if (!process.argv.includes('--import-existing')) throw new Error('Explicit --import-existing required; no changes made');
  const prisma = new PrismaClient();
  try {
    const directories = [path.join(backend, 'uploads/storefront')];
    if (process.argv.includes('--include-bundled')) {
      const approved = await fs.realpath(path.join(repository, 'frontend/public/storefront'));
      directories.push(approved);
      for (const entry of await fs.readdir(approved, { withFileTypes: true })) {
        if (!entry.isDirectory() || !['categories', 'products'].includes(entry.name)) continue;
        const resolved = await fs.realpath(path.join(approved, entry.name));
        assert.equal(path.dirname(resolved), approved, 'Source must remain inside approved public storefront directory');
        directories.push(resolved);
      }
    }
    const results = [];
    for (const source of directories) {
      const media = new MediaService(prisma, new ConfigService({ MEDIA_STORAGE_PATH: path.join(backend, 'uploads/media'), STOREFRONT_MEDIA_PATH: source }));
      results.push(await media.importExisting(null));
    }
    console.log(JSON.stringify({ localSetup: true, publicRasterAssetsOnly: true, originalsUnchanged: true, externalCalls: 0, results }));
    if (results.some(result => result.failed || result.limitReached)) process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
