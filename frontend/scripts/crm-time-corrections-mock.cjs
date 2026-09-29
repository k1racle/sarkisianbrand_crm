// Isolated browser fixtures: all reads mocked; writes only update this script's memory.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{isolatedContext}=require('./admin-design-mock.cjs'),{fixtures:base}=require('./crm-rich-fixtures.cjs');
const origin='http://127.0.0.1:3001',output=path.resolve(__dirname,'../.screenshots/crm-time-corrections');
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST'};
const source={id:'51000000-0000-4000-8000-000000000001',version:1,status:'FINISHED',timezone:'Europe/Moscow',startedAt:'2026-09-01T06:00:32Z',endedAt:'2026-09-01T16:00Z',longRunning:false,breaks:[],totals:{workedMs:35968000,breakMs:0},periodTotals:{workedMs:35968000,breakMs:0}};
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(require('./crm-test-browser.cjs')),checks=[];
 try{for(const width of [390,1440]){
  const fixture=await isolatedContext(browser,width,false,false,{fixtures:new Map(base),allowFixtureForms:true}),p=fixture.page;
  let rows=[],lost=false,conflict=false,creates=0,decisions=0;const keys=new Map();
  const proposal={startedAt:'2026-09-01T06:00Z',endedAt:'2026-09-01T15:00Z',timezone:'Europe/Moscow',breaks:[],totals:{workedMs:32400000,breakMs:0}};
  const other={id:'other',sessionId:'team-session',version:1,baseVersion:1,status:'PENDING',reason:'Забыл завершить смену',createdAt:'2026-09-28T10:00Z',employee:{id:'team',firstName:'Анна',lastName:'Тестовая'},proposal,original:source,stale:false,canApprove:true,canReject:true,canCancel:false};
  await fixture.context.route('**/api/v1/crm/work-time**',async route=>{
   const req=route.request(),url=new URL(req.url()),pathname=url.pathname.replace('/api/v1/crm/work-time','');
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='POST'){
    const dto=req.postDataJSON();assert.ok(dto.requestKey);assert.equal('employeeId' in dto,false);
    if(keys.has(dto.requestKey)){assert.deepEqual(keys.get(dto.requestKey).body,dto);return send(keys.get(dto.requestKey).result);}
    if(conflict){conflict=false;return send({message:'Отметка изменена. Обновите данные'},409);}
    let result;
    if(pathname==='/corrections'){
     creates++;assert.equal(dto.timezone,'Europe/Moscow');assert.ok(dto.reason.length>=5);
     result={...other,id:'own-'+creates,employee:{id:'mock-admin',firstName:'Дизайн'},sessionId:dto.sessionId||null,original:dto.sessionId?source:null,reason:dto.reason,canApprove:false,canReject:false,canCancel:true};rows.push(result);
    }else{
     assert.ok(pathname.endsWith('/decision'));decisions++;result=rows.find(r=>pathname.includes('/'+r.id+'/'));
     assert.ok(result);assert.equal(dto.version,result.version);assert.ok(dto.note.length>=3);
     if(dto.action==='APPROVE')assert.equal(result.canApprove,true);
     if(dto.action==='CANCEL')assert.equal(result.canCancel,true);
     Object.assign(result,{status:{APPROVE:'APPROVED',REJECT:'REJECTED',CANCEL:'CANCELLED'}[dto.action],version:result.version+1,canApprove:false,canReject:false,canCancel:false,reviewerName:'Руководитель',reviewedAt:'2026-09-28T11:00Z',reviewNote:dto.note});
    }
    keys.set(dto.requestKey,{body:dto,result});if(lost){lost=false;return send({message:'Ответ потерян после сохранения'},503);}return send(result);
   }
   assert.equal(req.method(),'GET');
   if(pathname==='/corrections/options')return send({canCreate:true,canReview:true,timezone:'Europe/Moscow'});
   if(pathname==='/unclosed')return send({items:[{id:'open',employee:{firstName:'Борис',lastName:'Тестовый'},startedAt:'2026-09-25T06:00Z',timezone:'Europe/Moscow',totals:{workedMs:200000000,breakMs:0}}],page:1,pages:1,total:1});
   if(pathname==='/corrections'){
    const review=url.searchParams.get('scope')==='REVIEW',status=url.searchParams.get('status');
    const items=rows.filter(r=>(review?r.employee.id!=='mock-admin':r.employee.id==='mock-admin')&&(!status||r.status===status));return send({items,page:1,pages:1,total:items.length});
   }
   if(pathname.startsWith('/corrections/'))return send(rows.find(r=>r.id===pathname.split('/').pop()));
   if(pathname==='/current')return send({serverTime:'2026-09-28T12:00Z',timezone:'Europe/Moscow',date:'2026-09-28',todayEndsAt:'2026-09-28T21:00Z',today:{workedMs:0,breakMs:0},active:null,canTrack:true});
   assert.equal(pathname,'');return send({month:'2026-09',timezone:'Europe/Moscow',serverTime:'2026-09-28T12:00Z',totals:source.totals,items:[source],canRequestCorrection:true,plan:{available:true,plannedMs:176*3600000,shifts:22,warning:null}});
  });
  p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());const drawer=p.getByRole('dialog');
  const noOverflow=async()=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
  try{
   await p.goto(origin+'/crm/work-time',{waitUntil:'networkidle'});await p.getByText('176 ч 0 мин',{exact:true}).waitFor();
   await p.getByRole('tab',{name:'Мои отметки',exact:true}).waitFor();await noOverflow();
   await p.getByRole('region',{name:'История рабочего времени',exact:true}).locator('summary').click();await p.getByRole('button',{name:'Исправить отметку',exact:true}).click();
   await drawer.waitFor();assert.equal(await drawer.getByLabel('Начало работы',{exact:true}).inputValue(),'2026-09-01T09:00');
   const rect=await drawer.boundingBox();assert.ok(Math.abs(rect.x+rect.width-width)<3,'Right-hand drawer');
   await drawer.getByLabel('Окончание работы',{exact:true}).fill('2026-09-01T18:00');
   await drawer.getByLabel('Причина исправления',{exact:true}).fill('Забыл выключить счётчик');
   await drawer.getByRole('button',{name:'Добавить перерыв',exact:true}).click();
   await drawer.getByLabel('Начало перерыва 1',{exact:true}).fill('2026-09-01T13:00');await drawer.getByLabel('Конец перерыва 1',{exact:true}).fill('2026-09-01T14:00');
   assert.equal(Math.round(await drawer.getByRole('button',{name:'Отправить на проверку',exact:true}).evaluate(el=>el.getBoundingClientRect().height)),44);
   await p.screenshot({path:path.join(output,width+'-request.png')});await noOverflow();
   conflict=true;await drawer.getByRole('button',{name:'Отправить на проверку',exact:true}).click();await drawer.getByText('Отметка изменена. Обновите данные',{exact:true}).waitFor();
   assert.equal(await drawer.getByLabel('Причина исправления',{exact:true}).inputValue(),'Забыл выключить счётчик');assert.equal(creates,0);
   lost=true;await drawer.getByRole('button',{name:'Отправить на проверку',exact:true}).click();await drawer.getByText('Ответ потерян после сохранения',{exact:true}).waitFor();
   assert.equal(await drawer.getByLabel('Причина исправления',{exact:true}).isDisabled(),true);
   await drawer.getByRole('button',{name:'Проверить сохранение',exact:true}).click();await drawer.waitFor({state:'hidden'});assert.equal(creates,1);
   await p.getByRole('tab',{name:'Мои исправления',exact:true}).click();await p.getByRole('button',{name:'Открыть заявку: Забыл выключить счётчик',exact:true}).click();
   await drawer.getByRole('heading',{name:'Было',exact:true}).waitFor();assert.equal(await drawer.getByRole('button',{name:'Принять исправление',exact:true}).count(),0);
   await drawer.getByLabel('Комментарий к решению',{exact:true}).fill('Перепроверю время');await drawer.getByRole('button',{name:'Отозвать заявку',exact:true}).click();await drawer.waitFor({state:'hidden'});
   await p.getByRole('button',{name:'Добавить пропущенный день',exact:true}).click();await drawer.getByLabel('Начало работы',{exact:true}).fill('2026-09-02T09:00');await drawer.getByLabel('Окончание работы',{exact:true}).fill('2026-09-02T18:00');await drawer.getByLabel('Причина исправления',{exact:true}).fill('Не включил счётчик утром');
   await drawer.getByRole('button',{name:'Отправить на проверку',exact:true}).click();await drawer.waitFor({state:'hidden'});assert.equal(creates,2);
   rows.push(JSON.parse(JSON.stringify(other)));await p.getByRole('tab',{name:'Проверка команды',exact:true}).click();await p.getByText('Борис Тестовый',{exact:true}).waitFor();
   await p.getByRole('button',{name:'Открыть заявку: Забыл завершить смену',exact:true}).click();await drawer.getByLabel('Комментарий к решению',{exact:true}).fill('Сверено с руководителем');
   await p.screenshot({path:path.join(output,width+'-review.png')});await noOverflow();
   await drawer.getByRole('button',{name:'Принять исправление',exact:true}).click();await drawer.waitFor({state:'hidden'});assert.equal(decisions,2);
   rows.push({...other,id:'stale',reason:'Исходный день уже завершён',stale:true,canApprove:false});await p.getByRole('button',{name:'Обновить заявки',exact:true}).click();await p.getByRole('button',{name:'Открыть заявку: Исходный день уже завершён',exact:true}).click();
   await drawer.getByText(/После подачи заявки исходная отметка изменилась/).waitFor();assert.equal(await drawer.getByRole('button',{name:'Принять исправление',exact:true}).count(),0);
   await drawer.getByLabel('Комментарий к решению',{exact:true}).fill('Нужна новая заявка');await drawer.getByRole('button',{name:'Отклонить',exact:true}).click();await drawer.waitFor({state:'hidden'});assert.equal(decisions,3);
   await p.screenshot({path:path.join(output,width+'-team.png'),fullPage:true});await noOverflow();
   for(const key of ['prohibitedWrites','unknownReads','externalRequests','credentialLeaks'])assert.deepEqual(fixture.traffic[key],[],key);
   assert.deepEqual(fixture.errors.filter(e=>!/status of (409|503)/.test(e)),[]);checks.push(width+': plan/actual, right drawer, 44px, draft on conflict, lost-response dedup, own cancel, missing day, team approval, stale rejection, unclosed days');
  }catch(e){await p.screenshot({path:path.join(output,width+'-failure.png'),fullPage:true});console.error(JSON.stringify({errors:fixture.errors,traffic:fixture.traffic}));throw e;}finally{await fixture.context.close();}
 }}finally{await browser.close();}console.log(JSON.stringify({result:'PASS',checks,integrations:'not called',screenshots:output},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
