// All HTTP data is synthetic. Real API mutations, integrations and credentials remain blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{isolatedContext}=require('./admin-design-mock.cjs'),{fixtures:base}=require('./crm-rich-fixtures.cjs');
const origin='http://127.0.0.1:3001',output=path.resolve(__dirname,'../.screenshots/crm-timesheet');
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET'};
const issues={overlap:false,unclosed:0,pending:0,missing:0,planUnavailable:false};
async function main(){fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(require('./crm-test-browser.cjs')),checks=[];
 try{for(const width of [390,1024,1440]){
  const fixtures=new Map(base);fixtures.set('/crm/work-time/corrections/options',{canCreate:true,canReview:true,timezone:'Europe/Moscow'});
  const f=await isolatedContext(browser,width,false,false,{fixtures,allowFixtureForms:true}),p=f.page;let fail=false,detailFail=false,reads=[];
  const rows=Array.from({length:30},(_,i)=>({employee:{id:'person-'+i,firstName:'Сотрудник',lastName:String(i+1).padStart(2,'0'),isActive:true,department:{name:i<15?'Продажи':'Маркетинг',archivedAt:null}},plannedMs:8*3600000,workedMs:7*3600000,breakMs:3600000,openSessions:0,needsAttention:i===0,planWarning:null,issues:i===0?{...issues,pending:1}:issues}));
  await f.context.route('**/api/v1/crm/work-time/timesheet**',async route=>{
   const req=route.request(),url=new URL(req.url());if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});assert.equal(req.method(),'GET');reads.push(url.pathname+url.search);
   const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)}),suffix=url.pathname.replace('/api/v1/crm/work-time/timesheet','');
   if(suffix==='/options')return send({timezone:'Europe/Moscow',company:true,departments:[{id:'sales',name:'Продажи',archivedAt:null},{id:'marketing',name:'Маркетинг',archivedAt:null}]});
   if(!suffix){
    if(fail){fail=false;return send({message:'Табель временно недоступен'},503);}
    const filtered=rows.filter((row,i)=>(url.searchParams.get('view')!=='ATTENTION'||row.needsAttention)&&(!url.searchParams.get('search')||row.employee.lastName.includes(url.searchParams.get('search')))&&(!url.searchParams.get('departmentId')||(url.searchParams.get('departmentId')==='sales'?i<15:i>=15))),page=Number(url.searchParams.get('page')||1);
    return send({month:url.searchParams.get('month'),timezone:'Europe/Moscow',serverTime:'2026-09-28T12:00Z',scope:'COMPANY',page,pages:Math.max(1,Math.ceil(filtered.length/25)),total:filtered.length,summary:{employees:filtered.length,attention:filtered.filter(row=>row.needsAttention).length,plannedMs:filtered.length*8*3600000,workedMs:filtered.length*7*3600000,breakMs:filtered.length*3600000,unavailablePlan:0,unavailableActual:0},items:filtered.slice((page-1)*25,page*25)});
   }
   if(detailFail){detailFail=false;return send({message:'Не удалось загрузить расшифровку'},503);}
   const row=rows.find(row=>suffix==='/'+row.employee.id);assert.ok(row);
   return send({...row,month:url.searchParams.get('month'),timezone:'Europe/Moscow',serverTime:'2026-09-28T12:00Z',days:Array.from({length:30},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),plannedMs:i?0:8*3600000,workedMs:i?0:7*3600000,breakMs:i?0:3600000,sessionIds:i?[]:['interval'],pendingIds:i?[]:['correction'],openSessions:0,issues:i?issues:{...issues,pending:1}})),intervals:[{id:'interval',startedAt:'2026-09-01T06:00Z',endedAt:'2026-09-01T14:00Z',timezone:'Europe/Moscow',breaks:[{startedAt:'2026-09-01T09:00Z',endedAt:'2026-09-01T10:00Z'}]}],corrections:[{id:'correction',stale:false}]});
  });
  await f.context.route('**/api/v1/crm/work-time/corrections/correction',route=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify({id:'correction',sessionId:'interval',version:1,status:'PENDING',reason:'Нужно проверить отметки',employee:rows[0].employee,original:null,proposal:{startedAt:'2026-09-01T06:00Z',endedAt:'2026-09-01T14:00Z',timezone:'Europe/Moscow',breaks:[],totals:{workedMs:28800000,breakMs:0}},canApprove:true,canReject:true,canCancel:false,stale:false})}));
  const noOverflow=async()=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page overflow');
  const baseline=async(form,input,button,sameRow)=>{
    const a=await form.getByLabel(input,{exact:true}).boundingBox(),b=await form.getByRole('button',{name:button,exact:true}).boundingBox();assert.equal(Math.round(a.height),44,'Input standard height');assert.equal(Math.round(b.height),44,'Button standard height');if(sameRow)assert.ok(Math.abs(a.y+a.height-b.y-b.height)<2,'Input/button baseline aligned');
  };
  try{
   await p.goto(origin+'/crm/work-time',{waitUntil:'networkidle'});await p.getByRole('tab',{name:'Табель команды',exact:true}).waitFor();
   const history=p.getByRole('form',{name:'Фильтры истории времени',exact:true});await baseline(history,'Месяц','Обновить историю',width>=640);await noOverflow();await history.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,width+'-history-filters.png')});
   await p.getByRole('tab',{name:'Табель команды',exact:true}).click();await p.getByText('240 ч 0 мин',{exact:true}).waitFor();const report=p.getByRole('region',{name:'Табель команды',exact:true}),form=p.getByRole('form',{name:'Фильтры табеля',exact:true});
   await baseline(form,'Сотрудник','Обновить табель',width>=768);await noOverflow();assert.equal(await report.getByRole('button',{name:/Открыть табель:/}).count(),25);
   await report.getByRole('button',{name:'Далее',exact:true}).click();await report.getByText('Всего: 30 · Страница 2 / 2',{exact:true}).waitFor();assert.equal(await report.getByRole('button',{name:/Открыть табель:/}).count(),5);await report.getByText('240 ч 0 мин',{exact:true}).waitFor();
   await form.getByRole('combobox',{name:/^Отдел/}).selectOption('sales');await report.getByText('Всего: 15 · Страница 1 / 1',{exact:true}).waitFor();await report.getByText('120 ч 0 мин',{exact:true}).waitFor();
   await form.getByLabel('Сотрудник',{exact:true}).fill('01');await form.getByRole('button',{name:'Обновить табель',exact:true}).click();await report.getByText('Всего: 1 · Страница 1 / 1',{exact:true}).waitFor();
   await p.getByLabel('Только требующие проверки',{exact:true}).check();await report.getByText('Всего: 1 · Страница 1 / 1',{exact:true}).waitFor();await p.screenshot({path:path.join(output,width+'-report.png'),fullPage:true});
   detailFail=true;await report.getByRole('button',{name:'Открыть табель: Сотрудник 01',exact:true}).click();const drawer=p.getByRole('dialog');await drawer.getByText('Не удалось загрузить расшифровку',{exact:true}).waitFor();await drawer.getByRole('button',{name:'Повторить загрузку табеля',exact:true}).click();await drawer.getByRole('heading',{name:'По дням',exact:true}).waitFor();assert.equal(await drawer.locator('details').count(),30);
   const rect=await drawer.boundingBox();assert.ok(Math.abs(rect.x+rect.width-width)<3,'Detail is a right-hand drawer');
   await drawer.locator('summary').first().click();await drawer.getByText(/Перерыв 1:/).waitFor();await p.screenshot({path:path.join(output,width+'-detail.png')});await noOverflow();
   await drawer.getByRole('button',{name:'Открыть исправление 1',exact:false}).click();await p.getByRole('dialog').getByText('Нужно проверить отметки',{exact:true}).waitFor();await p.getByRole('dialog').getByRole('button',{name:'Закрыть исправление',exact:true}).click();
   await p.getByRole('tab',{name:'Табель команды',exact:true}).click();await report.waitFor();fail=true;await form.getByRole('button',{name:'Обновить табель',exact:true}).click();await p.getByText('Табель временно недоступен',{exact:true}).waitFor();assert.equal(await report.count(),0,'Do not leave a stale total after failure');await form.getByRole('button',{name:'Обновить табель',exact:true}).click();await report.waitFor();
   for(const key of ['prohibitedWrites','unknownReads','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors.filter(e=>!/status of 503/.test(e)),[]);checks.push(width+': filter baseline/44px, whole-selection totals/pagination, department/name/problem filters, right day drawer, retry, correction link, no overflow/no real writes');
  }catch(e){await p.screenshot({path:path.join(output,width+'-failure.png'),fullPage:true});console.error(JSON.stringify({errors:f.errors,traffic:f.traffic,reads}));throw e;}finally{await f.context.close();}
 }}finally{await browser.close();}console.log(JSON.stringify({result:'PASS',checks,screenshots:output},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
