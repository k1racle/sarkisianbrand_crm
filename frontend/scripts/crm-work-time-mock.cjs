// Browser-only fixtures. Every API write is intercepted; no employee attendance is changed.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core'), { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const { timeTotals } = require('../../backend/dist/src/work-time/work-time.policy');
const origin = 'http://127.0.0.1:3001', output = path.resolve(__dirname, '../.screenshots/crm-work-time');
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
const rowId = '51000000-0000-4000-8000-000000000001';
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try { for (const width of [390, 1440]) {
    const f = await isolatedContext(browser, width, false, false, { fixtures: new Map(base) }), p = f.page;
    let record = null, now = new Date('2026-09-28T06:00Z'), lost = false, failRead = false, stale = false, readonly = false, writeCount = 0;
    const keys = new Set(), actions = [];
    const view = () => record ? { ...record, status: record.endedAt ? 'FINISHED' : record.breaks.some(b => !b.endedAt) ? 'BREAK' : 'WORKING', longRunning: !record.endedAt && +now - +record.startedAt >= 86400000, totals: timeTotals(record, now), periodTotals: timeTotals(record, now) } : null;
    await f.context.route('**/api/v1/crm/work-time**', async route => {
      const req = route.request(), u = new URL(req.url());
      if (/\/corrections|\/unclosed/.test(u.pathname)) return route.fallback();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const send = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() === 'POST') {
        assert.equal(u.pathname, '/api/v1/crm/work-time/actions'); const dto = req.postDataJSON(); writeCount++;
        assert.equal(readonly, false); assert.ok(dto.requestKey); assert.equal('employeeId' in dto, false); assert.equal('startedAt' in dto, false);
        if (keys.has(dto.requestKey)) return send({ reused: true, sessionId: rowId });
        if (stale) { stale = false; return send({ message: 'Состояние рабочего дня изменилось. Обновите данные' }, 409); }
        if (dto.action === 'START') { assert.equal(dto.version, 0); assert.equal(record?.endedAt == null && record !== null, false); record = { id: rowId, version: 1, timezone: 'Europe/Moscow', startedAt: now, endedAt: null, breaks: [] }; }
        else {
          assert.equal(dto.sessionId, rowId); assert.equal(dto.version, record.version); record.version++;
          if (dto.action === 'PAUSE') record.breaks.push({ startedAt: now, endedAt: null });
          if (['RESUME', 'FINISH'].includes(dto.action)) for (const pause of record.breaks) if (!pause.endedAt) pause.endedAt = now;
          if (dto.action === 'FINISH') record.endedAt = now;
        }
        keys.add(dto.requestKey); actions.push(dto.action);
        if (lost) { lost = false; return send({ message: 'Соединение прервано после сохранения' }, 503); }
        return send({ reused: false, sessionId: rowId });
      }
      assert.equal(req.method(), 'GET');
      if (failRead) return send({ message: 'Сервис времени недоступен' }, 503);
      const row = view(), totals = row?.totals || { workedMs: 0, breakMs: 0 };
      if (u.pathname.endsWith('/current')) return send({ serverTime: now, timezone: 'Europe/Moscow', date: '2026-09-28', todayEndsAt: '2026-09-28T21:00Z', today: totals, active: row && !row.endedAt ? row : null, canTrack: !readonly });
      const month = u.searchParams.get('month');
      return send({ month, timezone: 'Europe/Moscow', serverTime: now, totals: month === '2026-09' ? totals : { workedMs: 0, breakMs: 0 }, items: row && month === '2026-09' ? [row] : [] });
    });
    p.removeAllListeners('dialog'); p.on('dialog', dialog => dialog.accept());
    const style = el => { const s = getComputedStyle(el); return [s.fontFamily, s.fontSize, s.fontWeight, s.color]; };
    const assertWidth = async () => assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow');
    const clock = p.getByRole('region', { name: 'Мой рабочий день', exact: true });
    try {
      await p.goto(origin + '/crm/', { waitUntil: 'networkidle' });
      const heading = await p.locator('h1').evaluate(style);
      await clock.getByRole('button', { name: 'Начать рабочий день', exact: true }).waitFor();
      lost = true; await clock.getByRole('button', { name: 'Начать рабочий день', exact: true }).click();
      await clock.getByText('Соединение прервано после сохранения', { exact: true }).waitFor();
      await clock.getByRole('button', { name: 'Проверить сохранение', exact: true }).click();
      await clock.getByRole('button', { name: 'Начать перерыв', exact: true }).waitFor();
      assert.equal(writeCount, 2); assert.equal(actions.length, 1, 'Lost response recovery does not start a second day');
      await p.screenshot({ path: path.join(output, width + '-my-day.png') });
      await clock.getByRole('link', { name: 'История времени', exact: true }).click();
      await p.getByRole('heading', { name: 'Рабочее время', exact: true }).waitFor();
      assert.deepEqual(await p.locator('h1').evaluate(style), heading, 'Same typography as My day');
      await p.getByLabel('Месяц', { exact: true }).fill('2026-09'); await p.getByLabel('Месяц', { exact: true }).blur();
      now = new Date('2026-09-28T07:00Z'); await clock.getByRole('button', { name: 'Начать перерыв', exact: true }).click();
      await clock.getByRole('button', { name: 'Вернуться к работе', exact: true }).waitFor();
      await p.reload({ waitUntil: 'networkidle' }); await clock.getByText('На перерыве', { exact: true }).waitFor();
      assert.equal(await clock.getByRole('button', { name: 'Вернуться к работе', exact: true }).evaluate(el => Math.round(el.getBoundingClientRect().height)), 44);
      await assertWidth(); await p.screenshot({ path: path.join(output, width + '-pause.png'), fullPage: true });
      now = new Date('2026-09-28T07:30Z'); await clock.getByRole('button', { name: 'Вернуться к работе', exact: true }).click();
      await clock.getByRole('button', { name: 'Начать перерыв', exact: true }).waitFor();
      stale = true; await clock.getByRole('button', { name: 'Начать перерыв', exact: true }).click();
      await clock.getByText('Состояние рабочего дня изменилось. Обновите данные', { exact: true }).waitFor();
      await clock.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
      now = new Date('2026-09-28T08:30Z'); await clock.getByRole('button', { name: 'Завершить день', exact: true }).click();
      await clock.getByRole('button', { name: 'Начать рабочий день', exact: true }).waitFor();
      await p.getByText(/2 ч 0 мин работы/).waitFor();
      await p.locator('summary').filter({ hasText: '2 ч 0 мин работы' }).click();
      await p.getByText(/Перерыв 1:/).waitFor();
      assert.deepEqual(actions, ['START', 'PAUSE', 'RESUME', 'FINISH']);
      await assertWidth(); await p.screenshot({ path: path.join(output, width + '-history.png'), fullPage: true });
      readonly = true; await clock.getByRole('button', { name: 'Обновить отметки', exact: true }).click();
      await clock.getByText('Отметки доступны только для просмотра.', { exact: true }).waitFor(); assert.equal(await clock.getByRole('button', { name: 'Начать рабочий день', exact: true }).count(), 0);
      failRead = true; await clock.getByRole('button', { name: 'Обновить отметки', exact: true }).click();
      await clock.getByText('Сервис времени недоступен', { exact: true }).waitFor();
      assert.equal(await clock.getByText('Работа сегодня', { exact: true }).count(), 0);
      for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
      assert.deepEqual(f.errors.filter(e => !/status of (409|503)/.test(e)), []);
      checks.push(width + ': My day, start, lost-response replay, pause/reload/resume, conflict, finish/history, readonly/error, typography/44px/no overflow');
    } catch (e) { await p.screenshot({ path: path.join(output, width + '-failure.png'), fullPage: true }); console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic })); throw e; }
    finally { await f.context.close(); }
  } } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, integrations: 'not called', screenshots: output }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
