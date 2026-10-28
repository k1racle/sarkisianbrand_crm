// Isolated synthetic API, no real sessions, mail, database or external traffic.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs');
const org='56c46548-3428-4438-9f6f-12c16c0194dc',ownerUser={id:'qa-owner',firstName:'Владелец',email:'owner@example.invalid',role:'CUSTOMER_B2B'},token='a'.repeat(43);
const output=path.resolve(__dirname,'../.screenshots/b2b-team');fs.mkdirSync(output,{recursive:true});
async function contrast(button,surface){const value=await button.evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor]});if(surface)value[1]=await surface.evaluate(el=>getComputedStyle(el).backgroundColor);const lum=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};const a=lum(value[0]),b=lum(value[1]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'Readable dialog contrast: '+value.join(' on '));}
(async()=>{const browser=await chromium.launch();try{
 for(const width of [1440,390])for(const dark of [false,true]){
  const f=await isolatedContext(browser,width,false,false,{b2b:true,actor:ownerUser,fixtures:new Map(),allowFixtureForms:true}),writes=[];
  const members=[{id:'owner-member',userId:ownerUser.id,user:ownerUser,role:'OWNER',canOrder:true,canSeeFinance:true,isActive:true,version:1},{id:'employee-member',userId:'qa-employee',user:{id:'qa-employee',firstName:'Сотрудник',email:'employee@example.invalid'},role:'EMPLOYEE',canOrder:false,canSeeFinance:false,isActive:true,version:1}],invitations=[];let rejectUpdate=true;
  try{
   await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',domain:'127.0.0.1',path:'/'}]);
   await f.context.route('**/api/v1/b2b/**',async route=>{const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1',''),owner=members[0];
    if(req.method()==='GET'){
     if(endpoint==='/b2b/organizations')return route.fulfill({json:[{id:org,name:'Команда QA',status:'ACTIVE',role:owner.role,canOrder:owner.canOrder,canSeeFinance:owner.canSeeFinance,canUseSalon:true}]});
     assert.equal(req.headers()['x-b2b-organization-id'],org);
     if(endpoint==='/b2b/profile')return route.fulfill({json:{id:org,name:'Команда QA',status:'ACTIVE',membership:owner,members:members.filter(m=>m.isActive),capabilities:{salon:true,purchasing:owner.canOrder}}});
     if(endpoint==='/b2b/team')return route.fulfill({json:{members,invitations,canManage:owner.role==='OWNER',currentMemberId:owner.id}});
     return route.fulfill({json:[]});
    }
    const body=req.postDataJSON();writes.push({endpoint,body});
    if(endpoint==='/b2b/team/invitations'){assert.match(body.requestKey,/^[a-f0-9-]{36}$/);const row={id:'invite',email:body.email,role:body.role,status:'PENDING',version:1};invitations.push(row);return route.fulfill({status:201,json:{invitation:row,localLink:`http://127.0.0.1:3001/b2b-invite#token=${token}`}});}
    if(endpoint==='/b2b/team/members/employee-member'){
     if(rejectUpdate){rejectUpdate=false;return route.fulfill({status:409,json:{message:'Доступ сотрудника изменился. Обновите команду'}});}
     assert.equal(body.version,members[1].version);Object.assign(members[1],body,{version:body.version+1});return route.fulfill({json:members[1]});
    }
    if(endpoint==='/b2b/team/transfer-ownership'){assert.equal(body.targetMemberId,'employee-member');assert.equal(body.ownerVersion,1);assert.equal(body.targetVersion,members[1].version);assert.ok(body.currentPassword);Object.assign(members[0],{role:'EMPLOYEE',canOrder:false,canSeeFinance:false,version:2});Object.assign(members[1],{role:'OWNER',canOrder:true,canSeeFinance:true});return route.fulfill({status:201,json:{transferred:true}});}
    return route.fulfill({status:400,json:{message:'Unexpected fixture write'}});
   });
   await f.page.goto('http://127.0.0.1:3001/b2b?section=team');await f.page.getByRole('button',{name:'Пригласить сотрудника',exact:true}).waitFor();
   await f.page.getByRole('button',{name:'Пригласить сотрудника',exact:true}).click();let dialog=f.page.getByRole('dialog');await dialog.getByLabel('Email сотрудника',{exact:true}).fill('new@example.invalid');await dialog.getByRole('combobox',{name:/^Роль/}).selectOption('BUYER');await dialog.getByLabel('Разрешить оформление закупок',{exact:true}).check();await contrast(dialog.getByRole('button',{name:'Отправить приглашение',exact:true}));await dialog.getByRole('button',{name:'Отправить приглашение',exact:true}).click();await f.page.getByLabel('Ссылка приглашения',{exact:true}).waitFor();assert.equal(writes[0].body.canSeeFinance,false);
   await f.page.getByRole('button',{name:'Изменить доступ Сотрудник',exact:true}).click();dialog=f.page.getByRole('dialog');await dialog.getByLabel('Разрешить просмотр финансов',{exact:true}).check();await dialog.getByRole('button',{name:'Сохранить доступ',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Разрешить просмотр финансов',{exact:true}).isChecked(),true);await dialog.getByRole('button',{name:'Сохранить доступ',exact:true}).click();await f.page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(members[1].canSeeFinance,true);
   await f.page.getByRole('button',{name:'Изменить доступ Сотрудник',exact:true}).click();dialog=f.page.getByRole('dialog');await dialog.getByLabel('Доступ сотрудника включён',{exact:true}).uncheck();await dialog.getByRole('button',{name:'Сохранить доступ',exact:true}).click();await f.page.getByText('Доступ отключён',{exact:true}).waitFor();
   await f.page.getByRole('button',{name:'Изменить доступ Сотрудник',exact:true}).click();dialog=f.page.getByRole('dialog');await dialog.getByLabel('Доступ сотрудника включён',{exact:true}).check();await dialog.getByRole('button',{name:'Сохранить доступ',exact:true}).click();await f.page.getByRole('dialog').waitFor({state:'hidden'});
   await f.page.getByRole('button',{name:'Передать управление',exact:true}).click();dialog=f.page.getByRole('dialog');await dialog.getByRole('combobox',{name:/^Новый владелец/}).selectOption('employee-member');await dialog.getByLabel('Ваш текущий пароль',{exact:true}).fill('SyntheticPassword123!');await dialog.getByLabel('Подтверждаю передачу управления и изменение моего доступа',{exact:true}).check();await dialog.getByRole('button',{name:'Передать управление',exact:true}).click();await f.page.getByRole('dialog').waitFor({state:'hidden'});await f.page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(el=>el.textContent==='Пригласить сотрудника'));
   const toast=f.page.getByRole('status').filter({hasText:'Управление передано'});await toast.waitFor();await contrast(toast);
   assert.equal(members[0].canOrder,false);assert.equal(members[0].canSeeFinance,false);assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.equal(f.errors.filter(e=>e==='console: Failed to load resource: the server responded with a status of 409 (Conflict)').length,1);assert.deepEqual(f.errors.filter(e=>e!=='console: Failed to load resource: the server responded with a status of 409 (Conflict)'),[]);await f.page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}.png`),fullPage:true});console.log(`PASS B2B team UI ${width}/${dark?'dark':'light'}: invitation, role/flags, stale-save draft retention, deactivate/reactivate and explicit ownership transfer.`);
  }catch(e){await f.page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw e;}finally{await f.context.close();}
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
