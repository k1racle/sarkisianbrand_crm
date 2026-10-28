// Local Docker only. Creates one temporary salon/account, exercises real multipart
// upload and image decoding, then deletes only those fixtures. No external calls.
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..'),compose=['compose','--env-file','.env.local','-f','docker-compose.local.yml','exec','-T','backend','node','-e'];
const run=code=>execFileSync('docker',[...compose,code],{cwd:root,encoding:'utf8',maxBuffer:2e6});
const setup=`const{PrismaClient}=require('@prisma/client'),bcrypt=require('bcrypt'),{randomUUID}=require('crypto');(async()=>{const db=new PrismaClient();let user,org;try{const password=randomUUID()+'aA1!',email='logo-'+randomUUID()+'@example.invalid';user=await db.user.create({data:{email,password:await bcrypt.hash(password,10),firstName:'Logo QA',role:'CUSTOMER_B2B'}});org=await db.organization.create({data:{name:'Logo QA temporary salon',status:'ACTIVE'}});const member=await db.organizationMember.create({data:{userId:user.id,organizationId:org.id,role:'OWNER',canOrder:true,canSeeFinance:true}});await db.salonBookingSetting.create({data:{organizationId:org.id,enabled:true,masterIds:[member.id],workingDays:[0,1,2,3,4,5,6]}});const res=await fetch('http://127.0.0.1:3000/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!res.ok)throw Error('Fixture login failed: '+res.status);const session=await res.json();process.stdout.write(JSON.stringify({organizationId:org.id,userId:user.id,session}));}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
let fixture,browser;
(async()=>{try{
 fixture=JSON.parse(run(setup));browser=await chromium.launch();const ctx=await browser.newContext(),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await ctx.addInitScript(session=>{localStorage.setItem('sarkisian-b2b-token',session.accessToken);localStorage.setItem('sarkisian-b2b-refresh',session.refreshToken);localStorage.setItem('sarkisian-b2b-user',JSON.stringify(session.user));},fixture.session);
 await p.goto('http://127.0.0.1:3001/b2b?section=settings&area=salon',{waitUntil:'networkidle'});await p.getByLabel('Загрузить логотип салона',{exact:true}).waitFor();
 const fixtures=await p.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;const ctx=canvas.getContext('2d');ctx.fillStyle='#555';ctx.fillRect(0,0,16,16);return ['image/png','image/jpeg','image/webp'].map(type=>({type,data:canvas.toDataURL(type).split(',')[1]}));});
 const draft=p.getByLabel('Название салона для клиентов',{exact:true});await draft.fill('Unsaved logo QA');
 const fileInput=p.getByLabel('Загрузить логотип салона',{exact:true});let rejectedRequests=0;const countRejected=req=>{if(req.url().endsWith('/b2b/salon-logo')&&req.method()==='POST')rejectedRequests++;};p.on('request',countRejected);
 for(const invalid of [{name:'broken.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])},{name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(3*1024*1024+1)}]){await fileInput.setInputFiles(invalid);await p.getByRole('alert').waitFor();await p.waitForTimeout(100);assert.equal(rejectedRequests,0,'Invalid images must not replace a saved logo');}
 p.off('request',countRejected);
 let previous='';
 for(const [i,file] of [...fixtures,fixtures[0]].entries()){
  const bytes=Buffer.from(file.data,'base64');
  const logoPattern='**/salon-booking/*/logo?*';if(i===0)await p.route(logoPattern,route=>route.abort('failed'));
  const response=p.waitForResponse(r=>r.url().endsWith('/b2b/salon-logo')&&r.request().method()==='POST');
  await fileInput.setInputFiles({name:'salon-logo.'+file.type.split('/')[1],mimeType:i===3?'':file.type,buffer:bytes});
  const res=await response;assert.equal(res.status(),201,'Upload: '+await res.text());const data=await res.json();assert.ok(data.logoUrl);assert.notEqual(data.logoUrl,previous);previous=data.logoUrl;
  if(i===0){await p.getByRole('button',{name:'Повторить загрузку логотипа',exact:true}).waitFor();await p.unroute(logoPattern);await p.getByRole('button',{name:'Повторить загрузку логотипа',exact:true}).click();}
  await p.locator('.salon-logo-preview img').waitFor();await p.waitForFunction(()=>{const img=document.querySelector('.salon-logo-preview img');return img?.complete&&img.naturalWidth>0;},undefined,{timeout:10000});
  const image=await p.request.get(new URL(data.logoUrl,'http://127.0.0.1:3001').href);assert.equal(image.status(),200);assert.equal(image.headers()['content-type'],file.type);assert.deepEqual(await image.body(),bytes);assert.equal(await draft.inputValue(),'Unsaved logo QA');assert.equal(await p.getByRole('button',{name:'Сохранить оформление',exact:true}).isEnabled(),true);
 }
 await p.getByRole('button',{name:'Удалить логотип салона',exact:true}).click();await p.getByRole('status').filter({hasText:'Логотип удалён'}).waitFor();assert.equal(await draft.inputValue(),'Unsaved logo QA');assert.equal(await p.getByRole('button',{name:'Сохранить оформление',exact:true}).isEnabled(),true);
 await fileInput.setInputFiles({name:'last.png',mimeType:'image/png',buffer:Buffer.from(fixtures[0].data,'base64')});await p.getByRole('status').filter({hasText:'Логотип обновлён'}).waitFor();
 await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.salon-logo-preview img')?.naturalWidth>0);assert.deepEqual(errors,[]);
 await p.goto('http://127.0.0.1:3001/booking/'+fixture.organizationId,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.public-salon-logo')?.naturalWidth>0);assert.deepEqual(errors,[]);
 console.log('PASS: real PNG/JPEG/WEBP and empty-MIME upload, corrupt/oversize rejection, replacement/versioned URL, exact bytes through proxy, decoded preview, unsaved contacts preserved on upload/removal, reload and public booking logo');
 }finally{
  if(browser)await browser.close();
  if(fixture)run(`const{PrismaClient}=require('@prisma/client');(async()=>{const db=new PrismaClient();try{const userId=${JSON.stringify(fixture.userId)},organizationId=${JSON.stringify(fixture.organizationId)};await db.$transaction(async tx=>{await tx.salonPresentation.deleteMany({where:{organizationId}});await tx.salonBookingSetting.deleteMany({where:{organizationId}});await tx.organizationMember.deleteMany({where:{organizationId}});await tx.organization.delete({where:{id:organizationId}});await tx.session.deleteMany({where:{userId}});await tx.user.delete({where:{id:userId}});});}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
