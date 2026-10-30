/* Standalone live page acceptance: loopback frontend, mock APIs only. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: baseFixtures } = require('./crm-rich-fixtures.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const permissions = [...new Set([...(baseFixtures.get('/auth/access')?.permissions || []), 'lms.read', 'lms.write'])];
const courses = [
  { id: 'course-1', titleRu: 'Маникюр для начинающих', status: 'PUBLISHED', modules: [{ lessons: [{ id: 'lesson-1', title: 'Вопросы и ответы', kind: 'LIVE' }] }] },
  { id: 'course-2', titleRu: 'Педикюр', status: 'DRAFT', modules: [] },
];

async function main() {
  const output = path.resolve(__dirname, '../.screenshots/crm-course-live');
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch();
  try {
    for (const [width, dark] of [[1440, false], [390, true]]) {
      const f = await isolatedContext(browser, width, false, false, { allowFixtureForms: true, fixtures: new Map([['/auth/access', { role:'ADMIN', permissions, denied:[] }]]) });
      const { page, context } = f;
      const calls = [];
      let liveEnabled = false;
      await context.route('**/api/v1/lms/catalog**', route => route.fulfill({json:{items:[],total:0,page:1,pages:1,liveAvailable:liveEnabled}}));
      await context.route('**/api/v1/lms/admin/**', async route => {
        const req = route.request(), url = new URL(req.url()); calls.push(url.pathname);
        if (req.headers().authorization !== 'Bearer mock-admin-design-not-a-valid-jwt') return route.fulfill({status:403, json:{message:'No fixture token'}});
        if (url.pathname === '/api/v1/lms/admin/courses') {
          const q = (url.searchParams.get('search') || '').toLowerCase();
          const items = courses.filter(item => item.titleRu.toLowerCase().includes(q));
          return route.fulfill({json:{items,total:items.length,page:1,pages:1}});
        }
        if (url.pathname.startsWith('/api/v1/lms/admin/live/')) {
          if (!liveEnabled) return route.fulfill({status:503,json:{message:'Эфиры временно недоступны'}});
          if (url.pathname.endsWith('/hosts')) return route.fulfill({json:[{id:'mock-admin',name:'Дизайн Проверка'}]});
          if (url.pathname.endsWith('/course/course-1')) return route.fulfill({json:[{id:'live-1',lessonId:'lesson-1',hostId:'mock-admin',title:'Вопросы и ответы',startsAt:'2099-01-01T10:00:00Z',endsAt:'2099-01-01T11:00:00Z',status:'SCHEDULED'}]});
        }
        return route.fulfill({status:404,json:{message:'Unknown fixture request'}});
      });
      try {
        await context.addCookies([{ name:'sarkisian-crm-theme', value:dark?'dark':'light', url:origin }]);
        await page.goto(origin + '/crm/course-live');
        await page.getByRole('heading',{name:'Онлайн-трансляции'}).waitFor();
        const first = page.getByRole('button',{name:/Маникюр для начинающих/}); await first.waitFor();
        await page.getByText('Онлайн-трансляции пока недоступны.',{exact:false}).waitFor();
        assert.match(await first.innerText(), /Уроков с эфиром: 1/);
        await first.click();
        await page.getByRole('heading',{name:'Маникюр для начинающих'}).waitFor();
        await page.getByRole('alert').getByText('Прямые эфиры готовятся. Управление станет доступно после настройки сервиса трансляций.').waitFor();
        await page.screenshot({path:path.join(output, `${width}-${dark?'dark':'light'}.png`), fullPage:true});
        assert.equal(await page.getByRole('button',{name:'Запланировать'}).count(),0);
        liveEnabled = true;
        await page.getByRole('button',{name:'Обновить'}).click();
        await page.getByRole('heading',{name:'Вопросы и ответы'}).waitFor();
        await page.getByRole('button',{name:'Запланировать'}).waitFor();
        await page.getByRole('button',{name:'Все курсы'}).click();
        await page.getByRole('button',{name:'Обновить'}).click();
        await page.getByText('Онлайн-трансляции пока недоступны.',{exact:false}).waitFor({state:'hidden'});
        await page.getByLabel('Поиск курса').fill('Педикюр');
        await page.getByRole('button',{name:/Педикюр/}).waitFor();
        await page.waitForFunction(() => !document.body.textContent.includes('Маникюр для начинающих'));
        assert.ok(calls.some(url => url.endsWith('/live/course/course-1')));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        console.log(`${width}: live course selector, search and unavailable service PASS`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
