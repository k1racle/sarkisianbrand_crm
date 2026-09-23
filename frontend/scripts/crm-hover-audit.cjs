// Every registered CRM route, with all visible interactive states. Fixture reads only.
const {chromium}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');const {fixtures}=require('./crm-rich-fixtures.cjs');const {isolatedContext}=require('./admin-design-mock.cjs');
async function warmColours(page){return page.evaluate(()=>{
 const isWarm=value=>{const rgb=value.match(/[\d.]+/g)?.map(Number);return rgb&&!(rgb.length===4&&rgb[3]===0)&&rgb[0]>200&&rgb[0]>=rgb[1]&&rgb[1]>rgb[2]&&rgb[0]-rgb[2]>=2&&rgb[0]-rgb[2]<60;};
 return [...document.querySelectorAll('.crm-frame *,.admin-dialog *')].flatMap(e=>{if(!e.getClientRects().length||e.closest('svg'))return [];const s=getComputedStyle(e);return ['backgroundColor','borderTopColor'].filter(k=>isWarm(s[k])).map(k=>({cls:e.className,property:k,colour:s[k]}));});
});}
async function main(){const source=fs.readFileSync(path.resolve(__dirname,'../shared/crm-workspace.ts'),'utf8');const {CRM_DESTINATIONS}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
 const output=path.resolve(__dirname,'../.screenshots/crm-hover');fs.mkdirSync(output,{recursive:true});const failures=[];
 const b=await chromium.launch(require("./crm-test-browser.cjs"));let states=0;
 try{const f=await isolatedContext(b,1440,false,false,{fixtures});const p=f.page;p.setDefaultTimeout(5000);
  for(const route of CRM_DESTINATIONS){await p.goto('http://127.0.0.1:3001'+route.path,{waitUntil:'networkidle'});let findings=await warmColours(p);if(findings.length)failures.push({route:route.path,state:'default',findings});
   const controls=p.locator('.crm-frame .crm-interactive:visible,.crm-frame .crm-button:visible:enabled,.crm-frame .crm-item-card:visible');
   for(let i=0;i<await controls.count();i++){const c=controls.nth(i);await c.hover();await c.evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));findings=await warmColours(p);if(findings.length)failures.push({route:route.path,state:'hover',findings});states++;}
   if(route.path==='/crm/'){const colours=[];for(const selector of ['.task-list > button','.funnel > button','.activity-list > button','.quick-grid > a']){const row=p.locator(selector).first();await row.hover();await row.evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));colours.push(await row.evaluate(e=>getComputedStyle(e).backgroundColor));await p.screenshot({path:path.join(output,selector.includes('funnel')?'funnel.png':'day-'+colours.length+'.png')});}assert.deepEqual(colours,Array(4).fill('rgb(241, 238, 255)'),'All My Day rows share the same hover');}
  }
  for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])if(f.traffic[key].length)failures.push({key,items:f.traffic[key]});if(f.errors.length)failures.push({errors:f.errors});await f.context.close();
 }finally{await b.close();}fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({states,failures},null,2));assert.deepEqual(failures,[]);console.log(`CRM hover audit PASS: ${CRM_DESTINATIONS.length} routes, ${states} hover states, no beige surfaces; My Day row colours identical.`);
}
main().catch(e=>{console.error(JSON.stringify(e.actual||e.message,null,2));process.exitCode=1;});
