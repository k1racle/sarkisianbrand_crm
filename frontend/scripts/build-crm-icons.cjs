/* Deterministic exports of the supplied SVG. Preserve the original; remove only
 * its full-canvas white backdrop and crop empty margins in the derived assets. */
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
async function main() {
  const folder = path.resolve(__dirname, '../public/crm/pwa');
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    const page = await browser.newPage();
    const source = fs.readFileSync(path.resolve(__dirname, '../../flat-minimalist-mobile-app-icon-for-a-crm-applicat.svg'), 'utf8');
    await page.setContent(source);
    const svg = await page.evaluate(() => {
      const root = document.querySelector('svg');
      if (!root || root.querySelector('script,image,foreignObject')) throw new Error('Expected a self-contained vector');
      const backdrop = root.querySelector('path');
      if (backdrop?.getAttribute('fill') !== 'white' || backdrop.getAttribute('d') !== 'M0 0L1024 0L1024 1024L0 1024L0 0Z') throw new Error('Unknown background; do not remove other white paths');
      backdrop.remove(); root.querySelector('metadata')?.remove(); // Source provenance remains in the untouched original.
      const bounds = root.getBBox(), size = Math.max(bounds.width, bounds.height);
      const x = bounds.x - (size - bounds.width) / 2, y = bounds.y - (size - bounds.height) / 2;
      root.setAttribute('viewBox', `${x} ${y} ${size} ${size}`);
      root.setAttribute('width', '512'); root.setAttribute('height', '512');
      root.setAttribute('role', 'img'); root.setAttribute('aria-label', 'SARKISIAN CRM');
      return new XMLSerializer().serializeToString(root);
    });
    assert.ok(!svg.includes('M0 0L1024 0L1024 1024L0 1024L0 0Z'));
    fs.writeFileSync(path.join(folder, 'icon.svg'), svg + '\n');
    for (const size of [180, 192, 512]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<html><body style="margin:0;${size === 180 ? 'background:#000' : ''}"><img style="width:100%;height:100%;display:block" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" /></body></html>`);
      await page.locator('img').evaluate(img => img.decode());
      await page.screenshot({ path: path.join(folder, `icon-${size}.png`), omitBackground: size !== 180 });
    }
    await page.evaluate(() => {
      document.body.style.background = '#000';
      const img = document.querySelector('img'); img.style.width = '448px'; img.style.height = '448px'; img.style.margin = '32px';
    });
    await page.screenshot({ path: path.join(folder, 'icon-maskable-512.png') });
    console.log('CRM icon: cropped SVG, transparent 192/512 PNG, opaque black iOS/maskable exports');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
