// Local UI-only contract. Synthetic auth; multipart requests never reach a server.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, task, lead, publication } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-file-access');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  const checks = [];
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map(base);
      const access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'crm.write', 'content_plan.read', 'content_plan.write'] });
      const node = { id: 'protected-file', kind: 'FILE', scope: 'TEAM', parentId: null, name: 'Защищённый материал.txt', size: 12, mime: 'text/plain', restricted: true, updatedAt: task.createdAt };
      fixtures.set('/crm/drive', { items: [node], total: 1, crumbs: [], used: 12, quota: 1024 ** 3, usageScope: 'visible' });
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      const writes = [], attachments = new Map(); let rejectUpload = false;
      const cardPaths = [`/crm/tasks/${task.id}/files`, `/crm/leads/${lead.id}/files`, `/crm/content-plan/${publication.id}/files`];
      const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
      await f.context.route('**/api/v1/**', async route => {
        const req = route.request(), endpoint = new URL(req.url()).pathname.replace('/api/v1', '');
        const filesPath = cardPaths.find(p => endpoint === `${p}/upload`);
        const send = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
        if (filesPath && req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (filesPath && req.method() === 'POST') {
          assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
          assert.ok(req.headers()['content-type'].startsWith('multipart/form-data'));
          writes.push(endpoint);
          if (rejectUpload) return send({ message: 'Нет доступа к вложениям карточки' }, 403);
          const attached = { nodeId: node.id, node: { ...node, name: 'Загружено безопасно.txt' } };
          attachments.set(filesPath, [attached]); return send(attached);
        }
        if (cardPaths.includes(endpoint) && req.method() === 'GET') return send(attachments.get(endpoint) || []);
        if (endpoint === '/crm/drive/protected-file/content' && req.method() === 'GET') return send({ message: 'Файл недоступен' }, 404);
        return route.fallback();
      });
      try {
        const p = f.page;
        await p.goto(`${origin}/crm/files`, { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: 'Диск команды', exact: true }).click();
        await p.getByText('Доступ по карточкам', { exact: true }).waitFor();
        await p.screenshot({ path: path.join(output, `${width}-drive.png`) });
        await p.getByRole('button', { name: 'Предпросмотр Защищённый материал.txt' }).click();
        await p.getByRole('dialog', { name: 'Предпросмотр: Защищённый материал.txt' }).getByRole('alert').getByText('Файл недоступен').waitFor();
        const deniedDownload = p.waitForResponse(response => response.url().endsWith('/crm/drive/protected-file/content'));
        await p.getByRole('dialog').getByRole('button', { name: 'Скачать', exact: true }).click();
        assert.equal((await deniedDownload).status(), 404);
        assert.equal(await p.getByRole('dialog').getByRole('alert').textContent(), 'Файл недоступен');
        await p.getByRole('button', { name: 'Закрыть предпросмотр' }).click();
        for (const kind of ['task', 'lead', 'publication']) {
          if (kind === 'task') {
            await p.goto(`${origin}/crm/tasks`, { waitUntil: 'networkidle' });
            await p.locator('.task-card').filter({ hasText: task.title }).click();
            await p.getByRole('tab', { name: 'Вложения', exact: true }).click();
          } else if (kind === 'lead') {
            await p.goto(`${origin}/crm/deals`, { waitUntil: 'networkidle' });
            await p.getByText(lead.title, { exact: true }).click();
            await p.getByRole('tab', { name: 'Вложения', exact: true }).click();
          } else {
            await p.goto(`${origin}/crm/content-plan`, { waitUntil: 'networkidle' });
            await p.locator('.crm-publication').first().click();
          }
          const section = p.locator('.crm-task-files');
          await section.locator('input[type=file]').setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('local fixture') });
          await section.getByRole('button', { name: /^Загружено безопасно\.txt/ }).waitFor();
          if (kind === 'task') {
            rejectUpload = true;
            await section.locator('input[type=file]').setInputFiles({ name: 'denied.txt', mimeType: 'text/plain', buffer: Buffer.from('rejected fixture') });
            await section.getByRole('alert').getByText(/Нет доступа к вложениям/).waitFor();
            assert.equal(await section.locator('.crm-attachment').count(), 1, 'Failed upload does not invent a public attachment');
            rejectUpload = false;
          }
          await section.scrollIntoViewIfNeeded();
          await p.screenshot({ path: path.join(output, `${width}-${kind}.png`) });
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No mobile document overflow');
        }
        assert.deepEqual(writes, [cardPaths[0] + '/upload', cardPaths[0] + '/upload', cardPaths[1] + '/upload', cardPaths[2] + '/upload']);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(message => !/^console: Failed to load resource: the server responded with a status of (403|404)/.test(message)), []);
        checks.push(`${width}: restricted badge, denied preview, task/deal/publication atomic uploads, rejected upload with no public fallback`);
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, `${width}-failure.png`) });
        console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic, writes })); throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'all reads and writes mocked; no integrations', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
