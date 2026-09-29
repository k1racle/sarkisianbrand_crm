// Isolated browser fixtures: no real business writes or financial providers.
require('../../backend/node_modules/reflect-metadata');
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{fixtures}=require('./crm-rich-fixtures.cjs'),{assertWidth,assertTypography}=require('./crm-workspace-smoke.cjs');
const {plainToInstance}=require('../../backend/node_modules/class-transformer'),{validate}=require('../../backend/node_modules/class-validator');
const {CreatePaymentPlanDto,UpdatePaymentPlanDto,SetPlannedPaymentDto}=require('../../backend/dist/src/payment-calendar/payment-calendar.dto');
async function main(){const browser=await chromium.launch(require('./crm-test-browser.cjs'));const output=path.resolve(__dirname,'../.screenshots/crm-payment-calendar');fs.mkdirSync(output,{recursive:true});
 try{for(const width of [390,1440]){
  const seed={id:'41000000-0000-4000-8000-000000000001',title:'Сервер сайта',vendor:'Провайдер',category:'SERVERS',notes:'Тестовый тариф',amountCents:150000,startDate:'2026-09-01',endDate:null,frequency:'MONTH',interval:1,visibility:'COMPANY',version:1,scheduleLocked:false};
  const plans=[{...seed}],marks=new Map(),writes=[];let failList=false,conflict=false,readOnly=false,acceptDialog=false;
  const f=await isolatedContext(browser,width,false,false,{fixtures:new Map(fixtures),allowFixtureForms:true}),p=f.page;
  p.removeAllListeners('dialog');p.on('dialog',async d=>{if(acceptDialog){acceptDialog=false;await d.accept();}else await d.dismiss();});
  await p.route('**/api/v1/crm/payment-calendar**',async route=>{
   const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/payment-calendar','');
   const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});const send=(value,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
   if(req.method()==='GET'){
    if(endpoint){const plan=plans.find(v=>'/'+v.id===endpoint);assert.ok(plan);return send(plan);}
    if(failList)return send({message:'Ошибка загрузки. Повторите попытку.'},503);
    const month=url.searchParams.get('month');assert.match(month,/^\d{4}-\d{2}$/);
    const items=plans.map(plan=>{const mark=marks.get(plan.id);return {planId:plan.id,title:plan.title,vendor:plan.vendor,category:plan.category,amountCents:plan.amountCents,dueDate:month+plan.startDate.slice(7),paidOn:mark?.paidOn||null,status:mark?.paidOn?'PAID':month+plan.startDate.slice(7)<'2026-09-24'?'OVERDUE':'PLANNED',version:mark?.version||0,planVersion:plan.version};});
    const sum=filter=>items.filter(filter).reduce((v,item)=>v+item.amountCents,0);
    return send({items,plans,totals:{plannedCents:sum(()=>true),paidCents:sum(v=>v.paidOn),outstandingCents:sum(v=>!v.paidOn),overdueCents:sum(v=>v.status==='OVERDUE')},today:'2026-09-24',canWrite:!readOnly,canSettle:!readOnly,visibilities:['PERSONAL','COMPANY']});
   }
   assert.equal(readOnly,false);const body=req.postDataJSON(),dto=endpoint.endsWith('/settle')?SetPlannedPaymentDto:req.method()==='PATCH'?UpdatePaymentPlanDto:CreatePaymentPlanDto;
   assert.deepEqual(await validate(plainToInstance(dto,body),{whitelist:true,forbidNonWhitelisted:true}),[],'Real backend DTO');writes.push({endpoint,body});
   if(conflict){conflict=false;return send({message:'План изменён. Обновите карточку.'},409);}
   if(!endpoint){const plan={...seed,...body,id:'41000000-0000-4000-8000-000000000002',version:1};plans.push(plan);return send(plan,201);}
   const plan=plans.find(v=>endpoint.startsWith('/'+v.id));assert.ok(plan);
   if(endpoint.endsWith('/settle')){assert.equal(body.planVersion,plan.version);const mark={paidOn:body.paidOn,version:(marks.get(plan.id)?.version||0)+1};marks.set(plan.id,mark);plan.scheduleLocked=true;return send(mark,201);}
   assert.equal(body.version,plan.version);Object.assign(plan,body,{version:plan.version+1});return send(plan);
  });
  try{
   const style=(el)=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.color];};
   await p.goto('http://127.0.0.1:3001/crm/',{waitUntil:'networkidle'});const heading=await p.locator('h1').evaluate(style);
   await p.goto('http://127.0.0.1:3001/crm/payment-calendar',{waitUntil:'networkidle'});await p.getByLabel('Месяц',{exact:true}).fill('2026-09');await p.getByLabel('Месяц',{exact:true}).blur();
   await p.getByRole('button',{name:'Открыть платёж Сервер сайта, 2026-09-01',exact:true}).waitFor();await assertWidth(p);await assertTypography(p);assert.deepEqual(await p.locator('h1').evaluate(style),heading);
   assert.equal(await p.locator('.crm-month-day').count(),30);
   for(const button of await p.getByRole('group',{name:'Вид календаря'}).getByRole('button').all())assert.ok(Math.abs((await button.boundingBox()).height-44)<1,'Compact view switch');
   await p.getByRole('button',{name:'Список',exact:true}).click();assert.equal(await p.locator('.crm-month-day').count(),0);await p.getByRole('button',{name:'Месяц',exact:true}).click();
   if(width===1440){const boxes=await p.getByRole('form',{name:'Фильтры платежей'}).locator('input,select,button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));assert.ok(Math.max(...boxes)-Math.min(...boxes)<2);}
   await p.screenshot({path:path.join(output,`calendar-${width}.png`),fullPage:true});
   await p.getByRole('button',{name:'1 сентября: платежей 1',exact:true}).click();await p.getByRole('button',{name:'Все даты',exact:true}).click();
   await p.getByRole('button',{name:'Новый платёж',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.waitFor();
   const box=await dialog.boundingBox();assert.ok(Math.abs(box.x+box.width-width)<2);assert.ok(box.width<=722);
   await dialog.getByLabel('Название платежа').fill('Интернет офиса');await dialog.getByLabel('Сумма, ₽').fill('1234,56');await dialog.getByLabel('Категория').selectOption('INTERNET');await dialog.getByLabel('Первый платёж').fill('2026-09-24');await dialog.getByLabel('Интервал повторения').fill('3');
   for(const button of await dialog.locator('.crm-detail-footer button').all())assert.ok(Math.abs((await button.boundingBox()).height-44)<1);
   await p.screenshot({path:path.join(output,`drawer-${width}.png`)});
   await dialog.getByRole('button',{name:'Сохранить план',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.at(-1).body.amountCents,123456);assert.equal(writes.at(-1).body.interval,3);
   await p.getByRole('button',{name:'Открыть платёж Интернет офиса, 2026-09-24',exact:true}).click();await dialog.waitFor();
   await dialog.getByLabel('Название платежа').fill('Интернет — новый тариф');conflict=true;await dialog.getByRole('button',{name:'Сохранить план',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Название платежа').inputValue(),'Интернет — новый тариф');
   await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.ok(await dialog.isVisible());await dialog.getByRole('button',{name:'Сохранить план',exact:true}).click();await dialog.waitFor({state:'hidden'});
   await p.getByRole('button',{name:'Открыть платёж Интернет — новый тариф, 2026-09-24',exact:true}).click();await dialog.waitFor();acceptDialog=true;await dialog.getByRole('button',{name:'Отметить оплачено',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.at(-1).body.paid,true);
   await p.getByRole('button',{name:'Открыть платёж Интернет — новый тариф, 2026-09-24',exact:true}).click();await dialog.waitFor();assert.ok(await dialog.getByLabel('Первый платёж').isDisabled());assert.ok(await dialog.getByLabel('Повторение').isDisabled());
   await dialog.getByRole('button',{name:'Снять отметку оплаты',exact:true}).click();await dialog.getByRole('alert').waitFor();await dialog.getByLabel('Причина исправления').fill('Ошибочно отметили');acceptDialog=true;await dialog.getByRole('button',{name:'Снять отметку оплаты',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.at(-1).body.paid,false);
   await p.getByRole('button',{name:'Планы',exact:true}).click();await p.getByRole('button',{name:'Открыть план Сервер сайта',exact:true}).waitFor();
   readOnly=true;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('button',{name:'Открыть план Сервер сайта',exact:true}).click();await dialog.waitFor();assert.ok(await dialog.getByLabel('Название платежа').isDisabled());assert.equal(await dialog.getByRole('button',{name:'Сохранить план',exact:true}).count(),0);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   failList=true;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('alert').waitFor();assert.equal(await p.getByRole('button',{name:'Открыть план Сервер сайта',exact:true}).count(),0);failList=false;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('button',{name:'Открыть план Сервер сайта',exact:true}).waitFor();
   for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   assert.deepEqual(f.errors.filter(e=>!/^console: Failed to load resource: the server responded with a status of (409|503)/.test(e)),[]);
   console.log(`${width}px payment calendar PASS: My Day typography, month/list/plans, right drawer, real DTO, exact kopecks, 409/draft, paid/correction, readonly, load recovery, 44px footer; no real API writes.`);
  }catch(error){console.error({traffic:f.traffic,errors:f.errors,alerts:await p.locator('[role=alert]').allTextContents()});throw error;}finally{await f.context.close();}
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
