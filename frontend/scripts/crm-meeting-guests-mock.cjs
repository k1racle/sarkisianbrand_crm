// Isolated browser fixtures; every API request intercepted, no real guests or media calls.
require('../../backend/node_modules/reflect-metadata');
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{fixtures:base,person}=require('./crm-rich-fixtures.cjs');
const {assertWidth,assertTypography}=require('./crm-workspace-smoke.cjs');
const {plainToInstance}=require('../../backend/node_modules/class-transformer'),{validate}=require('../../backend/node_modules/class-validator');
const {CreateMeetingInvitationDto,DecideMeetingGuestDto,MeetingGuestVersionDto,JoinMeetingGuestDto,MeetingGuestTicketDto}=require('../../backend/dist/src/meetings/meeting-guests.dto');
const origin='http://127.0.0.1:3001',secret='a'.repeat(43),ticket='b'.repeat(43),pin='01234567';
const id='31000000-0000-4000-8000-000000000001',inviteId='31000000-0000-4000-8000-000000000002',guestId='31000000-0000-4000-8000-000000000003';
const meeting={id,title:'Собеседование',agenda:'Закрытая повестка',kind:'INTERVIEW',startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),timezone:'Europe/Moscow',status:'SCHEDULED',organizerId:person.id,organizer:{...person,isActive:true},members:[],version:1,canManage:true,videoAvailable:false};
const expiresAt=new Date(Date.now()+5400000).toISOString();
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH'};
const safeTraffic=f=>{for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors.filter(error=>!/^console: Failed to load resource: the server responded with a status of (409|503)/.test(error)),[]);};
const dto=async(type,body)=>assert.deepEqual(await validate(plainToInstance(type,body),{whitelist:true,forbidNonWhitelisted:true}),[],'Real backend guest DTO');
async function main(){
 const browser=await chromium.launch(require('./crm-test-browser.cjs')),out=path.resolve(__dirname,'../.screenshots/crm-meeting-guests');fs.mkdirSync(out,{recursive:true});
 try{for(const width of [390,1440]){
  const f=await isolatedContext(browser,width,false,false,{fixtures:new Map(base),allowFixtureForms:true}),p=f.page;
  let rows=[],writes=[],failCreate=false;
  await p.route('**/api/v1/crm/meetings**',async route=>{
   const req=route.request(),endpoint=new URL(req.url()).pathname.replace('/api/v1/crm/meetings','');
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='GET'){
    if(endpoint==='')return send({items:[meeting],total:1,page:1,pages:1,canCreate:true});
    if(endpoint==='/team')return send({items:[],hasMore:false});
    if(endpoint===`/${id}`)return send(meeting);
    assert.equal(endpoint,`/${id}/invitations`);return send({items:rows,reserved:rows.filter(v=>!v.revokedAt).length,employeeCount:1,canInvite:true,videoAvailable:false});
   }
   const body=req.postDataJSON();writes.push({endpoint,body});
   if(endpoint.endsWith('/invitations')){await dto(CreateMeetingInvitationDto,body);if(failCreate){failCreate=false;return send({message:'Встреча изменилась. Обновите карточку.'},409);}rows=[{id:inviteId,label:body.label,version:1,expiresAt,revokedAt:null,guest:null}];return send({id:inviteId,version:1,expiresAt,invitationToken:secret,pin},201);}
   if(endpoint.endsWith('/decision')){await dto(DecideMeetingGuestDto,body);assert.equal(body.version,1);rows[0].guest.state=body.action==='ADMIT'?'ADMITTED':'REJECTED';rows[0].guest.version++;return send({state:rows[0].guest.state,videoAvailable:false},201);}
   assert.equal(endpoint,`/${id}/invitations/${inviteId}/revoke`);await dto(MeetingGuestVersionDto,body);rows[0].revokedAt=new Date().toISOString();rows[0].version++;rows[0].guest.state='REVOKED';return send({revoked:true},201);
  });
  try{
   await p.goto(origin+'/crm/meetings',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Открыть встречу Собеседование'}).click();
   const dialog=p.getByRole('dialog');await dialog.getByRole('tab',{name:'Гости',exact:true}).click();
   await dialog.getByLabel('Для кого приглашение',{exact:true}).fill('Кандидат Анна');failCreate=true;
   await dialog.getByRole('button',{name:'Создать приглашение'}).click();await dialog.getByRole('alert').waitFor();
   assert.equal(await dialog.getByLabel('Для кого приглашение',{exact:true}).inputValue(),'Кандидат Анна');
   await dialog.getByRole('button',{name:'Создать приглашение'}).click();await dialog.getByRole('region',{name:'Новое приглашение'}).waitFor();
   assert.equal(writes[0].body.requestKey,writes[1].body.requestKey,'Retry keeps request key');
   assert.equal(await dialog.getByLabel('Ссылка',{exact:true}).inputValue(),origin+'/meeting-guest#invite='+secret);assert.equal(await dialog.getByLabel('PIN',{exact:true}).inputValue(),pin);
   await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await dialog.isVisible(),true,'Unsaved one-time invite guard');
   await dialog.getByRole('button',{name:'Данные сохранены — скрыть'}).click();
   rows[0].guest={id:guestId,displayName:'Анна <script>',version:1,state:'WAITING',joinedAt:new Date().toISOString()};
   await dialog.getByRole('button',{name:'Обновить гостей'}).click();await dialog.getByRole('button',{name:'Допустить',exact:true}).waitFor();
   await assertWidth(p);await assertTypography(p);
   const box=await dialog.boundingBox();assert.ok(Math.abs(box.x+box.width-width)<=2);assert.ok(box.width<=722);
   await p.screenshot({path:path.join(out,`host-${width}.png`)});
   for(const button of await dialog.locator('.crm-detail-footer button').all())assert.ok(Math.abs((await button.boundingBox()).height-44)<=1);
   for(const button of await dialog.locator('.crm-card-tabs button').all())assert.ok((await button.boundingBox()).height<=60,'Shared tabs must not stretch into body');
   await p.screenshot({path:path.join(out,`host-${width}.png`)});
   await dialog.getByRole('button',{name:'Допустить',exact:true}).click();await dialog.getByText('Допущен',{exact:true}).waitFor();
   p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Отозвать доступ',exact:true}).click();await dialog.getByText('Доступ отозван',{exact:true}).waitFor();
   await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await dialog.waitFor({state:'hidden'});safeTraffic(f);
   console.log(`${width}px host guests PASS: shared drawer/tabs/footer, create retry + secret guard, safe text, admit/revoke; real writes 0.`);
  }catch(e){console.error({traffic:f.traffic,errors:f.errors,alerts:await p.getByRole('alert').allTextContents()});throw e;}finally{await f.context.close();}
  // Separate anonymous browser: no CRM token, cookies, API or employee data.
  const anonymous=width<800;
  const g=await isolatedContext(browser,width,anonymous,false,{allowFixtureForms:true,preserveGuestSession:true}),pg=g.page;let state='WAITING',unavailable=false,joins=0,reads=0;
  const view=()=>['WAITING','ADMITTED'].includes(state)?{state,meeting:{title:meeting.title,startsAt:meeting.startsAt,endsAt:meeting.endsAt,timezone:meeting.timezone},displayName:'Анна',videoAvailable:false}:{state,videoAvailable:false};
  await pg.route('**/api/v1/meeting-guests/**',async route=>{
   const req=route.request(),url=new URL(req.url());if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   assert.equal(req.method(),'POST');assert.equal(req.headers().authorization,undefined);assert.equal(req.headers().cookie,undefined);assert.equal(url.search,'');assert.equal(req.headers().referer,undefined);
   const body=req.postDataJSON(),send=(data,code=201)=>route.fulfill({status:code,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname.endsWith('/join')){await dto(JoinMeetingGuestDto,body);assert.equal(body.invitationToken,secret);assert.equal(body.pin,pin);joins++;return send({...view(),ticket});}
   await dto(MeetingGuestTicketDto,body);assert.equal(body.ticket,ticket);reads++;if(unavailable)return send({message:'Нет связи с сервером'},503);
   if(url.pathname.endsWith('/leave'))state='LEFT';return send(view());
  });
  try{
   const response=await pg.goto(origin+'/meeting-guest#invite='+secret,{waitUntil:'networkidle'});assert.equal(response.headers()['referrer-policy'],'no-referrer');assert.match(response.headers()['x-robots-tag'],/noindex/);
   await pg.getByLabel('Ваше имя',{exact:true}).fill('Анна');await pg.getByLabel('PIN приглашения').fill(pin);await pg.getByRole('button',{name:'Войти в зал ожидания'}).click();await pg.getByRole('heading',{name:'Ожидайте допуска'}).waitFor();assert.equal(joins,1);
   const storage=await pg.evaluate(()=>({local:{...localStorage},guest:JSON.parse(sessionStorage.getItem('sarkisian-meeting-guest'))}));assert.equal(Boolean(storage.local['sarkisian-workspace-token']),!anonymous);assert.equal(storage.guest.ticket,ticket);assert.equal('pin' in storage.guest,false);
   await pg.reload({waitUntil:'networkidle'});await pg.getByRole('heading',{name:'Ожидайте допуска'}).waitFor();assert.equal(joins,1,'Reload restores ticket without consuming invitation again');
   await assertWidth(pg);await pg.screenshot({path:path.join(out,`guest-${width}.png`)});
   state='ADMITTED';await pg.getByRole('button',{name:'Проверить статус'}).click();await pg.getByRole('heading',{name:'Организатор допустил вас'}).waitFor();assert.ok((await pg.locator('body').innerText()).includes('видеосервер ещё не подключён'));
   unavailable=true;await pg.getByRole('button',{name:'Проверить статус'}).click();await pg.getByRole('alert').waitFor();assert.ok((await pg.getByRole('status').innerText()).includes('не подтверждён'));
   unavailable=false;state='REVOKED';await pg.getByRole('button',{name:'Проверить статус'}).click();await pg.getByRole('heading',{name:'Доступ закрыт'}).waitFor();assert.equal(await pg.evaluate(()=>sessionStorage.getItem('sarkisian-meeting-guest')),null);
   assert.equal(await pg.getByRole('button',{name:'Войти в зал ожидания'}).count(),0);assert.ok(reads>=3);assert.deepEqual(g.traffic.mockedReads,[],'No CRM/auth reads on guest page');safeTraffic(g);
   console.log(`${width}px guest (${anonymous?'anonymous':'existing CRM login ignored'}) PASS: PIN/wait/reload/admit/outage/revoke, no CRM auth/requests, no secret URL queries/referrer, tab storage cleared; real writes 0.`);
  }catch(e){console.error({traffic:g.traffic,errors:g.errors,alerts:await pg.getByRole('alert').allTextContents()});throw e;}finally{await g.context.close();}
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
