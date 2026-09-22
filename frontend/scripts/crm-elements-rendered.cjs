// Rendered design contract, including filled cards and dialogs. No real API writes.
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures}=require('./crm-rich-fixtures.cjs');
const {assertTypography,assertWidth}=require('./crm-workspace-smoke.cjs');
const {cases:legacyCases}=require('./workspace-dialogs-mock.cjs');
const output=path.resolve(__dirname,'../.screenshots/crm-elements');
const mapping={task:'/crm/tasks','new-task':'/crm/tasks',organization:'/crm/organizations',lead:'/crm/deals',pipeline:'/crm/deals',support:'/crm/support/tickets'};
const cases=legacyCases.filter(x=>mapping[x.id]).map(x=>({...x,route:mapping[x.id]}));
cases.push({id:'deal-card',route:'/crm/deals',panel:'.admin-dialog--drawer',open:p=>p.locator('.deal').first().click()},
 {id:'publication',route:'/crm/content-plan',panel:'.crm-content-editor',open:p=>p.locator('.crm-publication').first().click()},
 {id:'new-publication',route:'/crm/content-plan',panel:'.crm-content-editor',open:p=>p.getByRole('button',{name:'Новая публикация',exact:true}).click()},
 {id:'blogger-invite',route:'/crm/bloggers/participants',panel:'.partner-dialog',open:p=>p.getByRole('button',{name:'Добавить блогера',exact:true}).click()},
 {id:'chat',route:'/crm/',panel:'.platform-chat',open:p=>p.getByRole('button',{name:'Открыть чат команды'}).click()});
async function elements(page){
 await page.locator('.admin-dialog').evaluateAll(es=>Promise.all(es.flatMap(e=>e.getAnimations().map(a=>a.finished.catch(()=>{})))));
 await assertTypography(page);await assertWidth(page);
 const errors=await page.evaluate(()=>{
  const errors=[];const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  for(const e of document.querySelectorAll('.crm-button:not(.crm-card-action)')){if(!visible(e))continue;const s=getComputedStyle(e);const weight=e.matches('.crm-button--refresh')?'600':'400';if(s.fontWeight!==weight||s.fontSize!=='14px'||e.getBoundingClientRect().height<43)errors.push({kind:'button',text:e.textContent.trim(),weight:s.fontWeight,size:s.fontSize,height:e.getBoundingClientRect().height});if(e.matches('.crm-button--primary')&&s.color!=='rgb(255, 255, 255)')errors.push({kind:'primary',color:s.color});}
  for(const e of document.querySelectorAll('.crm-card-tabs'))if(visible(e)&&e.getBoundingClientRect().height<52)errors.push({kind:'clipped-tabs'});
  for(const e of document.querySelectorAll('.crm-board-column'))if(visible(e)&&getComputedStyle(e).backgroundColor!=='rgb(255, 255, 255)')errors.push({kind:'column',background:getComputedStyle(e).backgroundColor});
  for(const e of document.querySelectorAll('.crm-input')){if(!visible(e))continue;const s=getComputedStyle(e);if(s.fontSize!==(innerWidth<1024?'16px':'14px'))errors.push({kind:'input',size:s.fontSize});if(e.closest('.crm-input-group')&&s.borderTopWidth!=='0px')errors.push({kind:'double-border',cls:e.className});}
  for(const e of document.querySelectorAll('.admin-dialog')){if(!visible(e))continue;const r=e.getBoundingClientRect();if(r.left< -2||r.right>innerWidth+2||e.scrollWidth>e.clientWidth+2)errors.push({kind:'dialog-bounds',left:r.left,right:r.right,overflow:e.scrollWidth-e.clientWidth});}
  return errors;
 });assert.deepEqual(errors,[],'Shared element render contract');
}
async function main(){fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});let checked=0;
 try{for(const width of [390,1440])for(const item of cases){const f=await isolatedContext(browser,width,false,false,{fixtures,allowFixtureForms:true});const p=f.page;p.setDefaultTimeout(12000);try{
  await p.goto('http://127.0.0.1:3001'+item.route,{waitUntil:'networkidle'});await item.open(p);await p.locator(item.panel).first().waitFor();await elements(p);
  if(['task','deal-card'].includes(item.id)){
   const tabs=p.locator(item.panel).getByRole('tab');assert.deepEqual(await tabs.allTextContents(),['Общее','Подзадачи','Вложения','Комментарии','История изменений']);
   for(const name of ['Общее','Подзадачи','Вложения','Комментарии','История изменений']){await p.getByRole('tab',{name,exact:true}).click();await elements(p);await p.screenshot({path:path.join(output,`${width}-${item.id}-${name}.png`)});}
   await p.locator('.crm-change-history article').first().waitFor();
   await p.getByRole('tab',{name:'Общее',exact:true}).click();const input=p.locator(item.panel).getByLabel('Название',{exact:true});await input.fill('Несохранённый черновик');await p.getByRole('tab',{name:'Комментарии',exact:true}).click();await p.getByRole('tab',{name:'Общее',exact:true}).click();assert.equal(await input.inputValue(),'Несохранённый черновик');
  }
  const primary=p.locator(item.panel).locator('.crm-button--primary:visible:enabled').first();if(await primary.count()){await primary.hover();assert.equal(await primary.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');}
  await p.screenshot({path:path.join(output,`${width}-${item.id}.png`)});
  for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors,[]);checked++;console.log(`${width}px ${item.id} PASS`);
 }catch(e){await p.screenshot({path:path.join(output,`${width}-${item.id}-failure.png`)});throw new Error(`${width}px ${item.id}: ${e.stack}`);}finally{await f.context.close();}}}finally{await browser.close();}
 console.log(`${checked} rendered dialog scenarios PASS. Actual writes: 0.`);
}
module.exports={elements};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
