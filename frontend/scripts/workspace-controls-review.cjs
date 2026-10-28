// Rendered controls acceptance: actual components, native keyboard behavior, no API writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { fixtures, origin, widths, batch } = require('./workspace-design-review.cjs');
const { isolatedContext } = require('./admin-design-mock.cjs');
const controlFixtures = new Map([...fixtures, ['/partners/admin/legal-entities', []]]);
const before = process.argv.includes('--before');
const output = path.resolve(__dirname, '../.screenshots/workspace-controls-' + (batch ? batch + '-' : '') + (before ? 'before' : 'after'));
async function style(control) {
  await control.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
  return control.evaluate(e => {
    const pick = s => ({ width: s.width, height: s.height, radius: s.borderRadius, opacity: s.opacity, content: s.content, background: s.backgroundColor, border: s.border, transform: s.transform, shadow: s.boxShadow });
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { box: { width: r.width, height: r.height }, checked: e.checked, indeterminate: e.indeterminate, role: e.getAttribute('role'), outline: s.outlineStyle + ' ' + s.outlineWidth, opacity: s.opacity, before: pick(getComputedStyle(e, '::before')), after: pick(getComputedStyle(e, '::after')) };
  });
}
async function textContrast(control) {
  await control.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
  return control.evaluate(e => {
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: node => node.textContent.trim() && !node.parentElement.closest('svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const textNode = walker.nextNode(), source = textNode?.parentElement || e;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }), cache = new Map();
    const rgba = value => { if (cache.has(value)) return cache.get(value); ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); const p = [...ctx.getImageData(0, 0, 1, 1).data], result = [...p.slice(0, 3), p[3] / 255]; cache.set(value, result); return result; };
    const blend = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]));
    const lum = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const layers = []; for (let node = source; node; node = node.parentElement) layers.push(rgba(getComputedStyle(node).backgroundColor));
    const bg = layers.reverse().reduce((back, front) => blend(front, back), [255, 255, 255]), a = lum(blend(rgba(getComputedStyle(source).color), bg)), b = lum(bg);
    return { text: e.textContent.trim(), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), color: getComputedStyle(source).color, background: bg };
  });
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), report = [];
  try { for (const width of widths) for (const theme of ['light', 'dark']) {
    const f = await isolatedContext(browser, width, false, false, { fixtures: controlFixtures }), p = f.page;
    await f.context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
    try {
      await p.goto(origin + '/crm/partners/documents', { waitUntil: 'networkidle' });
      await p.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' }); // Exclude development tooling from product QA.
      if (!before && width < 360) {
        const home = p.locator('.crm-mobile-tabs').getByRole('link', { name: 'Мой день', exact: true }); await home.waitFor();
        assert.equal(await home.getAttribute('title'), 'Мой день');
        assert.equal(await home.locator('.crm-mobile-label-short').isVisible(), true);
        assert.equal(await home.locator('.crm-mobile-label-full--day').isVisible(), false);
        assert.deepEqual(await p.locator('.crm-mobile-tabs span:visible').evaluateAll(nodes => nodes.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)), [], 'Narrow mobile captions are fully readable');
      }
      const documentTabs = p.getByRole('tablist', { name: 'Разделы документов', exact: true });
      const signatureTab = documentTabs.getByRole('tab', { name: 'SMS-подпись', exact: true });
      await signatureTab.click();
      assert.equal(await signatureTab.getAttribute('aria-selected'), 'true');
      await p.getByRole('tabpanel', { name: 'SMS-подпись', exact: true }).waitFor();
      const tabStates = [];
      assert.equal(await documentTabs.getByRole('tab').count(), 4, 'Every document section participates in control-state acceptance');
      for (const tab of await documentTabs.getByRole('tab').all()) {
        await tab.hover(); const hover = await textContrast(tab); assert.ok(hover.ratio >= 4.5, `Tab hover contrast ${JSON.stringify(hover)}`);
        await tab.focus(); const focus = await textContrast(tab); assert.ok(focus.ratio >= 4.5, `Tab focus contrast ${JSON.stringify(focus)}`);
        tabStates.push({ hover, focus });
      }
      await signatureTab.focus(); await signatureTab.press('ArrowRight');
      const entitiesTab = documentTabs.getByRole('tab', { name: 'Реквизиты', exact: true });
      assert.equal(await entitiesTab.getAttribute('aria-selected'), 'true', 'ArrowRight selects the next tab');
      assert.equal(await entitiesTab.evaluate(e => e === document.activeElement), true, 'Roving tab selection moves keyboard focus');
      await entitiesTab.press('Home');
      assert.equal(await documentTabs.getByRole('tab', { name: 'Шаблоны', exact: true }).getAttribute('aria-selected'), 'true', 'Home selects the first tab');
      await documentTabs.getByRole('tab', { name: 'Шаблоны', exact: true }).press('End');
      assert.equal(await entitiesTab.getAttribute('aria-selected'), 'true', 'End selects the last tab');
      await entitiesTab.press('ArrowLeft');
      assert.equal(await signatureTab.getAttribute('aria-selected'), 'true', 'ArrowLeft returns to the signature tab');
      assert.equal(await signatureTab.evaluate(e => e === document.activeElement), true);
      const checkbox = p.locator('.pds-doc-checks input[value="SERVICE_AGREEMENT"]');
      const target = await p.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crm-control-height')));
      assert.ok([36,44].includes(target), 'Control targets use an explicit supported density token');
      if(width<1024)assert.equal(target,44,'Mobile keeps44px touch targets in either saved density');
      assert.equal(await checkbox.isChecked(), true);
      const checked = await style(checkbox);
      await checkbox.focus(); await checkbox.press('Space');
      assert.equal(await checkbox.isChecked(), false, 'Space removes an allowed document from the local selection');
      const unchecked = await style(checkbox);
      assert.notDeepEqual(unchecked, checked, 'Selected and unselected states differ visibly');
      await checkbox.press('Space'); assert.equal(await checkbox.isChecked(), true);
      await checkbox.evaluate(e => { e.indeterminate = true; });
      const mixed = await style(checkbox); assert.equal(mixed.indeterminate, true);
      if (!before) {
        assert.ok(checked.box.width >= target && checked.box.height >= target, 'Checkbox target respects the current density; touch remains44px');
        assert.ok(parseFloat(checked.before.radius) < parseFloat(checked.before.width) / 2, 'Selection is a square checkbox, not a switch');
        assert.notDeepEqual(mixed.after, checked.after, 'Mixed state has its own visible mark');
        assert.ok(!mixed.outline.startsWith('none') && !mixed.outline.endsWith(' 0px'), 'Keyboard focus is visible');
      }
      await p.screenshot({ path: path.join(output, `${width}-${theme}-selection-mixed.png`), fullPage: true });
      await checkbox.evaluate(e => { e.indeterminate = false; e.disabled = true; });
      const disabled = await style(checkbox); assert.ok(Number(disabled.opacity) < Number(checked.opacity), 'Disabled selection is visibly distinct');
      await p.screenshot({ path: path.join(output, `${width}-${theme}-selection-disabled.png`), fullPage: true });
      await checkbox.evaluate(e => { e.disabled = false; });
      if (!before && width >= 1024) {
        await p.getByRole('button', { name: 'Свернуть меню CRM', exact: true }).click();
        assert.equal(await p.locator('.crm-app--compact').count(), 1);
        assert.ok((await p.locator('.crm-app-sidebar').boundingBox()).width < 100);
        assert.equal((await f.context.cookies()).find(c => c.name === 'sarkisian-crm-sidebar-compact')?.value, 'true');
        await p.reload({ waitUntil: 'networkidle' });
        await p.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' });
        assert.equal(await p.locator('.crm-app--compact').count(), 1, 'Desktop compact preference survives reload');
        await p.screenshot({ path: path.join(output, `${width}-${theme}-sidebar-compact.png`) });
        await p.setViewportSize({ width: 390, height: 960 });
        const more = p.getByRole('button', { name: 'Открыть разделы CRM', exact: true }); await more.click();
        const mobileMenu = p.getByRole('dialog', { name: 'Разделы CRM', exact: true });
        assert.ok((await mobileMenu.boundingBox()).width >= 300, 'Saved desktop compaction never shrinks mobile navigation');
        assert.ok(await mobileMenu.locator('.crm-navigation a').first().isVisible());
        await p.keyboard.press('Escape'); await mobileMenu.waitFor({ state: 'hidden' });
        assert.equal(await more.evaluate(e => e === document.activeElement), true, 'Escape returns focus to the mobile menu opener');
        await p.setViewportSize({ width, height: 960 });
        assert.equal(await p.locator('.crm-app--compact').count(), 1, 'Returning to desktop retains the saved compact preference');
        const allSections = p.locator('.crm-navigation button[aria-controls="crm-all-sections-list"]');
        await allSections.focus(); await allSections.press('Enter');
        assert.equal(await p.locator('.crm-app--compact').count(), 0, 'Keyboard opening all sections expands the compact sidebar');
        assert.equal(await allSections.evaluate(e => document.activeElement === e), true, 'Focus stays on the all-sections disclosure');
        assert.equal(await allSections.getAttribute('aria-expanded'), 'true', 'All-sections disclosure exposes its expanded state');
        await p.locator('#crm-all-sections-list').waitFor({ state: 'visible' });
        const module = p.locator('.crm-nav-module > summary').first();
        await module.focus();
        if (await module.evaluate(e => e.parentElement.open)) await module.press('Enter');
        await module.press('Enter');
        assert.equal(await module.evaluate(e => document.activeElement === e), true, 'Keyboard opening a nested module retains focus');
        assert.equal(await module.evaluate(e => e.parentElement.open), true, 'Nested module child navigation opens');
        assert.ok(await module.locator('..').locator('.crm-nav-children a').first().isVisible());
      }
      if (width < 1024) await p.getByRole('button', { name: 'Открыть разделы CRM', exact: true }).click();
      await p.locator('.crm-sidebar-profile').click();
      const dialog = p.getByRole('dialog', { name: 'Профиль пользователя', exact: true }); await dialog.waitFor();
      await dialog.getByRole('tab', { name: 'Уведомления', exact: true }).click();
      const toggle = dialog.locator('.notification-list input').first();
      const on = await style(toggle); assert.equal(on.checked, true);
      await toggle.focus(); await toggle.press('Space'); assert.equal(await toggle.isChecked(), false);
      const off = await style(toggle); assert.notDeepEqual(off, on);
      if (!before) {
        assert.equal(on.role, 'switch', 'Boolean preference is explicitly a switch');
        assert.ok(parseFloat(on.before.radius) >= parseFloat(on.before.width) / 2, 'Switch retains the track shape');
        assert.ok(on.box.width >= target && on.box.height >= target);
        assert.notDeepEqual(on.after, off.after, 'Switch thumb moves between states');
      }
      await p.screenshot({ path: path.join(output, `${width}-${theme}-switch-off.png`) });
      await toggle.press('Space'); assert.equal(await toggle.isChecked(), true);
      await p.screenshot({ path: path.join(output, `${width}-${theme}-switch-on.png`) });
      const primaryStates = [];
      if (!before) {
        await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
        for (const route of ['/crm/', '/crm/customers', '/crm/tasks', '/crm/partners/documents']) {
          await p.goto(origin + route, { waitUntil: 'networkidle' }); await p.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' });
          await p.locator('.crm-app h1').first().waitFor();
          const primary = p.locator('.crm-button--primary:visible:enabled'); assert.ok(await primary.count(), route + ' has a primary action');
          for (const button of await primary.all()) {
            const ordinary = await textContrast(button); assert.ok(ordinary.ratio >= 4.5, `Primary default ${route}: ${JSON.stringify(ordinary)}`);
            await button.hover(); const hover = await textContrast(button); assert.ok(hover.ratio >= 4.5, `Primary hover ${route}: ${JSON.stringify(hover)}`);
            await button.focus(); const focus = await textContrast(button); assert.ok(focus.ratio >= 4.5, `Primary focus ${route}: ${JSON.stringify(focus)}`);
            primaryStates.push({ route, ordinary, hover, focus });
          }
        }
      }
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
      assert.deepEqual(f.errors, []);
      report.push({ width, theme, target, tabStates, primaryStates, checked, unchecked, mixed, disabled, on, off });
      console.log(`PASS ${width} ${theme}: checkbox keyboard/mixed/disabled, preference switch${!before && width >= 1024 ? ', compact sidebar reload/module keyboard' : ''}.`);
    } catch (error) { await p.screenshot({ path: path.join(output, `${width}-${theme}-failure.png`), fullPage: true }); throw error; }
    finally { await f.context.close(); }
  }} finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
}
module.exports = { textContrast, style };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
