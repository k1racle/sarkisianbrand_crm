/* Synthetic API and localhost only; never connect to a real media server. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = new URL(process.env.STOREFRONT_URL || 'http://127.0.0.1:3019').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const output = path.join(__dirname,'../.screenshots/lms-live-student'); fs.mkdirSync(output,{recursive:true});
const courseId='10000000-0000-4000-8000-000000000001', lessonId='20000000-0000-4000-8000-000000000001', liveId='30000000-0000-4000-8000-000000000001';
const lesson = {id:lessonId,title:'Прямой эфир',kind:'LIVE',isPreview:false,sortOrder:0,content:'Встреча с преподавателем.'};
const course = {id:courseId,titleRu:'Курс маникюра',modules:[{id:'module',title:'Встречи',lessons:[lesson]}]};
async function test(width, enabled) {
  const browser=await chromium.launch(), context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}), page=await context.newPage();
  const bad=[],calls=[],token='fixture-student-token';
  page.on('pageerror',error=>bad.push(error.message));
  page.on('websocket',socket=>bad.push(`Unexpected websocket ${socket.url()}`));
  await context.addCookies([{name:'sb-customer-token',value:token,url:origin}]);
  await context.route('**/*',async route=>{
    const req=route.request(), url=new URL(req.url()), endpoint=url.pathname.replace(/^\/api\/v1/,'');
    if(url.pathname.startsWith('/api/v1/')) {
      calls.push(`${req.method()} ${endpoint}`); const reply=(json,status=200)=>route.fulfill({json,status});
      if(endpoint==='/products/storefront-content')return reply({settings:{},categories:[],banners:[],socialLinks:[],menuItems:[]});
      if(endpoint==='/cart'||endpoint==='/storefront/cart/bind')return reply({items:[],total:0});
      if(endpoint==='/auth/me')return reply({id:'student',role:'CUSTOMER_B2C',firstName:'Тест',email:'student@example.invalid'});
      if(endpoint==='/storefront/favorites')return reply([]);
      if(endpoint==='/lms/certificates/my' && req.method()==='GET')return reply([]);
      if(endpoint===`/lms/my/${courseId}`)return reply({id:'enrollment',courseId,progress:0,isCompleted:false,accessExpiresAt:null,course,lessonsProgress:[]});
      if(endpoint===`/lms/my/${courseId}/lessons/${lessonId}`)return reply(lesson);
      if(endpoint===`/lms/my/${courseId}/lessons/${lessonId}/quiz`)return reply(null);
      if(endpoint===`/lms/certificates/course/${courseId}` && req.method()==='GET')return reply(null);
      if(endpoint===`/lms/my/${courseId}/lessons/${lessonId}/assets`)return reply([]);
      if(endpoint===`/lms/my/${courseId}/lessons/${lessonId}/live`) {
        assert.equal(req.headers().authorization,`Bearer ${token}`);
        return enabled ? reply([{id:liveId,title:'Встреча с мастером',startsAt:'2026-10-30T09:00:00.000Z',endsAt:'2026-10-30T10:00:00.000Z',status:'LIVE'}]) : reply({message:'Сервис ещё не подключён'},503);
      }
      if(endpoint===`/lms/my/${courseId}/lessons/${lessonId}/live/${liveId}/join` && req.method()==='POST'){assert.equal(req.headers().authorization,`Bearer ${token}`);return reply({url:'wss://untrusted.example.invalid',token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.YWJj',role:'viewer',room:`lms-${liveId}`,expiresIn:60});}
      bad.push(`Unexpected ${req.method()} ${endpoint}`); return route.fulfill({status:403,json:{}});
    }
    if(url.origin!==origin||!['GET','HEAD'].includes(req.method())) {bad.push(`Blocked external ${req.method()}`);return route.abort();}
    return route.continue();
  });
  try {
    await page.goto(`${origin}/courses/my/${courseId}`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Прямой эфир'}).click();
    if (!enabled) {
      await page.getByText('Прямые эфиры пока готовятся.',{exact:false}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Подключиться'}).count(),0);
      assert.equal(calls.filter(c=>c.endsWith('/join')).length,0);
    } else {
      await page.getByText('Встреча с мастером').waitFor();
      await page.screenshot({path:path.join(output,`${width}-schedule.png`),fullPage:true});
      await page.getByRole('button',{name:'Подключиться'}).click();
      await page.getByRole('alert').filter({hasText:'Не удалось подключиться'}).waitFor();
      assert.equal(calls.filter(c=>c.endsWith('/join')).length,1);
      assert.equal(await page.locator('.site-live-chat').count(),0);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'No page overflow');
    assert.deepEqual(bad,[]); console.log(`${width}: ${enabled?'reject untrusted media server':'503 shows unavailable without join'} PASS`);
  } finally {await context.close();await browser.close();}
}
(async()=>{for(const width of [1440,390]){await test(width,false);await test(width,true);}})().catch(error=>{console.error(error);process.exitCode=1;});
