// All API requests are intercepted. No business data or external video service is touched.
require('../../backend/node_modules/reflect-metadata');
const {chromium}=require('playwright-core'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{fixtures:base,person}=require('./crm-rich-fixtures.cjs');
const {assertWidth,assertTypography}=require('./crm-workspace-smoke.cjs');
const {plainToInstance}=require('../../backend/node_modules/class-transformer'),{validate}=require('../../backend/node_modules/class-validator');
const {CreateMeetingDto,UpdateMeetingDto,CancelMeetingDto}=require('../../backend/dist/src/meetings/meeting.dto');
async function main(){
 const browser=await chromium.launch(require('./crm-test-browser.cjs'));
 const output=path.resolve(__dirname,'../.screenshots/crm-meetings');fs.mkdirSync(output,{recursive:true});
 const year=new Date().getFullYear()+1, member={id:'30000000-0000-4000-8000-000000000001',firstName:'Мария',lastName:'Иванова',isActive:true};
 try{for(const width of [390,1440]){
  let row={id:'30000000-0000-4000-8000-000000000002',title:'Планёрка команды',agenda:'Обсудить задачи',kind:'TEAM',startsAt:`${year}-09-24T07:00:00.000Z`,endsAt:`${year}-09-24T08:00:00.000Z`,timezone:'Europe/Moscow',status:'SCHEDULED',organizerId:person.id,organizer:{...person,isActive:true},members:[member],version:1,canManage:true,videoAvailable:false};
  let rows=[row], conflict=false, readOnly=false, failList=false;const writes=[];
  const f=await isolatedContext(browser,width,false,false,{fixtures:new Map(base),allowFixtureForms:true});const p=f.page;
  await p.route('**/api/v1/crm/meetings**',async route=>{
   const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/meetings','');
   const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const send=(value,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
   if(req.method()==='GET'){
    if(endpoint==='/team')return send({items:[member],hasMore:false});
    if(endpoint){const found=rows.find(item=>endpoint==='/'+item.id);assert.ok(found);return send({...found,canManage:!readOnly&&found.status==='SCHEDULED'});}
    if(failList)return send({message:'Временно недоступно. Повторите загрузку.'},503);
    assert.ok(Number.isFinite(Date.parse(url.searchParams.get('from'))));assert.ok(Number.isFinite(Date.parse(url.searchParams.get('to'))));
    const result=rows.filter(item=>(url.searchParams.get('status')==='ALL'||item.status===url.searchParams.get('status'))&&item.title.includes(url.searchParams.get('q')||'')&&Date.parse(item.startsAt)<Date.parse(url.searchParams.get('to'))&&Date.parse(item.endsAt)>Date.parse(url.searchParams.get('from')));
    return send({items:result.map(item=>({...item,canManage:!readOnly&&item.status==='SCHEDULED'})),total:result.length,page:1,pages:1,canCreate:!readOnly,videoAvailable:false});
   }
   assert.equal(readOnly,false,'Read-only UI may not write');const body=req.postDataJSON();writes.push({method:req.method(),endpoint,body});
   const dto=endpoint.endsWith('/cancel')?CancelMeetingDto:req.method()==='PATCH'?UpdateMeetingDto:CreateMeetingDto;
   assert.deepEqual(await validate(plainToInstance(dto,body),{whitelist:true,forbidNonWhitelisted:true}),[],'Real server DTO');
   if(conflict){conflict=false;return send({message:'Встреча уже изменена. Обновите карточку; ваш черновик пока сохранён.'},409);}
   if(!endpoint){const created={...row,...body,id:'30000000-0000-4000-8000-000000000003',members:[member],version:1};rows.push(created);return send(created,201);}
   const found=rows.find(item=>endpoint==='/'+item.id||endpoint==='/'+item.id+'/cancel');assert.ok(found);assert.equal(body.version,found.version);
   if(endpoint.endsWith('/cancel'))Object.assign(found,{status:'CANCELLED',cancellationReason:body.reason,version:found.version+1});
   else Object.assign(found,body,{version:found.version+1});return send(found);
  });
  try{
   const appearance=(element,properties)=>{const style=getComputedStyle(element);return Object.fromEntries(properties.map(key=>[key,style[key]]));};
   await p.goto('http://127.0.0.1:3001/crm/',{waitUntil:'networkidle'});
   const textProps=['fontFamily','fontSize','fontWeight','color'],panelProps=['backgroundColor','borderTopColor','borderRadius'];
   const dayHeading=await p.locator('h1').evaluate(appearance,textProps),dayPanel=await p.locator('.crm-main .funnel-panel').evaluate(appearance,panelProps);
   const dayRefresh=await p.locator('.head-actions button').first().evaluate(appearance,textProps);
   await p.goto('http://127.0.0.1:3001/crm/meetings',{waitUntil:'networkidle'});
   await p.getByLabel('Месяц',{exact:true}).fill(`${year}-09`);await p.getByRole('button',{name:'Найти',exact:true}).click();
   await p.getByRole('button',{name:'Открыть встречу Планёрка команды'}).waitFor();await assertWidth(p);await assertTypography(p);
   assert.deepEqual(await p.locator('h1').evaluate(appearance,textProps),dayHeading,'Heading matches My Day');
   assert.deepEqual(await p.locator('[aria-label="Расписание встреч"]').evaluate(appearance,panelProps),dayPanel,'Panel matches My Day');
   assert.deepEqual(await p.getByRole('button',{name:'Обновить',exact:true}).evaluate(appearance,textProps),dayRefresh,'Refresh matches My Day');
   const filter=p.getByRole('form',{name:'Фильтры встреч'}), controls=await filter.locator('input,select,button').all();
   const boxes=await Promise.all(controls.map(control=>control.boundingBox()));
   assert.ok(Math.abs(boxes.at(-1).height-44)<=1,'Filter action is 44px, not stretched');
   if(width>=1200){assert.ok(Math.max(...boxes.map(box=>box.y))-Math.min(...boxes.map(box=>box.y))<=2,'All filters in one desktop row');assert.ok((await filter.boundingBox()).height<=110,'Compact filter panel');}
   assert.equal(await p.getByRole('button',{name:/Подключиться|Начать звонок/}).count(),0);
   await p.screenshot({path:path.join(output,`schedule-${width}.png`)});
   await p.getByRole('button',{name:'Новая встреча',exact:true}).click();let dialog=p.getByRole('dialog');await dialog.waitFor();
   const box=await dialog.boundingBox();assert.ok(Math.abs(box.x+box.width-width)<=2,'Drawer aligned to right');assert.ok(box.width<=722);
   await dialog.getByLabel('Название',{exact:true}).fill('Собеседование с кандидатом');await dialog.getByLabel('Тип встречи').selectOption('INTERVIEW');
   await dialog.getByLabel('Начало',{exact:true}).fill(`${year}-09-25T10:00`);await dialog.getByLabel('Окончание',{exact:true}).fill(`${year}-09-25T11:00`);
   await dialog.getByRole('checkbox',{name:'Мария Иванова'}).check();await dialog.getByLabel('Повестка').fill('Опыт работы и вопросы кандидата');
   for(const button of await dialog.locator('.crm-detail-footer button').all()){assert.ok(Math.abs((await button.boundingBox()).height-44)<=1,'Compact footer');}
   await p.screenshot({path:path.join(output,`drawer-${width}.png`)});
   await dialog.getByRole('button',{name:'Сохранить встречу',exact:true}).click();await dialog.waitFor({state:'hidden'});
   assert.equal(writes.length,1);assert.equal(writes[0].body.kind,'INTERVIEW');assert.deepEqual(writes[0].body.memberIds,[member.id]);assert.equal('organizerId' in writes[0].body,false);
   assert.equal(writes[0].body.startsAt,await p.evaluate(value=>new Date(value).toISOString(),`${year}-09-25T10:00`));
   await p.getByRole('button',{name:'Открыть встречу Собеседование с кандидатом'}).click();await dialog.waitFor();
   await dialog.getByLabel('Название',{exact:true}).fill('Собеседование — новый план');conflict=true;
   await dialog.getByRole('button',{name:'Сохранить встречу',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Название',{exact:true}).inputValue(),'Собеседование — новый план');
   await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await dialog.isVisible(),true,'Dismissed unsaved prompt preserves draft');
   await dialog.getByRole('button',{name:'Сохранить встречу',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.at(-1).body.version,1);
   await p.getByRole('button',{name:'Открыть встречу Собеседование — новый план'}).click();await dialog.waitFor();
   await dialog.getByRole('button',{name:'Отменить встречу',exact:true}).click();await dialog.getByLabel('Причина отмены').fill('Кандидат выбрал другое время');
   await dialog.getByRole('button',{name:'Подтвердить отмену'}).click();await dialog.waitFor({state:'hidden'});assert.equal(writes.at(-1).body.version,2);
   await p.getByLabel(/^Статус/).selectOption('CANCELLED');await p.getByRole('button',{name:'Открыть встречу Собеседование — новый план'}).click();await dialog.waitFor();
   assert.equal(await dialog.getByRole('button',{name:'Сохранить встречу'}).count(),0);assert.ok(await dialog.getByLabel('Название',{exact:true}).isDisabled());await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   readOnly=true;await p.getByLabel(/^Статус/).selectOption('SCHEDULED');await p.getByRole('button',{name:'Открыть встречу Планёрка команды'}).click();await dialog.waitFor();
   assert.equal(await dialog.getByRole('button',{name:'Сохранить встречу'}).count(),0);assert.ok(await dialog.getByLabel('Название',{exact:true}).isDisabled());await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await p.getByRole('button',{name:'Новая встреча',exact:true}).count(),0);
   failList=true;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('alert').waitFor();assert.equal(await p.getByRole('button',{name:'Открыть встречу Планёрка команды'}).count(),0);
   failList=false;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('button',{name:'Открыть встречу Планёрка команды'}).waitFor();
   for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   assert.deepEqual(f.errors.filter(error=>!/^console: Failed to load resource: the server responded with a status of (409|503)/.test(error)),[]);
   console.log(`${width}px meetings PASS: scoped UI, drawer, real DTO, create/update/cancel, conflict/dirty draft, read-only, load recovery, 44px footer; real API writes: 0.`);
  }catch(error){console.error({traffic:f.traffic,errors:f.errors,alerts:await p.locator('[role=alert]').allTextContents()});throw error;}
  finally{await f.context.close();}
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
