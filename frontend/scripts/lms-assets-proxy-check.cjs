/* Nuxt proxy + isolated synthetic upstream. No real accounts, files or providers. */
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('playwright-core');

const lesson = '20000000-0000-4000-8000-000000000001', asset = '30000000-0000-4000-8000-000000000001';
const filePath = `/api/v1/lms/admin/lessons/${lesson}/assets`;
const mediaPath = `/api/v1/lms/media/${asset}`;
const ticketPath = `/api/v1/lms/my/10000000-0000-4000-8000-000000000001/lessons/${lesson}/assets/${asset}/session`;
const bytes = Buffer.from('0123456789');
let lastUpload, upstreamStarted = false, upstreamAborted = false;

const upstream = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === filePath) {
    upstreamStarted = true;
    const chunks = []; req.on('data', chunk => chunks.push(chunk));
    req.on('close', () => { if (!req.complete) upstreamAborted = true; });
    req.on('end', () => { lastUpload = { bytes: Buffer.concat(chunks), headers: req.headers }; res.writeHead(200, {'content-type':'application/json'}).end('{}'); });
    return;
  }
  if (req.method === 'POST' && req.url === ticketPath) {
    if (req.headers.authorization !== 'Bearer fixture-student') return res.writeHead(401).end();
    res.writeHead(200, { 'content-type':'application/json', 'set-cookie': `fixture_media=ok; HttpOnly; SameSite=Strict; Path=${mediaPath}`, 'cache-control':'private, no-store' }).end(JSON.stringify({ url:mediaPath, expiresIn:300 }));
    return;
  }
  if (req.method === 'GET' && req.url === mediaPath) {
    if (!req.headers.cookie?.includes('fixture_media=ok')) return res.writeHead(401).end();
    if (req.headers.range !== 'bytes=2-5') return res.writeHead(416).end();
    return res.writeHead(206, { 'content-type':'video/mp4', 'accept-ranges':'bytes', 'content-range':'bytes 2-5/10', 'content-length':'4', 'cache-control':'private, no-store' }).end(bytes.subarray(2,6));
  }
  res.writeHead(404).end();
});

async function main() {
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamOrigin = `http://127.0.0.1:${upstream.address().port}`;
  const reserve = http.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const preview = spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...process.env, HOST:'127.0.0.1', PORT:String(port), NUXT_PUBLIC_API_BASE:'/api/v1', NUXT_PUBLIC_API_PROXY_ENABLED:'true', NUXT_API_PROXY_BASE:`${upstreamOrigin}/api/v1`, NUXT_SEO_API_BASE:`${upstreamOrigin}/api/v1`, NUXT_PUBLIC_SITE_URL:origin }, stdio:'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i=0; i<80; i++) { try { if ((await fetch(`${origin}/__health`)).ok) { ready = true; break; } } catch {} await delay(100); }
    assert.ok(ready, 'isolated Nuxt preview starts');
    browser = await chromium.launch(); const context = await browser.newContext(), page = await context.newPage();
    await page.goto(`${origin}/__health`);
    const outcome = await page.evaluate(async ({ filePath, mediaPath, ticketPath }) => {
      const denied = await fetch(mediaPath);
      const upload = await fetch(filePath, { method:'POST', headers:{ Authorization:'Bearer fixture-staff', 'Content-Type':'application/octet-stream', 'X-File-Name':encodeURIComponent('урок.pdf') }, body:new File(['%PDF-fixture'], 'урок.pdf') });
      const ticket = await fetch(ticketPath, { method:'POST', headers:{ Authorization:'Bearer fixture-student' } });
      const json = await ticket.json();
      const range = await fetch(mediaPath, { headers:{ Range:'bytes=2-5' } });
      return { denied:denied.status, upload:upload.status, ticket:ticket.status, url:json.url, range:range.status, contentRange:range.headers.get('content-range'), cache:range.headers.get('cache-control'), text:await range.text(), documentCookie:document.cookie };
    }, { filePath, mediaPath, ticketPath });
    assert.deepEqual(outcome, { denied:401, upload:200, ticket:200, url:mediaPath, range:206, contentRange:'bytes 2-5/10', cache:'no-store', text:'2345', documentCookie:'' });
    assert.equal(lastUpload.headers['content-length'], String(Buffer.byteLength('%PDF-fixture')));
    assert.equal(decodeURIComponent(lastUpload.headers['x-file-name']), 'урок.pdf');
    assert.equal(lastUpload.headers.authorization, 'Bearer fixture-staff');
    assert.equal(lastUpload.bytes.toString(), '%PDF-fixture');
    assert.ok((await context.cookies()).some(cookie => cookie.name === 'fixture_media' && cookie.httpOnly && cookie.path === mediaPath));
    await context.close();
    upstreamStarted = false; upstreamAborted = false;
    const request = http.request(`${origin}${filePath}`, { method:'POST', headers:{ 'Content-Type':'application/octet-stream', 'Content-Length':'5242880', 'X-File-Name':'fixture.pdf' } });
    request.on('error', () => {}); request.write(Buffer.alloc(4096));
    for (let i=0; i<30 && !upstreamStarted; i++) await delay(100);
    assert.ok(upstreamStarted, 'Nuxt forwards upload as a stream before it completes');
    request.destroy();
    for (let i=0; i<50 && !upstreamAborted; i++) await delay(100);
    assert.ok(upstreamAborted, 'aborted upload closes the upstream request');
    console.log('Nuxt proxy: raw upload headers/body, HttpOnly scoped cookie, authenticated Range and aborted upload PASS');
  } finally {
    if (browser) await browser.close(); preview.kill(); upstream.closeAllConnections(); await new Promise(resolve => upstream.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
