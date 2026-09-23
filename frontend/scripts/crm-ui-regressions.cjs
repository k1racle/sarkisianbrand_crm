// Filled tables, native toggle behaviour, matched task/deal cards and toolbar.
// All API traffic is intercepted; no production data or settings are changed.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures } = require('./crm-rich-fixtures.cjs');
const output = path.resolve(__dirname, '../.screenshots/crm-ui-regressions');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const p = f.page;
      try {
        await p.goto('http://127.0.0.1:3001/crm/settings/accounts', { waitUntil: 'networkidle' });
        await p.locator('.account-row:not(.head)').first().waitFor();
        if (width > 1000) {
          const table = await p.evaluate(() => {
            const head = document.querySelector('.crm-table-head'), rows = [...document.querySelectorAll('button.account-row')];
            return { head: [...head.children].map(e => e.getBoundingClientRect().x), rows: rows.map(row => [...row.children].map(e => e.getBoundingClientRect().x)) };
          });
          assert.ok(table.rows.length >= 2, 'Filled accounts table');
          for (const row of table.rows) row.forEach((left, i) => assert.ok(Math.abs(left - table.head[i]) <= 2, `Account column ${i} aligned: ${left}/${table.head[i]}`));
        }
        await p.screenshot({ path: path.join(output, `${width}-accounts.png`) });
        await p.goto('http://127.0.0.1:3001/crm/referrals/settings', { waitUntil: 'networkidle' });
        const toggle = p.getByRole('checkbox').first();
        await toggle.waitFor();
        const wasChecked = await toggle.isChecked();
        const size = await toggle.boundingBox();
        assert.equal(size.width, 44); assert.equal(size.height, 44);
        await toggle.focus(); await p.keyboard.press('Space');
        assert.equal(await toggle.isChecked(), !wasChecked, 'Native keyboard toggle');
        await p.screenshot({ path: path.join(output, `${width}-toggle.png`) });
        await p.keyboard.press('Space'); // Restore the local unsaved setting, never submit.
        const cardMetrics = [];
        for (const [route, opener] of [['/crm/tasks', '.task-card'], ['/crm/deals', '.deal']]) {
          await p.goto('http://127.0.0.1:3001' + route, { waitUntil: 'networkidle' });
          if (route.endsWith('deals')) {
            assert.equal(await p.getByRole('button', { name: 'Добавить сделку в этап', exact: true }).count(), 0);
            const select = await p.getByLabel('Воронка продаж').boundingBox();
            const search = await p.getByLabel('Поиск сделок').boundingBox();
            if (width >= 1200) assert.ok(Math.abs(select.y - search.y) <= 2, 'Desktop filters share one row');
            else assert.ok(search.y > select.y + select.height, 'Mobile filters stack');
            await p.screenshot({ path: path.join(output, `${width}-pipeline.png`) });
          }
          await p.locator(opener).first().click();
          const card = p.locator('.crm-detail-card'); await card.waitFor();
          for (const tab of ['Общее', 'Подзадачи', 'Вложения', 'Комментарии', 'История изменений']) {
            await card.getByRole('tab', { name: tab, exact: true }).click();
            const buttons = await card.locator('.crm-detail-footer > button').evaluateAll(es => es.map(e => ({ height: e.getBoundingClientRect().height, bottom: e.getBoundingClientRect().bottom })));
            assert.ok(buttons.length >= 2);
            for (const button of buttons) { assert.equal(button.height, 44, 'Footer buttons never stretch'); assert.ok(button.bottom <= p.viewportSize().height); }
            for (const heading of await card.locator('.crm-icon-heading:visible').all()) {
              const aligned = await heading.evaluate(e => {
                const icon = e.querySelector('svg').getBoundingClientRect(), text = e.querySelector('span').getBoundingClientRect();
                return Math.abs(icon.y + icon.height / 2 - text.y - text.height / 2) <= 1 && text.x - icon.right >= 7 && getComputedStyle(e.querySelector('span')).fontWeight === '600';
              });
              assert.ok(aligned, 'Icon and heading text are centred on the same line');
            }
            if (tab === 'Подзадачи') {
              cardMetrics.push(await card.evaluate(e => ({ width: e.getBoundingClientRect().width, gutter: getComputedStyle(e.querySelector('.crm-detail-body')).paddingLeft, sectionInset: e.querySelector('.crm-detail-section').getBoundingClientRect().top - e.querySelector('.crm-detail-body').getBoundingClientRect().top })));
            }
            await p.screenshot({ path: path.join(output, `${width}-${route.split('/').pop()}-${tab}.png`) });
          }
          await card.getByRole('button', { name: 'Отмена', exact: true }).click();
        }
        assert.deepEqual(cardMetrics[0], cardMetrics[1], 'Task/deal detail layout is identical');
        await p.goto('http://127.0.0.1:3001/crm/content-plan', { waitUntil: 'networkidle' });
        for (const create of [true, false]) {
          if (create) await p.getByRole('button', { name: 'Новая публикация', exact: true }).click();
          else await p.locator('.crm-publication').first().click();
          const panel = p.locator('.crm-content-editor'), body = panel.locator('.crm-detail-body');
          const box = await panel.boundingBox();
          assert.equal(box.y, 0); assert.equal(box.x + box.width, width);
          assert.equal(box.width, Math.min(720, width)); assert.equal(box.height, p.viewportSize().height);
          const header = await panel.locator(':scope > header').boundingBox();
          const footer = await panel.locator('.crm-detail-footer').boundingBox();
          await body.evaluate(e => { e.scrollTop = e.scrollHeight; });
          assert.ok(await body.evaluate(e => e.scrollTop > 0), 'Publication body scrolls');
          assert.deepEqual(await panel.locator(':scope > header').boundingBox(), header, 'Publication header stays fixed');
          assert.deepEqual(await panel.locator('.crm-detail-footer').boundingBox(), footer, 'Publication actions stay fixed');
          await body.evaluate(e => { e.scrollTop = 0; });
          await p.screenshot({ path: path.join(output, `${width}-${create ? 'new-' : ''}publication-drawer.png`) });
          await panel.getByRole('button', { name: 'Закрыть', exact: true }).click();
        }
        for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors, []);
        console.log(`${width}px: filled accounts, toggle keyboard, all task/deal tabs, compact footers and pipeline toolbar PASS`);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
