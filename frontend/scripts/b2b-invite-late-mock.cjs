// A completed public enrollment must not sign in or redirect an abandoned page.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
const {isolatedContext}=require('./admin-design-mock.cjs');
(async()=>{const browser=await chromium.launch();let f;try{
 f=await isolatedContext(browser,390,true,false,{b2b:true,allowFixtureForms:true});
 const token='a'.repeat(43),version='b'.repeat(64);let started,release;
 const pending=new Promise(resolve=>started=resolve),response=new Promise(resolve=>release=resolve);
 await f.context.route('**/b2b-invite',route=>route.continue());
 await f.context.route('**/api/v1/business-team-invitations/preview',route=>route.fulfill({status:201,json:{organizationName:'Поздний ответ QA',emailHint:'qa***@example.invalid',role:'EMPLOYEE'}}));
 await f.context.route('**/api/v1/business-registration/terms',route=>route.fulfill({json:{version,documents:[]}}));
 await f.context.route('**/api/v1/business-team-invitations/register',async route=>{started();await response;await route.fulfill({status:201,json:{user:{id:'late-user',email:'late@example.invalid',role:'CUSTOMER_B2B'},accessToken:'late-business-access',refreshToken:'late-business-refresh',organizationId:'56c46548-3428-4438-9f6f-12c16c0194dc'}});});
 await f.page.goto(`http://127.0.0.1:3001/b2b-invite#token=${token}`);await f.page.getByRole('tab',{name:'Создать бизнес-аккаунт',exact:true}).click();await f.page.getByLabel('Имя',{exact:true}).fill('QA');await f.page.getByLabel('Email из приглашения',{exact:true}).fill('late@example.invalid');await f.page.getByLabel('Пароль',{exact:true}).fill('SyntheticPassword123!');await f.page.getByRole('checkbox').check();await f.page.getByRole('button',{name:'Принять приглашение',exact:true}).click();await pending;
 await f.page.getByRole('link',{name:'Открыть вход для бизнеса',exact:true}).click();await f.page.waitForURL('**/b2b-login');release();await f.page.waitForTimeout(300);
 assert.equal(new URL(f.page.url()).pathname,'/b2b-login');assert.equal(await f.page.evaluate(()=>localStorage.getItem('sarkisian-b2b-token')),null);assert.deepEqual(f.errors,[]);
 console.log('PASS abandoned business invitation: late registration response cannot adopt a session or redirect the new page.');
}finally{if(f)await f.context.close();await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
