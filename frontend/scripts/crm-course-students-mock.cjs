/* Isolated CRM students page acceptance. No real accounts or APIs. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures } = require('./crm-rich-fixtures.cjs');
const assert = require('node:assert/strict');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const access = { role:'ADMIN', permissions:[...new Set([...(fixtures.get('/auth/access')?.permissions || []),'lms.read'])], denied:[] };
const student = { id:'enrollment-1', enrolledAt:'2026-10-01T00:00:00Z', effectiveStatus:'ACTIVE', accessExpiresAt:null,
  user:{id:'user-1',firstName:'Анна',lastName:'Иванова',email:'student@example.invalid',phone:null,isActive:true}, course:{id:'course-1',title:'Маникюр'}, totalLessons:2,completedLessons:1,progress:50 };
(async()=>{
  const browser = await chromium.launch();
  try {
    for (const [width,dark] of [[1440,false],[390,true]]) {
      const {page,context}=await isolatedContext(browser,width,false,false,{fixtures:new Map([['/auth/access',access]])});
      try {
        await context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
        await context.route('**/api/v1/lms/admin/students**',route=>{
          const url=new URL(route.request().url());
          if(route.request().headers().authorization!=='Bearer mock-admin-design-not-a-valid-jwt') return route.fulfill({status:403});
          const search=url.searchParams.get('search')||'';
          const items=search && !'анна иванова'.includes(search.toLowerCase())?[]:[student];
          return route.fulfill({json:{items,total:items.length,page:1,pages:1}});
        });
        await page.goto(origin+'/crm/course-students');
        await page.getByRole('heading',{name:'Ученики'}).waitFor();
        await page.getByText('Анна Иванова').waitFor();
        assert.equal(await page.getByText('Пройдено 1 из 2 · 50%').count(),1);
        assert.equal(await page.getByText('Доступ открыт').count(),1);
        await page.getByLabel('Поиск ученика или курса').fill('Ничего не найдено');
        await page.getByRole('heading',{name:'Ничего не найдено'}).waitFor();
        await page.getByLabel('Поиск ученика или курса').fill('Анна Иванова');
        await page.getByText('Анна Иванова').waitFor();
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow,false,'no horizontal page overflow');
        console.log(`${width}: student list, course progress and search PASS`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
