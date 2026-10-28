// Synthetic invitation registration/login, all API traffic intercepted.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {isolatedContext}=require('./admin-design-mock.cjs');
const token='a'.repeat(43),version='b'.repeat(64),org='56c46548-3428-4438-9f6f-12c16c0194dc',output=path.resolve(__dirname,'../.screenshots/b2b-invite');fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch();try{for(const width of [1440,390])for(const dark of [false,true]){
 const f=await isolatedContext(browser,width,true,false,{b2b:true,allowFixtureForms:true}),writes=[];
 let actor={id:'invited-business-user',email:'invited@example.invalid',firstName:'Сотрудник',role:'CUSTOMER_B2B'},failOrgOnce=true;
 try{
  await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',domain:'127.0.0.1',path:'/'}]);
  await f.context.route('**/b2b-invite',route=>route.continue());
  await f.context.route('**/api/v1/**',async route=>{const req=route.request(),endpoint=new URL(req.url()).pathname.replace('/api/v1',''),body=req.method()==='POST'?req.postDataJSON():null;
   assert.equal(req.url().includes(token),false,'Capabilities never enter request URLs');
   if(req.method()==='POST')writes.push({endpoint,body});
   if(endpoint==='/business-team-invitations/preview'){assert.equal(body.token,token);return route.fulfill({status:201,json:{organizationName:'Салон QA',emailHint:'in***@example.invalid',role:'EMPLOYEE',canOrder:false,canSeeFinance:false,expiresAt:'2099-01-01T00:00:00Z'}});}
   if(endpoint==='/business-registration/terms')return route.fulfill({json:{version,documents:[{url:'/privacy'},{url:'/oferta'}]}});
   if(endpoint==='/business-team-invitations/register'){assert.equal(body.acceptedTerms,true);assert.equal(body.termsVersion,version);assert.equal(body.token,token);assert.equal(body.email,actor.email);return route.fulfill({status:201,json:{user:actor,accessToken:'fixture-business-access',refreshToken:'fixture-business-refresh',organizationId:org}});}
   if(endpoint==='/business-team-invitations/accept'){assert.equal(body.token,token,'Retry keeps the invitation after registration succeeds but organization loading fails');return route.fulfill({status:201,json:{accepted:true,reused:true,organizationId:org}});}
   if(endpoint==='/auth/login')return route.fulfill({json:{user:{id:'ordinary-account',email:'ordinary@example.invalid',role:'CUSTOMER_B2C'},accessToken:'ordinary-access',refreshToken:'ordinary-refresh'}});
   if(endpoint==='/auth/me')return route.fulfill({json:actor});
   if(endpoint==='/b2b/organizations'){if(failOrgOnce){failOrgOnce=false;return route.fulfill({status:503,json:{message:'Тест: временно нет связи со списком компаний'}});}return route.fulfill({json:[{id:org,name:'Салон QA',role:'EMPLOYEE',status:'ACTIVE',canUseSalon:true}]});}
   const member={id:'invited-member',userId:actor.id,user:actor,role:'EMPLOYEE',isActive:true,version:1,canOrder:false,canSeeFinance:false};
   if(endpoint==='/b2b/profile')return route.fulfill({json:{id:org,name:'Салон QA',status:'ACTIVE',members:[member],membership:member,capabilities:{salon:true,purchasing:false}}});
   if(endpoint==='/b2b/team')return route.fulfill({json:{members:[member],invitations:[],canManage:false,currentMemberId:member.id}});
   return route.fulfill({status:404,json:{message:'Unexpected invitation fixture API: '+endpoint}});
  });
  await f.page.goto(`http://127.0.0.1:3001/b2b-invite#token=${token}`);await f.page.getByRole('tab',{name:'Войти',exact:true}).waitFor();assert.ok(!f.page.url().includes(token));
  await f.page.getByLabel('Email из приглашения',{exact:true}).fill('ordinary@example.invalid');await f.page.getByLabel('Пароль',{exact:true}).fill('SyntheticPassword123!');await f.page.getByRole('button',{name:'Принять приглашение',exact:true}).click();await f.page.getByRole('alert').waitFor();assert.equal(await f.page.evaluate(()=>localStorage.getItem('sarkisian-b2b-token')),null,'An ordinary account never becomes a business session');assert.equal(writes.some(row=>row.endpoint==='/business-team-invitations/accept'),false);
  await f.page.getByRole('tab',{name:'Создать бизнес-аккаунт',exact:true}).click();assert.equal(await f.page.getByRole('alert').count(),0,'Switching authentication mode clears the previous login error');await f.page.getByLabel('Имя',{exact:true}).fill('Сотрудник');await f.page.getByLabel('Email из приглашения',{exact:true}).fill(actor.email);await f.page.getByLabel('Пароль',{exact:true}).fill('SyntheticPassword123!');await f.page.getByRole('checkbox').check();
  assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await f.page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}.png`),fullPage:true});
  await f.page.getByRole('button',{name:'Принять приглашение',exact:true}).click();await f.page.getByRole('alert').filter({hasText:'временно нет связи'}).waitFor();await f.page.getByRole('button',{name:'Принять приглашение',exact:true}).click();await f.page.locator('.salon-team-panel').waitFor();assert.ok(f.page.url().includes('organization='+org));assert.equal(writes.filter(row=>row.endpoint==='/business-team-invitations/register').length,1);assert.equal(writes.filter(row=>row.endpoint==='/business-team-invitations/accept').length,1);assert.equal(writes.some(row=>row.endpoint==='/auth/register'),false);assert.equal(f.errors.filter(e=>e==='console: Failed to load resource: the server responded with a status of 503 (Service Unavailable)').length,1);assert.deepEqual(f.errors.filter(e=>e!=='console: Failed to load resource: the server responded with a status of 503 (Service Unavailable)'),[]);
  console.log(`PASS business invitation UI ${width}/${dark?'dark':'light'}: scrubbed capability, ordinary login stays ordinary, separate business registration, versioned consent and selected company.`);
 }catch(error){await f.page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}finally{await f.context.close();}
}}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
