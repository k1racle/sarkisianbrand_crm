// Isolated browser contract: no real salon, email or provider is contacted.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const origin = new URL(process.env.SALON_MANAGEMENT_TEST_ORIGIN || 'http://127.0.0.1:3003').origin;
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname));
const organizationId = '11111111-1111-4111-8111-111111111111';
const key = '22222222-2222-4222-8222-222222222222', token = key + '.' + 'a'.repeat(64);
const today = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), start = today + 'T09:00:00.000Z', next = today + 'T10:00:00.000Z';
const profile = { name:'Тестовый салон', timeZone:'UTC', today, horizonDays:30, services:[{id:'service',name:'Маникюр',duration:60,price:1000}], masters:[{id:'master',name:'Мастер'}], presentation:{logoUrl:null,phones:[],emails:[],socialLinks:[]} };
let booking = { id:'booking',serviceName:'Маникюр',startTime:start,endTime:today+'T10:00:00.000Z',timeZone:'UTC',status:'NEW',version:1,canChange:true };
const writes = [];

async function main() {
  const browser = await chromium.launch({ headless:true });
  try {
    for (const width of [1440, 390]) {
      booking = { ...booking, startTime:start, endTime:today+'T10:00:00.000Z', status:'NEW', version:1, canChange:true };
      const context = await browser.newContext({ viewport:{width,height:900} });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!url.pathname.startsWith('/api/v1/salon-booking/')) return url.origin === origin ? route.continue() : route.abort();
        if (url.origin !== origin && !(url.hostname === 'localhost' && url.port === '3000') && !(url.hostname === '127.0.0.1' && url.port === '3000')) return route.abort();
        assert.equal(url.search.includes(token), false);
        let payload = profile;
        if (url.pathname.endsWith('/slots') && request.method() === 'GET') payload = {slots:[start],timeZone:'UTC'};
        else if (url.pathname.endsWith('/bookings')) {
          const body=request.postDataJSON(); assert.match(body.requestKey,/^[a-f0-9-]{36}$/i); assert.equal(body.email,'test@example.invalid');
          payload={...booking,manageToken:token}; writes.push('create');
        } else if (url.pathname.includes('/manage/')) {
          const body=request.postDataJSON(); assert.equal(body.token,token); writes.push(url.pathname.split('/').at(-1));
          if (url.pathname.endsWith('/slots')) payload={slots:[next],timeZone:'UTC'};
          else if (url.pathname.endsWith('/move')) { assert.equal(body.version,booking.version); booking={...booking,startTime:next,version:2}; payload=booking; }
          else if (url.pathname.endsWith('/cancel')) { assert.equal(body.version,booking.version); booking={...booking,status:'CANCELLED',version:3,canChange:false}; payload=booking; }
          else payload=booking;
        }
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
      });
      const page=await context.newPage(); page.on('dialog', dialog=>dialog.accept());
      await page.goto(`${origin}/booking/${organizationId}`, {waitUntil:'networkidle'});
      await page.getByLabel('Услуга', {exact:true}).selectOption('service'); await page.getByLabel('Мастер', {exact:true}).selectOption('master');
      await page.getByRole('button',{name:'Выбрать время'}).click();
      await page.getByRole('button',{name:'09:00'}).click(); await page.getByRole('button',{name:'Продолжить'}).click();
      await page.getByLabel('Ваше имя').fill('Тест'); await page.getByLabel('Телефон').fill('+79000000000'); await page.getByLabel(/Email/).fill('test@example.invalid'); await page.getByRole('checkbox').check();
      await page.getByRole('button',{name:'Записаться'}).click(); await page.getByRole('heading',{name:'Запись создана'}).waitFor();
      const href=await page.getByRole('link',{name:'Управлять записью'}).getAttribute('href'); assert.ok(href.endsWith('#token='+token));
      await page.goto(href,{waitUntil:'networkidle'}); await page.getByRole('heading',{name:'Управление записью'}).waitFor();
      await page.getByLabel('Новая дата').fill(today); await page.getByRole('button',{name:'Показать свободное время'}).click(); await page.getByRole('button',{name:'10:00'}).click();
      await page.getByRole('button',{name:/Перенести на/}).click(); await page.getByText('Запись перенесена. Новое время сохранено.').waitFor();
      await page.getByRole('button',{name:'Отменить запись'}).click(); await page.getByText('Запись отменена.',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Отменить запись'}).count(),0);
      await context.close(); console.log(`PASS public booking and management ${width}px`);
    }
    assert.deepEqual(writes.filter(v=>v==='create'),['create','create']);
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
