/* Complete management comfort audit. Loopback + isolated fixture network only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures,inventory}=require('./crm-management-workspace-mock.cjs');
const {assertTypography}=require('./crm-workspace-smoke.cjs');
const {measures}=require('./workspace-design-review.cjs');
const {managementFixtures,primary}=require('./crm-comfort-management-fixtures.cjs');
const origin=new URL(process.env.ADMIN_DESIGN_URL||'http://127.0.0.1:3001').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Loopback only');
const stage=process.argv.find(v=>v.startsWith('--stage='))?.slice(8)||'baseline';
const dataset=process.argv.find(v=>v.startsWith('--dataset='))?.slice(10)||'default';
const output=path.resolve(__dirname,'../.screenshots/crm-comfort-management',stage);
fs.mkdirSync(output,{recursive:true});
const slug=route=>route.replace(/^\/crm\//,'').replaceAll('/','-');
const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function capture(page,route,state,width,height,theme,report,options={}){
 await page.evaluate(()=>document.fonts.ready);
 if(!options.preservePosition)await page.evaluate(()=>{document.activeElement?.blur?.();scrollTo(0,0);});
 else await page.evaluate(()=>new Promise(resolve=>{let last=scrollY,stable=0;const until=performance.now()+1500;const tick=()=>{const next=scrollY;stable=Math.abs(next-last)<.5?stable+1:0;last=next;if(stable>=5||performance.now()>until)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
 const safe=state.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,72);
 const file=`${width}-${theme}-${slug(route)}-${safe}.png`;
 await page.screenshot({path:path.join(output,file),fullPage:false});
 const ui=await page.evaluate(()=>{const visible=el=>!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};const main=document.querySelector('.crm-management-workspace')||document.querySelector('main');return{pageHeight:document.documentElement.scrollHeight,viewport:innerWidth,scroll:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('main h1,main h2,main h3')].filter(visible).map(el=>({text:el.textContent.trim(),...rect(el)})),tabs:[...document.querySelectorAll('main [role=tab]')].filter(visible).map(el=>({text:el.textContent.trim(),selected:el.getAttribute('aria-selected')})),buttons:[...(main||document).querySelectorAll('button')].filter(visible).map(el=>({text:el.getAttribute('aria-label')||el.textContent.trim()||el.title,disabled:el.disabled,...rect(el)})),fields:[...(main||document).querySelectorAll('input,select,textarea')].filter(visible).map(el=>({label:el.getAttribute('aria-label')||el.labels?.[0]?.textContent.trim(),type:el.type,...rect(el)})),dialogs:[...document.querySelectorAll('[role=dialog]')].filter(visible).map(el=>({name:el.getAttribute('aria-label')||document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,...rect(el)}))};});
 let typography=[];try{await assertTypography(page);}catch(error){typography=error.actual;}
 const rendered=await measures(page),density=await page.locator('html').getAttribute('data-crm-density'),appliedTheme=await page.locator('html').getAttribute('data-crm-theme');
 report.push({route,state,width,height,theme,appliedTheme,density,file,...ui,typography,rendered});
 assert.equal(appliedTheme,theme,'The requested theme is applied');
 assert.ok(ui.scroll<=ui.viewport+1,`${route} ${state}: overflow`);
 if(route==='/crm/settings/integrations'&&await page.locator('.category-tabs').count()){
  const tabs=await page.locator('.category-tabs').evaluate(nav=>{const box=nav.getBoundingClientRect(),buttons=[...nav.querySelectorAll('button')];return{overlaps:buttons.slice(1).filter((button,i)=>button.getBoundingClientRect().left<buttons[i].getBoundingClientRect().right-1).map(b=>b.textContent),clipped:buttons.filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent),selected:(()=>{const r=nav.querySelector('button.active').getBoundingClientRect();return{left:r.left,right:r.right,navLeft:box.left,navRight:box.right};})()};});
  assert.deepEqual(tabs.overlaps,[],'Integration category hit areas do not overlap');
  assert.deepEqual(tabs.clipped,[],'Integration category labels fit their hit areas');
  assert.ok(tabs.selected.left>=tabs.selected.navLeft-1&&tabs.selected.right<=tabs.selected.navRight+1,'The selected integration category is visible after fonts and scrolling settle');
  if(await page.locator('.audience-filter').count()){
   const audience=await page.locator('.audience-filter').evaluate(nav=>{const buttons=[...nav.querySelectorAll('button')];return buttons.flatMap((button,i)=>{const box=button.getBoundingClientRect(),previous=buttons[i-1]?.getBoundingClientRect();return button.scrollWidth>button.clientWidth+1||(previous&&Math.abs(box.top-previous.top)<1&&box.left<previous.right-1)?[button.textContent]:[];});});
   assert.deepEqual(audience,[],'Integration audience labels and hit areas do not overlap');
  }
 }
}
async function main(){
 const routeFilter=process.argv.find(a=>a.startsWith('--routes='))?.slice(9).split(',');
 const routes=(await inventory()).filter(r=>!routeFilter||routeFilter.includes(r.path)),report=[],issues=[];const browser=await chromium.launch(require('./crm-test-browser.cjs'));
 const requestedWidths=process.argv.find(a=>a.startsWith('--widths='))?.slice(9).split(',').map(Number);
 const variants=(process.argv.includes('--mobile-only')?[[390,844,'light'],[390,844,'dark']]:[[1366,768,'light'],[1366,768,'dark'],[1440,900,'light'],[1440,900,'dark'],[390,844,'light'],[390,844,'dark']]).filter(v=>!requestedWidths||requestedWidths.includes(v[0]));
 try{for(const [width,height,theme]of variants){
  const f=await isolatedContext(browser,width,false,false,{fixtures:dataset==='default'?fixtures():managementFixtures(dataset),allowFixtureForms:true}),p=f.page;await p.setViewportSize({width,height});
  let currentRoute='';
  if(dataset==='error')await p.route('**/api/v1/**',route=>{const req=route.request(),endpoint=new URL(req.url()).pathname.replace('/api/v1','');return req.method()==='GET'&&endpoint===primary(currentRoute)?reply(route,{message:'Не удалось загрузить данные. Повторите загрузку.'},503):route.fallback();});
  await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:origin}]);
  if(process.argv.includes('--comfortable'))await f.context.addCookies([{name:'sarkisian-crm-density-v1',value:encodeURIComponent(JSON.stringify({'mock-admin':'comfortable'})),url:origin}]);
  try{for(const item of routes){
   currentRoute=item.path;
   await p.goto(origin+item.path,{waitUntil:'networkidle'});await p.locator('h1:visible').first().waitFor();
   await capture(p,item.path,dataset+(process.argv.includes('--comfortable')?'-comfortable':''),width,height,theme,report);
   if(process.argv.includes('--comfortable'))assert.equal(report.at(-1).density,'comfortable','The requested density is applied');
   if(dataset==='error'&&item.path==='/crm/orders')assert.equal((await p.locator('h1:visible').innerText()).trim(),item.label,'Read errors preserve the order page context');
   if(dataset==='error'&&item.path==='/crm/settings/accounts'){assert.deepEqual(await p.locator('.account-summary strong').allTextContents(),['—','—','—','—'],'Unloaded account counts are unknown');assert.equal(await p.locator('.account-table > .empty').count(),0);assert.equal(await p.locator('.accounts-card > footer').count(),0);}
   if(dataset==='error'&&item.path==='/crm/settings/trash'){assert.match(await p.locator('.trash-card > header > div > span').first().innerText(),/^—/,'Unloaded trash count is unknown');assert.equal(await p.getByRole('heading',{name:'Корзина пуста',exact:true}).count(),0);assert.equal(await p.locator('.trash-card > footer').count(),0);}
   if(process.argv.includes('--strict')){const state=report.at(-1),findings=[...state.typography,...state.rendered.unifiedControls,...state.rendered.contrast.filter(c=>!c.hasImage)];if(findings.length)issues.push({route:item.path,width,theme,key:'render',items:findings});}
  }
  for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])if(f.traffic[key].length)issues.push({width,theme,key,items:f.traffic[key]});
  const unexpectedErrors=dataset==='error'?f.errors.filter(e=>!/Failed to load resource.*503/.test(e)):f.errors;
  if(unexpectedErrors.length)issues.push({width,theme,key:'console',items:unexpectedErrors});
  }finally{await f.context.close();}
  fs.writeFileSync(path.join(output,'coverage.json'),JSON.stringify({origin,stage,routes,states:report,issues},null,2));
  console.log(`PASS comfort management ${routes.length} routes ${width}x${height} ${theme}`);
 }
 }finally{await browser.close();}
 assert.deepEqual(issues,[]);console.log(`PASS ${report.length} route states captured for visual review.`);
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={capture,fixtures,inventory,output,slug};
