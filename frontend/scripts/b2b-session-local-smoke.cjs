// Real local Docker auth/browser regression. Temporary account/org only; no external calls.
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright-core'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const workspace=process.argv.includes('--workspace'),role=workspace?'ADMIN':'CUSTOMER_B2B',prefix=workspace?'sarkisian-workspace':'sarkisian-b2b';
const target=workspace?'/crm/studio-rewards':'/b2b?section=settings&area=purchases',protectedSelector=workspace?'.studio-crm form':'.business-company-settings';
const run=code=>execFileSync('docker',['compose','--env-file','.env.local','-f','docker-compose.local.yml','exec','-T','backend','node','-e',code],{cwd:root,encoding:'utf8',maxBuffer:2e6});
const setup=`const{PrismaClient}=require('@prisma/client'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken'),{randomUUID}=require('crypto');(async()=>{const db=new PrismaClient();let ids;try{const password=randomUUID()+'aA1!';ids=await db.$transaction(async tx=>{const user=await tx.user.create({data:{email:'session-'+randomUUID()+'@example.invalid',password:await bcrypt.hash(password,10),firstName:'Session QA',role:'CUSTOMER_B2B'}});const org=await tx.organization.create({data:{name:'Session QA temporary organization',status:'ACTIVE'}});await tx.organizationMember.create({data:{userId:user.id,organizationId:org.id,role:'OWNER',canOrder:true,canSeeFinance:true}});return{userId:user.id,organizationId:org.id,email:user.email};});const res=await fetch('http://127.0.0.1:3000/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:ids.email,password})});if(!res.ok)throw Error('Fixture login failed: '+res.status);const session=await res.json(),claims=jwt.decode(session.accessToken);session.accessToken=jwt.sign({sub:ids.userId,role:'CUSTOMER_B2B',sid:claims.sid},process.env.JWT_SECRET,{expiresIn:-60});process.stdout.write(JSON.stringify({...ids,session}));}catch(e){if(ids){await db.session.deleteMany({where:{userId:ids.userId}});await db.organization.delete({where:{id:ids.organizationId}});await db.user.delete({where:{id:ids.userId}});}throw e;}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
let fixture,browser,debugPages=[],traffic=[],stage='setup';
(async()=>{try{
 fixture=JSON.parse(run(setup.replaceAll("role:'CUSTOMER_B2B'",`role:'${role}'`)));browser=await chromium.launch();const context=await browser.newContext(),page=await context.newPage(),second=await context.newPage(),errors=[];let refreshes=0,expiredResponses=0,release;
 debugPages=[page,second];context.on('response',res=>{const endpoint=new URL(res.url()).pathname;if(endpoint.startsWith('/api/v1/'))traffic.push([res.status(),endpoint]);});
 context.on('requestfailed',req=>{const endpoint=new URL(req.url()).pathname;if(endpoint.startsWith('/api/v1/'))traffic.push(['FAILED',endpoint,req.failure()?.errorText]);});
 const gate=new Promise(resolve=>release=resolve);
 for(const p of [page,second])p.on('pageerror',e=>errors.push(e.message));
 context.on('request',req=>{if(new URL(req.url()).pathname==='/api/v1/auth/refresh')refreshes++;});
 context.on('response',res=>{if(res.status()===401&&['/api/v1/auth/me','/api/v1/auth/access'].includes(new URL(res.url()).pathname)&&++expiredResponses>=2)release();});
 await context.route('**/api/v1/auth/refresh',async route=>{const timeout=setTimeout(release,4000);try{await gate;await route.continue();}finally{clearTimeout(timeout);}});
 await context.addInitScript(({session,prefix})=>{if(!localStorage.getItem('qa-session-seeded')){localStorage.setItem(prefix+'-token',session.accessToken);localStorage.setItem(prefix+'-refresh',session.refreshToken);localStorage.setItem(prefix+'-user',JSON.stringify(session.user));localStorage.setItem('qa-session-seeded','true');}},{session:fixture.session,prefix});
 stage='initial two-tab refresh';await Promise.all([page,second].map(p=>p.goto('http://127.0.0.1:3001'+target)));
 await Promise.all([page,second].map(p=>p.locator(protectedSelector).waitFor()));
 assert.ok(expiredResponses>=2,'Both tabs encounter the expired JWT before refresh completes');assert.equal(refreshes,1,'Two real tabs rotate the shared refresh token once');
 assert.ok(await page.evaluate(({expired,prefix})=>localStorage.getItem(prefix+'-token')!==expired,{expired:fixture.session.accessToken,prefix}),'Fresh access token is persisted');
 // A temporary /me failure is recoverable without losing credentials or rotating again.
 stage='outage';let offline=true;
 const outage=route=>offline?route.abort('failed'):route.continue();
 await context.route(/\/api\/v1\/auth\/(me|access)$/,outage);await page.reload();
 await page.getByRole('alert').filter({hasText:workspace?'Не удалось проверить доступ':'Данные входа сохранены'}).waitFor();
 assert.ok(await page.evaluate(prefix=>Boolean(localStorage.getItem(prefix+'-refresh')),prefix),'Outage preserves refresh token');
 stage='outage recovery';offline=false;await page.getByRole('button',{name:workspace?'Повторить проверку':'Обновить',exact:true}).click();await page.locator(protectedSelector).waitFor();assert.equal(refreshes,1);
 // Revoke the real server session and ensure both access + refresh are rejected.
 run(`const{PrismaClient}=require('@prisma/client');(async()=>{const db=new PrismaClient();try{await db.session.deleteMany({where:{userId:${JSON.stringify(fixture.userId)}}});}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`);
 stage='server revocation';await page.reload();await page.waitForURL(url=>url.pathname===(workspace?'/crm/login':'/b2b-login'));
 await page.getByRole('button',{name:workspace?'Войти в CRM':'Войти в кабинет',exact:true}).waitFor();
 if(workspace)await second.getByRole('alert').filter({hasText:'Сессия завершена'}).waitFor();else await second.waitForURL(url=>url.pathname==='/b2b-login');
 assert.ok(await page.evaluate(prefix=>!localStorage.getItem(prefix+'-token')&&!localStorage.getItem(prefix+'-refresh'),prefix),'Revocation clears browser credentials');
 for(const p of [page,second])assert.equal(await p.locator(protectedSelector).count(),0);assert.deepEqual(errors,[]);
 assert.ok(traffic.filter(row=>String(row[1]).startsWith('/api/v1/auth/')).length<60,'Two tabs must settle without an auth-request feedback loop');
 console.log(`PASS real ${workspace?'CRM':'B2B'} auth: two tabs share one expired-JWT rotation, outage/retry preserves credentials, server revocation signs out both tabs and clears protected screens.`);
 }catch(error){
  for(let index=0;index<debugPages.length;index++){const p=debugPages[index];if(!p.isClosed()){console.error('Session test page '+index+': '+p.url()+' '+(await p.locator('body').innerText()).slice(0,900));}}
  console.error(stage,JSON.stringify(traffic));throw error;
 }finally{
  if(browser)await browser.close();
  if(fixture)run(`const{PrismaClient}=require('@prisma/client');(async()=>{const db=new PrismaClient();try{await db.$transaction(async tx=>{await tx.session.deleteMany({where:{userId:${JSON.stringify(fixture.userId)}}});await tx.organization.delete({where:{id:${JSON.stringify(fixture.organizationId)}}});await tx.user.delete({where:{id:${JSON.stringify(fixture.userId)}}});});}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`);
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
