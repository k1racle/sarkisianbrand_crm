const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const problems = [];
  let cartSession;
  let cartItemId;
  try {
    const api = 'http://localhost:3000/api/v1';
    const slug = 'gel-muss-kamufliruyushchiy-23';
    const product = await fetch(`${api}/products/${slug}`).then(r => r.json());
    const page = await browser.newPage({ viewport: { width: 1536, height: 960 } });
    page.on('pageerror', e => problems.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('console.time')) problems.push(m.text()); });
    await page.goto(`http://localhost:3001/products/${slug}`, { waitUntil: 'networkidle' });
    const image = await page.locator('.sb-product-gallery > img').evaluate(image => ({ loaded: image.complete && image.naturalWidth > 0, width: image.clientWidth, gallery: image.parentElement.clientWidth }));
    if (!image.loaded || image.width < image.gallery * .98) problems.push('Product image is missing or does not fill gallery');
    await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click();
    const adding = page.waitForResponse(r => r.url().endsWith('/cart/items') && r.request().method() === 'POST');
    await page.locator('.sb-product-buy > .sb-primary').click();
    const response = await adding;
    const added = await response.json();
    cartSession = (await page.context().cookies()).find(cookie => cookie.name === 'sb-cart-session')?.value;
    cartItemId = added.items?.find(item => item.variant.product.id === product.id)?.id;
    if (!response.ok() || !cartItemId || added.items.find(item => item.id === cartItemId).quantity !== 2) problems.push('Real add-to-cart failed');
    await page.locator('.sb-product-heart').click();
    if ((await page.locator('.sb-product-heart').getAttribute('aria-pressed')) !== 'true') problems.push('Favorite action failed');
    await page.locator('.sb-product-details summary').nth(1).click();
    if (!(await page.locator('.sb-product-details dl').isVisible())) problems.push('Product details did not open');
    const output = path.join(__dirname, '..', '.screenshots'); fs.mkdirSync(output, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(output, 'storefront-product-redesign-desktop.png') });
    const widths = [];
    for (const width of [360, 390, 760, 1024, 1536]) {
      await page.setViewportSize({ width, height: 960 });
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      widths.push(layout);
      if (layout.scrollWidth > width + 1) problems.push(`Product overflow at ${width}`);
      if (width === 390) await page.screenshot({ path: path.join(output, 'storefront-product-redesign-mobile.png'), fullPage: true });
    }
    const isolated = await browser.newPage();
    const mock = { ...product, variants: [{ ...product.variants[0], id: 'out-of-stock', name: 'Нет в наличии', stock: 0, reserved: 0 }, { ...product.variants[0], id: 'selected-variant', name: 'Другой вариант', price: '1840', stock: 3, reserved: 1 }] };
    await isolated.route(`**/api/v1/products/${slug}`, route => route.fulfill({ json: mock }));
    let requested;
    await isolated.route('**/api/v1/cart/items', route => { requested = route.request().postDataJSON(); return route.fulfill({ json: { items: [], total: 0 } }); });
    await isolated.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    await isolated.locator(`a[href="/products/${slug}"]`).first().click();
    await isolated.waitForURL(`**/products/${slug}`);
    await isolated.locator('.sb-product-variant select').waitFor();
    await isolated.locator('.sb-product-variant select').selectOption('out-of-stock');
    if (!(await isolated.locator('.sb-product-buy > .sb-primary').isDisabled())) problems.push('Out-of-stock purchase is enabled');
    await isolated.locator('.sb-product-variant select').selectOption('selected-variant');
    if (!(await isolated.locator('.sb-product-price').innerText()).includes('1 840')) problems.push('Variant price did not update');
    await isolated.getByRole('button', { name: 'Увеличить количество', exact: true }).click();
    if (!(await isolated.getByRole('button', { name: 'Увеличить количество', exact: true }).isDisabled())) problems.push('Reserved stock is not respected');
    await isolated.locator('.sb-product-buy > .sb-primary').click();
    await isolated.waitForTimeout(200);
    if (requested?.variantId !== 'selected-variant' || requested?.quantity !== 2) problems.push('Selected variant was not sent to cart');
    console.log(JSON.stringify({ image, realCartAdd: Boolean(cartItemId), widths, selectedVariantRequest: requested, problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally {
    if (cartItemId && cartSession) await fetch(`http://localhost:3000/api/v1/cart/items/${cartItemId}`, { method: 'DELETE', headers: { 'x-cart-session': cartSession } });
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
