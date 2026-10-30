/* Test creation and taking with isolated API fixtures, never a real course. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const output = path.resolve(__dirname, '../.screenshots/lms-quiz'); fs.mkdirSync(output,{recursive:true});
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3019').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const courseId='10000000-0000-4000-8000-000000000001', lessonId='20000000-0000-4000-8000-000000000001';
const lesson={id:lessonId,title:'Первый урок',kind:'TEXT',content:'Текст урока',sortOrder:0,isPreview:false,isPublished:true,hasDraftChanges:false,revision:1,assets:[]};
const course={id:courseId,titleRu:'Обучение',status:'PUBLISHED',tariffs:[],modules:[{id:'module-1',title:'Модуль',sortOrder:0,lessons:[lesson]}]};
async function author(browser,width) {
  const access={role:'ADMIN',permissions:['lms.read','lms.write'],denied:[]};
  const f=await isolatedContext(browser,width,false,false,{allowFixtureForms:true,fixtures:new Map([['/auth/access',access]])});
  let quiz={revision:0,enabled:false,passingPercent:70,questions:[],isPublished:false,hasDraftChanges:false};
  const writes=[];
  await f.context.route('**/api/v1/lms/admin/**',async route=>{
    const req=route.request(), url=new URL(req.url()), method=req.method(), path=url.pathname;
    if(path.endsWith('/courses')&&method==='GET') return route.fulfill({json:{items:[course],total:1,page:1,pages:1}});
    if(path.endsWith(`/courses/${courseId}`)&&method==='GET') return route.fulfill({json:course});
    if(path.endsWith(`/lessons/${lessonId}/assets`)&&method==='GET') return route.fulfill({json:[]});
    if(path.endsWith(`/lessons/${lessonId}/quiz`)&&method==='GET') return route.fulfill({json:quiz});
    if(path.endsWith(`/lessons/${lessonId}/quiz`)&&method==='PUT') {const body=req.postDataJSON();writes.push(body);quiz={...body,revision:body.revision+1,isPublished:false,hasDraftChanges:true};return route.fulfill({json:quiz});}
    return route.fulfill({status:404,json:{message:'Unexpected fixture request'}});
  });
  try {
    await f.page.goto(origin+'/crm/courses');
    await f.page.getByRole('button',{name:/Обучение/}).last().click();
    await f.page.getByRole('button',{name:'Изменить урок Первый урок'}).click();
    const editor=f.page.getByRole('region',{name:'Тест урока'});
    await editor.getByRole('button',{name:'Добавить тест'}).click();
    await editor.getByRole('button',{name:'Сохранить тест'}).click();
    await editor.getByRole('alert').filter({hasText:'Заполните вопросы'}).waitFor();
    assert.equal(writes.length,0);
    await editor.getByLabel('Текст вопроса').fill('Сколько этапов?');
    await editor.getByLabel('Вариант 1 вопроса 1').fill('Один'); await editor.getByLabel('Вариант 2 вопроса 1').fill('Два');
    await editor.getByLabel('Вариант 2 — правильный').check();
    await editor.screenshot({path:path.join(output,`editor-${width}.png`)});
    await editor.getByRole('button',{name:'Сохранить тест'}).click();
    await editor.getByText('Тест сохранён.',{exact:false}).waitFor();
    assert.deepEqual(writes[0],{revision:0,enabled:true,passingPercent:70,questions:[{text:'Сколько этапов?',options:['Один','Два'],correctIndex:1}]});
    await editor.getByRole('button',{name:'Убрать тест'}).click();
    await editor.getByRole('button',{name:'Сохранить тест'}).click();
    await editor.getByText('Тест сохранён.',{exact:false}).waitFor();
    assert.deepEqual(writes[1],{revision:1,enabled:false,passingPercent:70,questions:[]});
    assert.deepEqual(f.traffic.externalRequests,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.errors,[]);
    console.log(`${width}: creating and removing a quiz with versioned draft PASS`);
  } finally { await f.context.close(); }
}
async function student(browser,width) {
  const token='fixture-quiz-student', bad=[], attempts=[]; let issued=null;
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}), page=await context.newPage();
  await context.addCookies([{name:'sb-customer-token',value:token,url:origin}]);
  await context.route('**/*',async route=>{
    const req=route.request(), url=new URL(req.url()), path=url.pathname.replace(/^\/api\/v1/,'');
    if(url.pathname.startsWith('/api/v1/')) {
      const reply=json=>route.fulfill({json});
      if(path==='/products/storefront-content')return reply({settings:{},categories:[],banners:[],socialLinks:[],menuItems:[]});
      if(path==='/cart'||path==='/storefront/cart/bind')return reply({items:[],total:0});
      if(path==='/auth/me')return reply({id:'student',role:'CUSTOMER_B2C',firstName:'Ученик',email:'student@example.invalid'});
      if(path==='/storefront/favorites')return reply([]);
      if(path==='/lms/certificates/my'&&req.method()==='GET')return reply(issued?[issued]:[]);
      if(path===`/lms/certificates/course/${courseId}`&&req.method()==='GET')return reply(issued);
      if(path===`/lms/certificates/course/${courseId}`&&req.method()==='POST') {assert.equal(req.headers().authorization,`Bearer ${token}`);assert.equal(attempts.length,2);issued={id:'30000000-0000-4000-8000-000000000001',courseId,fullName:'Тест Ученик',courseTitle:'Обучение',issuedAt:'2026-10-30T00:00:00Z'};return reply(issued);}
      if(path==='/lms/certificates/30000000-0000-4000-8000-000000000001/file'&&req.method()==='GET') {assert.equal(req.headers().authorization,`Bearer ${token}`);return route.fulfill({contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});}
      if(path==='/lms/my')return reply([{id:'enrollment',courseId,progress:100,isCompleted:true,accessExpiresAt:null,course}]);
      if(path===`/lms/my/${courseId}`)return reply({id:'enrollment',courseId,progress:0,isCompleted:false,accessExpiresAt:null,course,lessonsProgress:[]});
      if(path===`/lms/my/${courseId}/lessons/${lessonId}`)return reply(lesson);
      if(path===`/lms/my/${courseId}/lessons/${lessonId}/assets`)return reply([]);
      if(path===`/lms/my/${courseId}/lessons/${lessonId}/quiz`)return reply({revision:2,passingPercent:70,questions:[{text:'Сколько этапов?',options:['Один','Два']}],hasPassed:false});
      if(path===`/lms/my/${courseId}/lessons/${lessonId}/quiz/attempts`&&req.method()==='POST') {assert.equal(req.headers().authorization,`Bearer ${token}`);const body=req.postDataJSON();attempts.push(body);return reply(attempts.length===1?{passed:false,score:0,correctCount:0,total:1,progress:0,isCompleted:false}:{passed:true,score:100,correctCount:1,total:1,progress:100,isCompleted:true});}
      bad.push(`Unexpected API ${req.method()} ${path}`); return route.fulfill({status:403,json:{}});
    }
    if(url.origin!==origin||!['GET','HEAD'].includes(req.method())){bad.push('Blocked external');return route.abort();}
    return route.continue();
  });
  page.on('pageerror',e=>bad.push(e.message));
  try {
    await page.goto(`${origin}/courses/my/${courseId}`);
    await page.getByRole('button',{name:'Первый урок'}).click();
    await page.getByRole('heading',{name:'Проверка знаний'}).waitFor();
    await page.getByRole('region',{name:'Тест урока'}).screenshot({path:path.join(output,`student-${width}.png`)});
    assert.equal(await page.getByRole('button',{name:'Отметить пройденным'}).count(),0);
    await page.getByRole('button',{name:'Проверить ответы'}).click();
    await page.getByRole('alert').filter({hasText:'Ответьте на все вопросы'}).waitFor(); assert.equal(attempts.length,0);
    await page.getByLabel('Один').check(); await page.getByRole('button',{name:'Проверить ответы'}).click();
    await page.getByText('Пока не пройдено').waitFor();
    await page.getByRole('button',{name:'Пройти ещё раз'}).click(); await page.getByLabel('Два').check();
    await page.getByRole('button',{name:'Проверить ответы'}).click(); await page.getByText('Тест пройден',{exact:true}).waitFor();
    assert.deepEqual(attempts,[{revision:2,answers:[0]},{revision:2,answers:[1]}]);
    await page.getByRole('button',{name:'Получить сертификат'}).click();
    await page.getByText('Сертификат оформлен на Тест Ученик.',{exact:false}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Скачать сертификат'}).click()]);
    assert.equal(download.suggestedFilename(),'sarkisian-certificate.pdf');
    await page.goto(`${origin}/courses/my`); await page.getByRole('heading',{name:'Мои сертификаты'}).waitFor();
    await page.getByRole('button',{name:'Скачать PDF'}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
    assert.deepEqual(bad,[]); console.log(`${width}: quiz retry, progress, certificate issuance and PDF download PASS`);
  } finally {await context.close();}
}
(async()=>{const browser=await chromium.launch();try{for(const width of [1440,390]){await author(browser,width);await student(browser,width)}}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
