// Isolated browser only: synthetic sessions, fixture API, inert WebSockets, no writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, task } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-chat-references');
function deferred() { let resolve; const promise = new Promise(fn => resolve = fn); return { promise, resolve }; }
async function event(page, channelId) {
  await page.evaluate(channelId => {
    const state = document.getElementById('__nuxt').__vue_app__.config.globalProperties.$nuxt.payload.state;
    state['$splatform-chat-last-message'] = { id: 'notification', channelId, receivedAt: Date.now() + Math.random() };
  }, channelId);
}
async function open(page) {
  await page.getByRole('button', { name: 'Открыть чат команды', exact: true }).click();
  await page.getByRole('dialog', { name: 'Чат платформы' }).waitFor();
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try {
    for (const width of [390, 1440]) {
      const channels = ['a', 'b'].map(id => ({ id, name: id === 'a' ? 'Рабочий канал' : 'Вторая переписка', type: 'TEAM', members: [], messages: [], unread: 0 }));
      const fixtures = new Map([...base, ['/platform-chat/channels', channels], ['/platform-chat/team', []]]);
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      let revoked = false, denyHistory = false, delayMessage = null, delaySearch = null;
      const person = { id: 'colleague', firstName: 'Анна', lastName: 'Соколова' };
      const message = id => [{
        id: 'same-' + id, channelId: id, authorId: person.id, author: person, createdAt: '2026-09-28T10:00:00Z',
        body: id === 'a' ? 'Первая переписка' : 'Сообщение второго канала',
        attachments: id === 'b' ? [] : [revoked
          ? { id: 'ref', kind: 'ENTITY', restricted: true, name: 'Карточка недоступна', entityType: null, entityId: null, metadata: null }
          : { id: 'ref', kind: 'ENTITY', restricted: false, name: 'Доступная задача', entityType: 'TASK', entityId: task.id, metadata: { subtitle: 'В работе', url: '/crm/tasks?task=' + task.id } }],
      }];
      await f.context.route('**/api/v1/platform-chat/**', async route => {
        if (route.request().method() !== 'GET') return route.fallback();
        const url = new URL(route.request().url()), endpoint = url.pathname.split('/api/v1')[1];
        const answer = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, 'Cache-Control': 'private, no-store' }, body: JSON.stringify(data) });
        const match = endpoint.match(/^\/platform-chat\/channels\/([ab])\/messages$/);
        if (match) {
          f.traffic.mockedReads.push(endpoint);
          const data = message(match[1]), denied = denyHistory;
          if (delayMessage?.channel === match[1]) { const pending = delayMessage; delayMessage = null; pending.started.resolve(); await pending.release.promise; }
          return answer(denied ? { message: 'Нет доступа к переписке' } : data, denied ? 403 : 200);
        }
        if (endpoint === '/platform-chat/entities') {
          f.traffic.mockedReads.push(endpoint);
          if (url.searchParams.get('type') === 'CUSTOMER') return answer({ message: 'Нет доступа к карточкам клиентов' }, 403);
          if (url.searchParams.get('search') === 'late' && delaySearch) {
            const pending = delaySearch; delaySearch = null; pending.started.resolve(); await pending.release.promise;
            return answer([{ id: task.id, type: 'TASK', title: 'Запоздавшая задача', subtitle: 'Нельзя показывать' }]);
          }
          return answer([{ id: task.id, type: 'TASK', title: 'Результат поиска задачи', subtitle: 'В работе' }]);
        }
        return route.fallback();
      });
      try {
        const p = f.page;
        await p.goto(origin + '/crm', { waitUntil: 'networkidle' });
        await open(p);
        const chat = p.getByRole('dialog', { name: 'Чат платформы' }), list = chat.locator('.message-list');
        await list.getByText('Доступная задача', { exact: true }).waitFor();
        revoked = true; await event(p, 'a');
        const restricted = list.getByRole('button', { name: /Карточка недоступна/ });
        await restricted.waitFor();
        assert.equal(await restricted.isDisabled(), true, 'Restricted reference cannot navigate');
        assert.equal(await list.getByText('Доступная задача', { exact: true }).count(), 0, 'Same message ID must not preserve revoked title');
        assert.equal(await restricted.locator('svg').count(), 1, 'Only neutral lock, no navigation arrow');
        await p.waitForFunction(() => {
          const box = document.querySelector('.platform-chat')?.getBoundingClientRect();
          return box && box.x >= -1 && box.right <= innerWidth + 1;
        });
        const box = await chat.boundingBox();
        assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, 'Chat fits viewport');
        await p.screenshot({ path: path.join(output, width + '-restricted.png') });

        await chat.getByTitle('Прикрепить карточку', { exact: true }).click();
        const picker = chat.locator('.entity-picker');
        await picker.getByText('Результат поиска задачи', { exact: true }).waitFor();
        const slowSearch = delaySearch = { started: deferred(), release: deferred() };
        await picker.getByPlaceholder('Поиск', { exact: true }).fill('late');
        await slowSearch.started.promise;
        await picker.getByRole('button', { name: 'Клиенты', exact: true }).click();
        await picker.getByRole('status').getByText('Нет доступа к карточкам клиентов', { exact: true }).waitFor();
        const settledSearch = p.waitForResponse(response => response.url().includes('search=late'));
        slowSearch.release.resolve(); await settledSearch;
        await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await picker.getByText('Запоздавшая задача', { exact: true }).count(), 0);
        await picker.getByRole('status').waitFor();
        await p.screenshot({ path: path.join(output, width + '-search-denied.png') });
        await chat.getByTitle('Прикрепить карточку', { exact: true }).click();

        const slowRoom = delayMessage = { channel: 'a', started: deferred(), release: deferred() };
        await event(p, 'a'); await slowRoom.started.promise;
        if (width < 800) await chat.getByRole('button', { name: 'Показать каналы', exact: true }).click();
        await chat.locator('.channels').getByRole('button', { name: /Вторая переписка/ }).click();
        await list.getByText('Сообщение второго канала', { exact: true }).waitFor();
        const settledRoom = p.waitForResponse(response => response.url().endsWith('/channels/a/messages'));
        slowRoom.release.resolve(); await settledRoom;
        await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await list.getByText('Первая переписка', { exact: true }).count(), 0);
        const slowClose = delayMessage = { channel: 'b', started: deferred(), release: deferred() };
        await event(p, 'b'); await slowClose.started.promise;
        await chat.getByRole('button', { name: 'Закрыть чат', exact: true }).click();
        const settledClose = p.waitForResponse(response => response.url().endsWith('/channels/b/messages'));
        slowClose.release.resolve(); await settledClose;
        revoked = false; await open(p);
        await list.getByText('Доступная задача', { exact: true }).waitFor();
        assert.equal(await list.getByText('Сообщение второго канала', { exact: true }).count(), 0);

        denyHistory = true; await event(p, 'a');
        await chat.getByText('Нет доступа к переписке', { exact: true }).waitFor();
        assert.equal(await list.getByText('Доступная задача', { exact: true }).count(), 0, 'Failed refresh clears history');
        denyHistory = false; await event(p, 'a');
        await list.getByRole('button', { name: /Доступная задача/ }).click();
        await p.getByRole('dialog', { name: 'Карточка задачи' }).waitFor();
        assert.equal(new URL(p.url()).pathname, '/crm/tasks');
        assert.equal(new URL(p.url()).searchParams.get('task'), task.id);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(value => value !== 'console: Failed to load resource: the server responded with a status of 403 (Forbidden)'), []);
        checks.push(width + ': recipient placeholder, same-ID revocation, failed search, stale search/channel/closed-view responses, denied history and authorized task navigation');
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, width + '-failure.png') });
        console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic })); throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, screenshots: output, network: 'Mock API and inert sockets only' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
