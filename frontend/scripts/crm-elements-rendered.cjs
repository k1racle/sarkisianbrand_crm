// Rendered design contract, including filled cards and dialogs. No real API writes.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=new URL(process.env.ADMIN_DESIGN_URL||process.env.WORKSPACE_DESIGN_URL||'http://127.0.0.1:3001').origin;
process.env.ADMIN_DESIGN_URL=origin;process.env.WORKSPACE_DESIGN_URL=origin;
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures:baseFixtures,measures}=require('./workspace-design-review.cjs');
const fixtures=new Map(baseFixtures);
const accessFixture=fixtures.get('/auth/access');
fixtures.set('/auth/access',{...accessFixture,permissions:[...new Set([...(accessFixture?.permissions||[]),'helpdesk.write'])]});
const {assertTypography,assertWidth}=require('./crm-workspace-smoke.cjs');
const output=path.resolve(__dirname,'../.screenshots/crm-elements');
const cases=[
{id:'task',route:'/crm/tasks',panel:'[role="dialog"][aria-label="Карточка задачи"]',open:p=>p.locator('.task-card').first().click()},
{id:'new-task',route:'/crm/tasks',panel:'.admin-dialog--drawer',open:p=>p.getByRole('button',{name:'Новая задача',exact:true}).click()},
{id:'organization',route:'/crm/organizations',panel:'.crm-org-dialog',open:p=>p.getByRole('button',{name:'Добавить организацию',exact:true}).click()},
{id:'lead',route:'/crm/deals',panel:'.admin-dialog--drawer.create',open:p=>p.getByRole('button',{name:'Новая сделка',exact:true}).click()},
{id:'pipeline',route:'/crm/deals',panel:'.crm-pipeline-settings',open:p=>p.getByRole('button',{name:'Настроить',exact:true}).click()},
{id:'support',route:'/crm/support/tickets',panel:'.admin-dialog--drawer',open:p=>p.getByRole('button',{name:'Новая заявка',exact:true}).click()},
{id:'staff',route:'/crm/settings/staff',panel:'[role="dialog"][aria-label="Добавить сотрудника"]',open:p=>p.getByRole('button',{name:'Добавить',exact:true}).click()},
{id:'bot',route:'/crm/settings/bot-commands',panel:'.command-drawer',open:p=>p.getByRole('button',{name:'Новая команда',exact:true}).click()},
{id:'integration',route:'/crm/settings/integrations',panel:'.integration-drawer',open:p=>p.locator('.integration-card').first().click()},
{id:'b2b-order',route:'/crm/b2b-orders',panel:'.crm-approved-order',open:p=>p.locator('.crm-orders-row').first().click()},
{id:'department',route:'/crm/settings/departments',panel:'.admin-dialog--drawer',open:p=>p.getByRole('button',{name:'Новый отдел',exact:true}).click()},
{id:'deal-card',route:'/crm/deals',panel:'.admin-dialog--drawer',open:p=>p.locator('.deal').first().click()},
 {id:'publication',route:'/crm/content-plan',panel:'.crm-content-editor',open:p=>p.locator('.crm-publication').first().click()},
 {id:'new-publication',route:'/crm/content-plan',panel:'.crm-content-editor',open:p=>p.getByRole('button',{name:'Новая публикация',exact:true}).click()},
 {id:'blogger-invite',route:'/crm/bloggers/participants',panel:'.partner-dialog',open:p=>p.getByRole('button',{name:'Пригласить партнёра',exact:true}).click()},
 {id:'chat',route:'/crm/',panel:'.platform-chat',open:p=>p.getByRole('button',{name:'Открыть чат команды',exact:true}).click()}];
// Put the synthetic publication in the current UI calendar rather than keeping
// an expired September fixture invisible in every subsequent month.
const publication=fixtures.get('/crm/content-plan/qa-publication');
if(publication){const scheduled=new Date();scheduled.setHours(14,0,0,0);const current={...publication,scheduledAt:scheduled.toISOString()};fixtures.set('/crm/content-plan/qa-publication',current);fixtures.set('/crm/content-plan',{...fixtures.get('/crm/content-plan'),items:[current]});}
const orderFixture=fixtures.get('/oms/orders/qa-b2b-order');
if(orderFixture){const current={...orderFixture,items:orderFixture.items.map(item=>({pickedQuantity:0,shippedQuantity:0,cancelledQuantity:0,returnedQuantity:0,damagedReturnedQuantity:0,...item}))};fixtures.set('/oms/orders/qa-b2b-order',current);fixtures.set('/oms/orders/list',{items:[current],total:1,page:1,pages:1});fixtures.set('/oms/orders/qa-b2b-order/managers',{items:[{id:'mock-admin',firstName:'Анна',lastName:'Соколова',isActive:true}],canUnassign:true,hasMore:false});}
async function elements(page){
 // Vue can mount the drawer before the browser starts its enter transition.
 // Let the next paint schedule that transition before waiting for its end.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('.admin-dialog').evaluateAll(es=>Promise.all(es.flatMap(e=>e.getAnimations().map(a=>a.finished.catch(()=>{})))));
 const typography=[];try{await assertTypography(page);}catch(error){typography.push(...(Array.isArray(error.actual)?error.actual:[{message:error.message}]));}
 const viewport=[];try{await assertWidth(page);}catch(error){viewport.push({kind:'viewport',message:error.message});}
 const errors=await page.evaluate(()=>{
  const errors=[];const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  for(const e of document.querySelectorAll('.crm-button--primary')){if(!visible(e))continue;const s=getComputedStyle(e);const expected=getComputedStyle(document.documentElement).getPropertyValue('--crm-on-accent').trim();const probe=document.createElement('span');probe.style.color=expected;document.body.append(probe);if(s.color!==getComputedStyle(probe).color)errors.push({kind:'primary',color:s.color,expected});probe.remove();}
  for(const e of document.querySelectorAll('.crm-detail-footer > .crm-button'))if(visible(e)&&e.getBoundingClientRect().height!==parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crm-control-height')))errors.push({kind:'stretched-footer',height:e.getBoundingClientRect().height});
  for(const e of document.querySelectorAll('.crm-card-tabs'))if(visible(e)&&e.getBoundingClientRect().height<parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crm-control-height')))errors.push({kind:'clipped-tabs'});
  for(const e of document.querySelectorAll('.crm-input')){if(!visible(e))continue;const s=getComputedStyle(e);if(s.fontSize!==(innerWidth<1024?'16px':'14px'))errors.push({kind:'input',size:s.fontSize});if(e.closest('.crm-input-group')&&s.borderTopWidth!=='0px')errors.push({kind:'double-border',cls:e.className});}
  for(const e of document.querySelectorAll('.admin-dialog')){if(!visible(e))continue;const r=e.getBoundingClientRect();if(r.left< -2||r.right>innerWidth+2||e.scrollWidth>e.clientWidth+2)errors.push({kind:'dialog-bounds',left:r.left,right:r.right,overflow:e.scrollWidth-e.clientWidth});}
  return errors;
 });const measured=await measures(page);
 const findings=[...typography.map(item=>({kind:'typography',...item})),...viewport,...errors,...measured.unifiedControls,...measured.contrast.filter(item=>!item.hasImage).map(item=>({kind:'contrast',...item}))];
 if(findings.length){const error=new Error('Shared element render contract: '+findings.length+' findings');error.findings=findings;throw error;}
 return measured;
}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const selectedIds=(process.env.CRM_ELEMENTS_CASES||'').split(',').filter(Boolean);
 if(selectedIds.some(id=>!cases.some(item=>item.id===id)))throw Error('Unknown CRM_ELEMENTS_CASES value');
 const selected=selectedIds.length?cases.filter(item=>selectedIds.includes(item.id)):cases;
 const widths=[...new Set((process.env.CRM_ELEMENTS_WIDTHS||'390,1440').split(',').map(Number))];
 const themes=[...new Set((process.env.CRM_ELEMENTS_THEMES||'light,dark').split(','))];
 if(widths.some(width=>![390,1440].includes(width))||themes.some(theme=>!['light','dark'].includes(theme)))throw Error('Use supported CRM element widths/themes');
 const browser=await chromium.launch(require('./crm-test-browser.cjs')),results=[];
 const complete=!selectedIds.length&&widths.length===2&&themes.length===2;
 const report=path.join(output,complete?'report.json':`report-${widths.join('-')}-${themes.join('-')}${selectedIds.length?'-focused':''}.json`);
 try{
  for(const width of widths)for(const theme of themes)for(const item of selected){
   const f=await isolatedContext(browser,width,false,false,{fixtures,allowFixtureForms:true}),p=f.page;
   const result={width,theme,id:item.id,route:item.route,failures:[]};
   const check=async(stage,work)=>{try{await work();}catch(error){result.failures.push({stage,message:error.stack||String(error),findings:error.findings});}};
   p.setDefaultTimeout(12000);
   await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:origin}]);
   // A public provider icon is synthetic artwork too, never a live CDN request.
   await f.context.route('https://static.tildacdn.com/tild3738-3931-4064-a232-376134356330/CDEK_logo.png',route=>{assert.equal(route.request().headers().authorization,undefined);return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#f1f7f3"/><text x="10" y="27" fill="#27865b" font-size="23">CDEK</text></svg>'});});
   try{
    await p.goto(origin+item.route,{waitUntil:'networkidle'});
    await item.open(p);const panel=p.locator(item.panel).first();await panel.waitFor();await p.evaluate(()=>document.fonts.ready);
    await check('render',()=>elements(p));
    if(['task','deal-card'].includes(item.id)){
     const names=['Общее','Подзадачи','Вложения','Комментарии','История изменений'];
     await check('tabs',async()=>{
      assert.deepEqual(await panel.getByRole('tab').allTextContents(),names);
      for(const name of names){await panel.getByRole('tab',{name,exact:true}).click();await check('tab '+name,()=>elements(p));await p.screenshot({path:path.join(output,`${width}-${theme}-${item.id}-${name}.png`)});}
      await panel.locator('.crm-change-history article').first().waitFor();
     });
     await check('draft survives tab changes',async()=>{
      await panel.getByRole('tab',{name:'Общее',exact:true}).click();const input=panel.getByLabel('Название',{exact:true});
      await input.fill('Несохранённый черновик');await panel.getByRole('tab',{name:'Комментарии',exact:true}).click();await panel.getByRole('tab',{name:'Общее',exact:true}).click();assert.equal(await input.inputValue(),'Несохранённый черновик');
     });
    }
    if(item.id==='b2b-order'){
     for(const name of ['Обзор','Склад 1С','История','Условия и заметки'])await check('inline order '+name,async()=>{await panel.getByRole('tab',{name,exact:true}).click();await elements(p);});
     await panel.getByRole('tab',{name:'Обзор',exact:true}).click();
    }
    await check('primary hover',async()=>{
     const primary=panel.locator('.crm-button--primary:visible:enabled').first();
     if(await primary.count()){const colour=await primary.evaluate(el=>getComputedStyle(el).color);await primary.hover();await primary.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{})));});assert.equal(await primary.evaluate(el=>getComputedStyle(el).color),colour);await elements(p);}
    });
    await p.screenshot({path:path.join(output,`${width}-${theme}-${item.id}.png`)});
   }catch(error){result.failures.push({stage:'open/interaction',message:error.stack||String(error)});await p.screenshot({path:path.join(output,`${width}-${theme}-${item.id}-failure.png`)}).catch(()=>{});}
   finally{
    await check('isolated traffic',async()=>{for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors,[]);});
    result.traffic=f.traffic;result.browserErrors=f.errors;results.push(result);await f.context.close();
    console.log(`${width}px ${theme} ${item.id}: ${result.failures.length?'FAIL ('+result.failures.map(failure=>failure.stage).join(', ')+')':'PASS'}`);
   }
  }
 }finally{await browser.close();fs.writeFileSync(report,JSON.stringify({origin,states:results.length,actualApiWrites:0,blockedWriteAttempts:results.reduce((sum,result)=>sum+result.traffic.prohibitedWrites.length,0),results},null,2));}
 const failures=results.filter(result=>result.failures.length);
 console.log(JSON.stringify({report,checked:results.length,passed:results.length-failures.length,failed:failures.map(({width,theme,id,failures})=>({width,theme,id,stages:failures.map(failure=>failure.stage)}))},null,2));
 assert.equal(failures.length,0,'Rendered dialog or inline card contract failed; inspect '+report);
}
module.exports={elements,cases};if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
