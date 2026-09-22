/* Deterministic raster exports of our code-owned vector icon for PWA/iOS. */
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const folder = path.resolve(__dirname, '../public/crm/pwa');
  const browser = await chromium.launch({ executablePath: process.env.CRM_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage();
    const svg = fs.readFileSync(path.join(folder, 'icon.svg'), 'utf8');
    for (const size of [180, 192, 512]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<html><body style="margin:0"><img style="width:100%;height:100%;display:block" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" /></body></html>`);
      await page.locator('img').evaluate(img => img.decode());
      await page.screenshot({ path: path.join(folder, `icon-${size}.png`) });
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
