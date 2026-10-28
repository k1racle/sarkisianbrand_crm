// Local UI fixtures only. Real API workflow is verified by crm-calendar-http-check.cjs.
require('../../backend/node_modules/reflect-metadata');
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{fixtures,person}=require('./crm-rich-fixtures.cjs');
const {plainToInstance}=require('../../backend/node_modules/class-transformer'),{validate}=require('../../backend/node_modules/class-validator');
const {CreateMeetingDto,RespondMeetingDto}=require('../../backend/dist/src/meetings/meeting.dto');
const out=path.resolve(__dirname,'../.screenshots/crm-calendar');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch(require('./crm-test-browser.cjs'));
 try{for(const width of [1440,390])for(const theme of ['light','dark']){
  const responses=new Map(fixtures);responses.set('/staff-notifications',{items:[],fresh:[],unreadCount:0,nextCursor:null,through:new Date().toISOString(),popupsEnabled:true});
  const f=await isolatedContext(browser,width,false,false,{fixtures:responses,allowFixtureForms:true}),p=f.page;
  await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:'http://127.0.0.1:3001'}]);
  const peer={id:'b0000000-0000-4000-8000-000000000001',firstName:'Мария',lastName:'Иванова',isActive:true,response:'PENDING',declineReason:''};
  const day=new Date();day.setDate(day.getDate()+2);day.setHours(10,0,0,0);
  let row={id:'b0000000-0000-4000-8000-000000000002',title:'Совещание по запуску коллекции',agenda:'Результаты недели и план запуска',kind:'MEETING',startsAt:day.toISOString(),endsAt:new Date(+day+3600000).toISOString(),timezone:'Europe/Moscow',location:'Офис · переговорная 2',meetingUrl:'https://example.test/meeting',reminderMinutes:30,status:'SCHEDULED',organizerId:person.id,organizer:{...person,isActive:true},members:[peer],version:1,canManage:true,canRespond:false,myResponse:null,responses:{accepted:0,pending:1,declined:0}};
  let invite=false,subscription=false,token=0;const writes=[];
  await p.route('**/api/v1/crm/meetings**',async route=>{
   const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/meetings','');
   const send=(value,status=200,type='application/json')=>route.fulfill({status,contentType:type,body:type==='application/json'?JSON.stringify(value):value});
   if(endpoint==='/calendar-subscription'){
    if(req.method()==='POST'){subscription=true;token++;return send({enabled:true,path:`/calendar/feeds/${String(token).padStart(43,'a')}.ics`},201);}
    if(req.method()==='DELETE'){subscription=false;return send({enabled:false});}
    return send({enabled:subscription});
   }
   if(endpoint.endsWith('/calendar.ics'))return send('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n',200,'text/calendar');
   if(req.method()==='GET'){
    if(endpoint==='/team')return send({items:[peer],hasMore:false});
    if(endpoint)return send(row);
    return send({items:[row],total:1,page:1,pages:1,canCreate:!invite});
   }
   const body=req.postDataJSON();writes.push({endpoint,body});
   if(endpoint.endsWith('/respond')){
    assert.deepEqual(await validate(plainToInstance(RespondMeetingDto,body),{whitelist:true,forbidNonWhitelisted:true}),[]);
    assert.ok(body.response!=='DECLINED'||body.reason.trim());
    row={...row,myResponse:body.response,myDeclineReason:body.reason,members:row.members.map(m=>({...m,response:body.response,declineReason:body.reason})),responses:{accepted:body.response==='ACCEPTED'?1:0,pending:0,declined:body.response==='DECLINED'?1:0}};
    return send(row,201);
   }
   assert.equal(endpoint,'');assert.deepEqual(await validate(plainToInstance(CreateMeetingDto,body),{whitelist:true,forbidNonWhitelisted:true}),[]);
   assert.equal(body.location,'Переговорная 5');assert.deepEqual(body.memberIds,[peer.id]);return send({...row,...body},201);
  });
  try{
   await p.goto('http://127.0.0.1:3001/crm/meetings',{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Календарь событий',exact:true}).waitFor();
   const calendar=p.getByRole('region',{name:'Календарь мероприятий и совещаний'});await calendar.waitFor();assert.equal(await p.locator('.meeting-day').count(),42);
   await p.screenshot({path:path.join(out,`${width}-${theme}-calendar.png`),fullPage:true});
   const metrics=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(metrics.scroll<=metrics.width+2,JSON.stringify(metrics));
   const contrast=await p.locator('.meeting-day-number').first().evaluate(el=>{let parent=el,bg=getComputedStyle(parent).backgroundColor;while(parent.parentElement&&(bg==='rgba(0, 0, 0, 0)'||bg==='transparent')){parent=parent.parentElement;bg=getComputedStyle(parent).backgroundColor;}const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const a=luminance(getComputedStyle(el).color),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert.ok(contrast>=4.5,`Date contrast ${contrast}`);
   const clipped=await p.locator('.crm-meetings-page .crm-page-content > *, .crm-page-header .crm-action-bar').evaluateAll(elements=>elements.map(el=>({name:el.className,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})).filter(box=>box.left<0||box.right>innerWidth+1));assert.deepEqual(clipped,[],'No clipped calendar/toolbars even when the body hides overflow');
   await p.getByRole('button',{name:'Новое событие',exact:true}).click();let dialog=p.getByRole('dialog');await dialog.waitFor();
   await dialog.getByLabel('Тема события',{exact:true}).fill('Обучение команды');await dialog.getByLabel(/^Формат/).selectOption('EVENT');await dialog.getByLabel('Место проведения',{exact:true}).fill('Переговорная 5');
   await dialog.getByLabel('Начало',{exact:true}).fill(day.toISOString().slice(0,10)+'T10:00');await dialog.getByLabel('Окончание',{exact:true}).fill(day.toISOString().slice(0,10)+'T11:00');
   await dialog.getByRole('checkbox',{name:'Мария Иванова'}).check();await p.screenshot({path:path.join(out,`${width}-${theme}-create.png`)});await dialog.getByRole('button',{name:'Создать и пригласить',exact:true}).click();await dialog.waitFor({state:'hidden'});
   assert.equal(writes.length,1);
   await p.getByRole('button',{name:'Подключить календарь',exact:true}).click();dialog=p.getByRole('dialog');await dialog.getByRole('heading',{name:'Google, Яндекс и Apple'}).waitFor();await dialog.getByRole('button',{name:'Создать ссылку подписки'}).click();await dialog.getByLabel('Ссылка на ваш календарь',{exact:true}).waitFor();
   assert.ok((await dialog.getByLabel('Ссылка на ваш календарь',{exact:true}).inputValue()).endsWith('.ics'));
   for(const option of ['google','yandex','apple'])await dialog.getByLabel('Куда подключить').selectOption(option);
   await p.screenshot({path:path.join(out,`${width}-${theme}-sync.png`)});await dialog.getByRole('button',{name:'Отключить подписку',exact:true}).click();await dialog.getByRole('button',{name:'Создать ссылку подписки'}).waitFor();await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();
   invite=true;row={...row,organizerId:peer.id,organizer:peer,members:[{...person,isActive:true,response:'PENDING'}],canManage:false,canRespond:true,myResponse:'PENDING'};
   await p.goto(`http://127.0.0.1:3001/crm/meetings?meeting=${row.id}`,{waitUntil:'networkidle'});dialog=p.getByRole('dialog');await dialog.getByRole('heading',{name:'Вы участвуете?'}).waitFor();
   assert.ok(await dialog.getByLabel('Тема события',{exact:true}).isDisabled());
   await dialog.getByRole('button',{name:'Не смогу',exact:true}).click();assert.ok(await dialog.getByRole('button',{name:'Отправить причину отказа'}).isDisabled());
   await dialog.getByLabel('Почему не сможете участвовать',{exact:true}).fill('Буду на встрече с поставщиком');await dialog.getByRole('button',{name:'Отправить причину отказа'}).click();await dialog.getByText('Ответ отправлен организатору',{exact:true}).waitFor();
   await p.screenshot({path:path.join(out,`${width}-${theme}-rsvp.png`)});assert.equal(writes.at(-1).body.response,'DECLINED');
   await dialog.getByRole('button',{name:'Участвую',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[aria-label="Ваш ответ на приглашение"]')?.textContent.includes('Участвует'));
   assert.equal(writes.at(-1).body.response,'ACCEPTED');
   const download=p.waitForEvent('download');await dialog.getByRole('button',{name:'Скачать .ics'}).click();await (await download).saveAs(path.join(out,`${width}-${theme}.ics`));
   await dialog.getByRole('tab',{name:'Участники',exact:true}).click();await dialog.getByRole('heading',{name:'Ответы участников',exact:true}).waitFor();
   for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   assert.deepEqual(f.errors,[]);console.log(`PASS ${width}px/${theme}: calendar, complete creation, personal subscription/revocation, linked invite, required refusal reason, acceptance, participant tab, .ics and no overflow`);
  }finally{await f.context.close();}
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
