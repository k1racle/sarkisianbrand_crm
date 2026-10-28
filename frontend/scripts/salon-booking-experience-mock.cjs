// Public booking UX acceptance. All reads and the one confirmation POST are local fixtures.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { origin, widths, batch } = require('./workspace-design-review.cjs');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { textContrast } = require('./workspace-controls-review.cjs');
const output = path.resolve(__dirname, '../.screenshots/salon-booking-experience' + (batch ? '-' + batch : ''));
const company = '10000000-0000-4000-8000-000000000001', serviceId = '40000000-0000-4000-8000-000000000001', masterId = '20000000-0000-4000-8000-000000000001';
const today = '2026-10-26', tomorrow = '2026-10-27', slot = tomorrow + 'T07:00:00.000Z';
const publicProfile = { name: 'Студия маникюра «Форма»', presentation: { address: 'Москва, Большая Дмитровка, 12', phones: ['+7 900 000-00-00'], emails: [], socialLinks: [] }, today, timeZone: 'Europe/Moscow', horizonDays: 30, workingDays: [1, 2, 3, 4, 5, 6], startMinute: 540, endMinute: 1200, weeklySchedule: [], services: [{ id: serviceId, name: 'Маникюр с покрытием', price: 2200, duration: 90 }], masters: [{ id: masterId, name: 'Анна Мастер' }] };
async function focused(page, heading) { await heading.waitFor(); await page.waitForFunction(e => document.activeElement === e, await heading.elementHandle(), { timeout: 3000 }); assert.equal(await heading.evaluate(e => document.activeElement === e), true, 'Focus follows the current booking phase'); }
async function fit(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  const clipped = await page.locator('.public-salon-booking :is(input,select,button)').evaluateAll(elements => elements.filter(e => e.getClientRects().length).map(e => ({ name: e.getAttribute('aria-label') || e.textContent.trim(), left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })).filter(r => r.left < -1 || r.right > innerWidth + 1));
  assert.deepEqual(clipped, [], `Booking controls fit ${width}px without hidden clipping`);
}
async function main() {
  fs.mkdirSync(output, { recursive: true }); const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try { for (const width of widths) for (const theme of ['light', 'dark']) {
    const f = await isolatedContext(browser, width, true, false, { allowFixtureForms: true }), p = f.page;
    await f.context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
    let failTomorrow = true, releasePost, markPostStarted; const postGate = new Promise(resolve => { releasePost = resolve; }), postStarted = new Promise(resolve => { markPostStarted = resolve; }), reads = [], writes = [];
    await f.context.route('**/booking/**', route => route.request().resourceType() === 'document' ? route.continue() : route.fallback());
    await f.context.route('**/api/v1/salon-booking/**', async route => {
      const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.replace('/api/v1/salon-booking/' + company, '');
      if (req.method() === 'GET' && !endpoint) return route.fulfill({ json: publicProfile });
      if (req.method() === 'GET' && endpoint === '/slots') {
        const values = Object.fromEntries(url.searchParams); reads.push(values);
        assert.equal(values.serviceId, serviceId); assert.equal(values.masterMemberId, masterId);
        if (values.date === tomorrow && failTomorrow) return route.fulfill({ status: 503, json: { message: 'Расписание временно недоступно. Повторите поиск.' } });
        return route.fulfill({ json: { slots: [values.date + 'T07:00:00.000Z', values.date + 'T08:30:00.000Z'], timeZone: 'Europe/Moscow' } });
      }
      if (req.method() === 'POST' && endpoint === '/bookings') {
        const body = req.postDataJSON(); writes.push(body);
        markPostStarted();
        assert.equal(body.serviceId, serviceId); assert.equal(body.masterMemberId, masterId); assert.equal(body.date, tomorrow); assert.equal(body.startTime, slot);
        assert.equal(body.firstName, 'Мария'); assert.equal(body.phone, '79001234567'); assert.equal(body.personalDataConsent, true);
        assert.match(body.requestKey, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        await postGate;
        return route.fulfill({ status: 201, json: { serviceName: publicProfile.services[0].name, startTime: slot, endTime: tomorrow + 'T08:30:00.000Z' } });
      }
      throw new Error('Unexpected synthetic booking operation: ' + req.method() + ' ' + endpoint);
    });
    try {
      await p.goto(origin + '/booking/' + company, { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' });
      await p.getByRole('heading', { name: publicProfile.name, exact: true }).waitFor();
      assert.equal((await p.locator('[aria-current="step"]').innerText()).replace(/\s/g, ''), '1Услуга');
      await p.getByLabel('Услуга', { exact: true }).selectOption(serviceId);
      await p.getByLabel('Мастер', { exact: true }).selectOption(masterId);
      const preview = p.locator('.public-booking-service-preview'); await preview.waitFor();
      assert.ok((await preview.innerText()).replace(/\s/g, '').includes('2200')); assert.ok((await preview.innerText()).includes('90 мин.'));
      const primaryContrast = await textContrast(p.getByRole('button', { name: 'Выбрать время', exact: true }));
      assert.ok(primaryContrast.ratio >= 4.5, `Enabled primary contrast: ${JSON.stringify(primaryContrast)}`);
      await fit(p, width); await p.screenshot({ path: path.join(output, `${width}-${theme}-service.png`), fullPage: true });
      await p.getByRole('button', { name: 'Выбрать время', exact: true }).click();
      await focused(p, p.getByRole('heading', { name: 'Выберите удобное время', exact: true }));
      assert.ok((await p.locator('[aria-current="step"]').innerText()).includes('Время'));
      assert.equal(await p.getByRole('group', { name: 'Ближайшие даты записи', exact: true }).getByRole('button').count(), 7);
      await p.getByRole('button', { name: 'Завтра', exact: true }).click();
      await p.getByRole('alert').filter({ hasText: 'Расписание временно недоступно' }).waitFor();
      const selectedDateContrast = await textContrast(p.getByRole('button', { name: 'Завтра', exact: true }));
      assert.ok(selectedDateContrast.ratio >= 4.5, `Selected date contrast: ${JSON.stringify(selectedDateContrast)}`);
      assert.equal(await p.getByText('На эту дату свободного времени нет.', { exact: false }).count(), 0, 'Unavailable API is not presented as an empty schedule');
      assert.equal(await p.getByRole('button', { name: 'Продолжить', exact: true }).isDisabled(), true);
      assert.ok(reads.some(r => r.date === tomorrow));
      await fit(p, width); await p.screenshot({ path: path.join(output, `${width}-${theme}-slots-error.png`), fullPage: true });
      failTomorrow = false; await p.getByRole('button', { name: 'Повторить поиск времени', exact: true }).click();
      await p.getByRole('group', { name: 'Свободное время', exact: true }).getByRole('button', { name: '10:00', exact: true }).click();
      await p.getByRole('button', { name: 'Продолжить', exact: true }).click();
      await focused(p, p.getByRole('heading', { name: 'Проверьте запись', exact: true }));
      const name = p.getByLabel('Ваше имя', { exact: true }), phone = p.getByLabel('Телефон', { exact: true });
      await name.fill('Мария'); await phone.fill('+7 900 123-45-67'); await p.getByRole('checkbox').check();
      if (width < 800) assert.equal(await name.evaluate(e => getComputedStyle(e).fontSize), '16px', 'Mobile inputs avoid browser zoom');
      await fit(p, width); await p.screenshot({ path: path.join(output, `${width}-${theme}-confirmation.png`), fullPage: true });
      await p.getByRole('button', { name: 'Назад', exact: true }).click();
      await focused(p, p.getByRole('heading', { name: 'Выберите удобное время', exact: true }));
      assert.equal(await p.getByRole('button', { name: '10:00', exact: true }).getAttribute('aria-pressed'), 'true', 'Back retains the chosen time');
      await p.getByRole('button', { name: 'Назад', exact: true }).click();
      await focused(p, p.getByRole('heading', { name: 'Выберите услугу', exact: true }));
      assert.equal(await p.getByLabel('Услуга', { exact: true }).inputValue(), serviceId); assert.equal(await p.getByLabel('Мастер', { exact: true }).inputValue(), masterId);
      await p.getByRole('button', { name: 'Выбрать время', exact: true }).click(); await p.getByRole('button', { name: 'Продолжить', exact: true }).click();
      await focused(p, p.getByRole('heading', { name: 'Проверьте запись', exact: true }));
      assert.equal(await name.inputValue(), 'Мария'); assert.equal(await phone.inputValue(), '+7 900 123-45-67'); assert.equal(await p.getByRole('checkbox').isChecked(), true, 'Back retains contact information and consent');
      await p.getByRole('button', { name: 'Записаться', exact: true }).click();
      await postStarted;
      await p.waitForFunction(() => document.querySelector('.public-booking-primary')?.disabled === true);
      await p.locator('.public-salon-booking form').dispatchEvent('submit');
      assert.equal(writes.length, 1, 'Repeated submission while pending sends one request');
      releasePost();
      await focused(p, p.getByRole('heading', { name: 'Запись создана', exact: true }));
      assert.equal(writes.length, 1); assert.equal(await p.locator('.public-booking-steps').count(), 0);
      await fit(p, width); await p.screenshot({ path: path.join(output, `${width}-${theme}-success.png`), fullPage: true });
      for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
      // Deliberate 503 responses are expected; no runtime exceptions are accepted.
      assert.deepEqual(f.errors.filter(e => !e.includes('503 (Service Unavailable)')), []);
      console.log(`PASS public booking ${width} ${theme}: price/duration, nearest dates, API failure/retry, selected time and contacts survive Back, native consent, phase focus, one confirmation POST.`);
    } finally { releasePost(); await f.context.close(); }
  }} finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
