/* Runtime regression check for the security-patched HTTP/upload dependency tree.
 * Uses an ephemeral loopback listener and in-memory files; no DB or external calls.
 */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const { FileTypeValidator } = require('@nestjs/common');
const ExcelJS = require('exceljs');
const platformRequire = createRequire(require.resolve('@nestjs/platform-express/package.json'));
const express = platformRequire('express');
const multer = platformRequire('multer');
const bodyParser = platformRequire('body-parser');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+XkAAAAASUVORK5CYII=', 'base64');

async function main() {
  const imageValidator = new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ });
  assert.equal(await imageValidator.isValid({ mimetype: 'image/png', buffer: png }), true);
  assert.equal(await imageValidator.isValid({ mimetype: 'image/png', buffer: Buffer.from('not an image') }), false);

  const app = express();
  app.use(bodyParser.json({ limit: '1kb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1kb', parameterLimit: 20 }));
  app.post('/body', (req, res) => res.json(req.body));
  app.post('/logo', multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 4 } }).single('file'), (req, res) => {
    res.json({ size: req.file?.size, mime: req.file?.mimetype, exactBytes: req.file?.buffer.equals(png) });
  });
  app.use((err, _req, res, _next) => res.status(err.status || 400).json({ error: err.code || err.type || 'INVALID_MULTIPART' }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
  try {
    const body = await request('/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Test' }) });
    assert.equal(body.status, 200);
    assert.deepEqual(await body.json(), { title: 'Test' });
    const tooLarge = await request('/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x'.repeat(2048) }) });
    assert.equal(tooLarge.status, 413);
    const form = await request('/body', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'client[name]=Test&client[tags][]=salon' });
    assert.equal(form.status, 200);
    assert.deepEqual(await form.json(), { client: { name: 'Test', tags: ['salon'] } });

    const valid = new FormData(); valid.set('file', new Blob([png], { type: 'image/png' }), 'logo.png');
    const uploaded = await request('/logo', { method: 'POST', body: valid });
    assert.equal(uploaded.status, 200);
    assert.deepEqual(await uploaded.json(), { size: png.length, mime: 'image/png', exactBytes: true });
    const huge = new FormData(); huge.set('file', new Blob([Buffer.alloc(3 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
    const rejected = await request('/logo', { method: 'POST', body: huge });
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).error, 'LIMIT_FILE_SIZE');
    const malformed = await request('/logo', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test' }, body: '--test\r\nContent-Disposition: form-data; name="file"; filename="bad.png"\r\nContent-Type: image/png\r\n\r\ntruncated' });
    assert.equal(malformed.status, 400);
    const healthy = await request('/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(healthy.status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Export').addRow(['SKU', 'Amount']);
  workbook.getWorksheet('Export').addRow(['TEST', 2]);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(restored.getWorksheet('Export').getCell('A2').value, 'TEST');
  assert.equal(restored.getWorksheet('Export').getCell('B2').value, 2);
  console.log('PASS dependency regression: magic bytes, JSON/form limits, multipart bytes/size/malformed body, server recovery, XLSX roundtrip');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
