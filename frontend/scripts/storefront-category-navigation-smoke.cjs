/* Public category GET only; optional browser mode mocks every API and blocks all actual writes. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('../../backend/node_modules/typescript');
const frontend = path.resolve(__dirname, '..');
const api = process.env.STOREFRONT_API || 'http://localhost:3000/api/v1';
const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const exportsMock = {};
const js = ts.transpileModule(fs.readFileSync(path.join(frontend, 'composables/useStorefrontCatalog.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', js)(exportsMock);
const { storefrontCatalogLink: link, storefrontCategoryGroups: groups, storefrontActiveCategories: active, storefrontCatalogMenu: resolveMenu } = exportsMock;
const fixtures = [
  { id: 'root', slug: 'root', nameRu: 'Корневая', parentId: null },
  { id: 'child', slug: 'child', nameRu: 'Дочерняя', parentId: 'root' },
  { id: 'grandchild', slug: 'grandchild', nameRu: 'Вложенная', parentId: 'child' },
  { id: 'orphan', slug: 'orphan', nameRu: 'Без родителя', parentId: 'missing' },
  { id: 'inactive', slug: 'inactive', nameRu: 'Скрытая', isActive: false },
  { id: 'cycle-a', slug: 'cycle-a', nameRu: 'Цикл A', parentId: 'cycle-b' },
  { id: 'cycle-b', slug: 'cycle-b', nameRu: 'Цикл B', parentId: 'cycle-a' },
];

function checkLinks(categories) {
  const grouped = groups(categories);
  const flat = grouped.flatMap(group => [group, ...group.items]);
  assert.equal(flat.length, active(categories).length);
  assert.equal(new Set(flat.map(category => category.slug)).size, flat.length);
  for (const category of flat) {
    const url = new URL(link(category), base);
    assert.equal(url.pathname, '/catalog');
    assert.equal(url.searchParams.get('category'), category.slug);
    assert.equal(url.searchParams.has('search'), false);
    assert(active(categories).some(actual => actual.slug === url.searchParams.get('category')));
  }
  return grouped;
}

function checkMenuSettings() {
  const categories = [
    ...fixtures,
    { id: 'second-child', slug: 'second-child', nameRu: 'Вторая дочерняя', parentId: 'root' },
    { id: 'under-inactive', slug: 'under-inactive', nameRu: 'Под скрытой', parentId: 'inactive' },
    { id: 'new-category', slug: 'new-category', nameRu: 'Новая из БД' },
  ];
  const original = JSON.stringify(categories);
  const config = {
    entries: [
      { categoryId: 'deleted', label: 'Удалённая', isVisible: false },
      { categoryId: 'orphan', label: 'Переименована', isVisible: true },
      { categoryId: 'second-child', label: 'Сначала эта', isVisible: true },
      { categoryId: 'root', label: 'Новый заголовок', isVisible: true },
      { categoryId: 'child', label: 'Затем эта', isVisible: true },
      { categoryId: 'orphan', label: 'Дубликат проигнорирован', isVisible: false },
      { categoryId: 'cycle-a', isVisible: false },
    ],
    quickLinks: [
      { key: 'invalid', label: 'Нельзя', url: 'https://provider.invalid' },
      { key: 'gift-card', label: 'Подарить карту', url: '/catalog?search=fake' },
      { key: 'popular', label: 'Хиты', isVisible: false },
      { key: 'new', label: 'Свежие поступления' },
      { key: 'gift-card', isVisible: false },
    ],
  };
  const resolved = resolveMenu(categories, config);
  assert.deepEqual(resolved.groups.slice(0, 2).map(group => group.id), ['orphan', 'root']);
  const root = resolved.groups.find(group => group.id === 'root');
  assert.equal(root.nameRu, 'Корневая', 'Menu settings changed actual category/home name');
  assert.equal(root.label, 'Новый заголовок');
  assert.deepEqual(root.items.map(item => item.id), ['second-child', 'child', 'grandchild']);
  assert.equal(root.items[2].label, 'Затем эта / Вложенная');
  assert(resolved.groups.some(group => group.id === 'new-category'), 'New DB categories must append visible');
  const flat = resolved.groups.flatMap(group => [group, ...group.items]);
  assert(!flat.some(category => ['inactive', 'under-inactive', 'cycle-a', 'cycle-b', 'deleted'].includes(category.id)));
  assert.equal(new Set(flat.map(category => category.id)).size, flat.length);
  assert.deepEqual(resolved.quickLinks.map(item => [item.key, item.label, item.url]), [
    ['gift-card', 'Подарить карту', '/products/gift-card'], ['new', 'Свежие поступления', '/catalog?sort=new'],
  ]);
  const hidden = resolveMenu(categories, { entries: [{ categoryId: 'root', isVisible: false }] });
  assert(!hidden.groups.flatMap(group => [group, ...group.items]).some(category => ['root', 'child', 'second-child', 'grandchild'].includes(category.id)), 'Hidden ancestor exposed descendants');
  assert.deepEqual(resolveMenu(categories).quickLinks.map(item => item.key), ['new', 'popular', 'gift-card']);
  assert.deepEqual(resolveMenu(categories, { entries: null, quickLinks: {} }).quickLinks.map(item => item.key), ['new', 'popular', 'gift-card']);
  assert.deepEqual(resolveMenu(categories, { quickLinks: [{ key: 'new', label: ' ' }] }).quickLinks.map(item => item.label), ['Новинки', 'Бестселлеры', 'Подарочная карта']);
  assert.equal(JSON.stringify(categories), original, 'Resolver mutated categories shared with homepage');
  return 'PASS';
}

async function browserChecks(categories) {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block' });
      const blocked = [], errors = [];
      let catalogMenu = null, catalogMenuRevision = 0;
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        const endpoint = url.pathname.replace(/^\/api\/v1/, '');
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
        if (request.method() !== 'GET' && request.method() !== 'HEAD') {
          blocked.push(request.method() + ' ' + url.pathname);
          return route.fulfill({ status: 501, json: { message: 'Actual writes prohibited' } });
        }
        if (url.pathname.startsWith('/api/v1/')) {
          if (endpoint === '/products/storefront-content') return route.fulfill({ json: { settings: { announcementText: 'SARKISIAN BRAND', catalogMenu, catalogMenuRevision }, categories, banners: [], socialLinks: [], menuItems: [] } });
          if (endpoint === '/products/categories') return route.fulfill({ json: categories });
          if (endpoint === '/products') return route.fulfill({ json: { items: [], total: 0, pagination: { pages: 0 } } });
          if (endpoint === '/products/filters') return route.fulfill({ json: { categories, purposes: [], features: [], price: { min: 0, max: 0 } } });
          if (endpoint === '/cart') return route.fulfill({ json: { items: [], total: 0 } });
          if (endpoint === '/storefront/favorites') return route.fulfill({ json: [] });
          blocked.push(request.method() + ' ' + endpoint);
          return route.fulfill({ status: 501, json: { message: 'Unknown isolated API' } });
        }
        if (url.origin !== new URL(base).origin) { blocked.push(request.url()); return route.abort('blockedbyclient'); }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        const homeLinks = await page.locator('.sb-home-category').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
        assert.equal(homeLinks.length, Math.min(4, active(categories).length));
        for (const href of homeLinks) { const url = new URL(href, base); assert(!url.searchParams.has('search')); assert(categories.some(category => category.slug === url.searchParams.get('category'))); }
        const trigger = page.locator(width < 760 ? '.sb-mobile-nav button[aria-label="Каталог"]' : '.sb-header .sb-catalog-button');
        await trigger.click();
        const drawer = page.locator('.sb-catalog-drawer');
        await drawer.waitFor();
        await page.waitForFunction(expected => document.querySelectorAll('.sb-catalog-menu a').length === expected, active(categories).length);
        const drawerLinks = await drawer.locator('.sb-catalog-menu a').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
        assert.deepEqual(drawerLinks.map(href => new URL(href, base).searchParams.get('category')).sort(), active(categories).map(category => category.slug).sort());
        assert(drawerLinks.every(href => !new URL(href, base).searchParams.has('search')));
        assert.equal(await drawer.getByRole('link', { name: /Новинки/ }).getAttribute('href'), '/catalog?sort=new');
        await drawer.getByRole('button', { name: 'Закрыть каталог', exact: true }).click();
        await drawer.waitFor({ state: 'hidden' });
        catalogMenu = {
          entries: [...categories].reverse().map(category => ({ categoryId: category.id, label: 'Меню: ' + category.nameRu, isVisible: category.id !== categories[0]?.id })),
          quickLinks: [{ key: 'gift-card', label: 'Подарить карту' }, { key: 'popular', isVisible: false }, { key: 'new', label: 'Свежие поступления' }],
        };
        catalogMenu.entries.unshift({ categoryId: 'deleted-category-id', label: 'Удалённая', isVisible: true });
        catalogMenuRevision++;
        const configured = resolveMenu(categories, catalogMenu);
        const expectedCategoryLinks = configured.groups.flatMap(group => [group, ...group.items]).map(link);
        await trigger.click();
        await drawer.waitFor();
        await page.waitForFunction(expected => document.querySelectorAll('.sb-catalog-menu a').length === expected, expectedCategoryLinks.length);
        assert.deepEqual(await drawer.locator('.sb-catalog-menu a').evaluateAll(elements => elements.map(element => element.getAttribute('href'))), expectedCategoryLinks);
        assert.deepEqual(await drawer.locator('.sb-catalog-menu h3').allTextContents(), configured.groups.map(group => group.label));
        assert.deepEqual(await drawer.locator('.sb-catalog-quick a').evaluateAll(elements => elements.map(element => element.getAttribute('href'))), configured.quickLinks.map(item => item.url));
        assert.deepEqual(await drawer.locator('.sb-catalog-quick b').allTextContents(), configured.quickLinks.map(item => item.label));
        assert(!(await page.locator('.sb-home-category').allTextContents()).some(text => text.includes('Меню:')), 'Configured drawer labels changed home category names');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
        results.push({ width, passed: true, realCategorySlugs: drawerLinks.length, homeCards: homeLinks.length, catalogMenuSettings: true, reopeningRefresh: true, actualApiWrites: 0 });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return results;
}

async function main() {
  const menuSettings = checkMenuSettings();
  const tree = checkLinks(fixtures);
  assert.equal(tree.find(group => group.id === 'root').items[1].label, 'Дочерняя / Вложенная');
  assert.equal(link(), '/catalog');
  let categories = fixtures;
  if (!process.argv.includes('--fixtures-only')) {
    const response = await fetch(api + '/products/categories', { method: 'GET', redirect: 'error' });
    assert(response.ok, 'Public category GET failed'); categories = await response.json();
    assert(Array.isArray(categories)); checkLinks(categories);
  }
  const browser = process.argv.includes('--browser') ? await browserChecks(categories) : 'not-run';
  console.log(JSON.stringify({ categoryLinks: 'PASS', hierarchy: 'PASS', menuSettings, actualCategories: active(categories).length, browser, actualApiWrites: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
