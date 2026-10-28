// Isolated LOCAL Docker account; passwords/tokens stay in memory and are never logged.
const cp=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),args=['compose','--env-file',path.join(root,'.env.local'),'-f',path.join(root,'docker-compose.local.yml'),'exec','-T','backend','node','-e'];
const run=code=>JSON.parse(cp.execFileSync('docker',[...args,code],{cwd:root,encoding:'utf8'}));
let fixture,browser;
(async()=>{try{
 fixture=run(`const {PrismaClient}=require('@prisma/client'),{randomUUID}=require('crypto'),bcrypt=require('bcrypt');(async()=>{const db=new PrismaClient();try{const password=randomUUID()+'Aa1!',u=await db.user.create({data:{email:'local-network-'+randomUUID()+'@example.test',password:await bcrypt.hash(password,10),firstName:'Network test',role:'ADMIN'}});process.stdout.write(JSON.stringify({id:u.id,email:u.email,password}))}finally{await db.$disconnect()}})()`);
 const bad=await fetch('http://localhost:3001/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:'IncorrectPassword!1'})});assert.equal(bad.status,401);assert.match((await bad.json()).message,/Неверный/);
 const invalid=await fetch('http://localhost:3001/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'not-email',password:'x'})});assert.equal(invalid.status,400);
 const privateResponse=await fetch('http://localhost:3001/api/v1/auth/me');assert.equal(privateResponse.status,401);
 browser=await chromium.launch({headless:true,args:['--host-resolver-rules=MAP studio-next-ip.test 127.0.0.1','--no-proxy-server']});
 const origins=['http://localhost:3001','http://127.0.0.1:3001','http://studio-next-ip.test:3001'];
 for(const origin of origins){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],apiUrls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/v1/'))apiUrls.push(r.url())});
  await page.goto(origin+'/crm/login?redirect=/crm/studio-rewards',{waitUntil:'domcontentloaded'});await page.getByLabel('Рабочая почта',{exact:true}).fill(fixture.email);await page.getByLabel('Пароль',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Войти в CRM',exact:true}).click();
  await page.locator('.studio-crm form').waitFor().catch(async error=>{console.error('CRM login navigation: '+page.url()+' '+(await page.locator('body').innerText()).slice(0,1000));throw error;});assert.equal(new URL(page.url()).pathname,'/crm/studio-rewards');
  const verified=await page.evaluate(async()=>{const token=localStorage.getItem('sarkisian-workspace-token'),r=await fetch('/api/v1/auth/me',{headers:{Authorization:`Bearer ${token}`}});return {status:r.status,cache:r.headers.get('cache-control'),id:(await r.json()).id}});assert.equal(verified.status,200);assert.equal(verified.id,fixture.id);assert.equal(verified.cache,'no-store');
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('.sb-storefront').waitFor();
  await page.goto(origin+'/studio',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Награды',exact:true}).click();await page.locator('.at-reward-offers article').first().waitFor();
  assert.ok(apiUrls.length>5);assert.ok(apiUrls.every(url=>new URL(url).origin===origin),'A request escaped to an old/external API host');assert.deepEqual(errors,[]);
  console.log(`PASS ${origin}: CRM form login, protected API, site and game; every API request uses the page origin`);await context.close();
 }
 console.log('PASS: rejected login remains HTTP 401, validation remains 400, protected data requires authorization');
}finally{if(browser)await browser.close();if(fixture)run(`const {PrismaClient}=require('@prisma/client');(async()=>{const db=new PrismaClient();try{await db.user.delete({where:{id:${JSON.stringify(fixture.id)}}});console.log('{}')}finally{await db.$disconnect()}})()`);}})().catch(e=>{console.error(e.message);process.exitCode=1});
