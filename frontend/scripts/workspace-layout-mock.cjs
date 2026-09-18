/* Compiled local UI. Private reads mocked; every HTTP write/provider request forbidden. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{auditTypography}=require('./workspace-typography-audit.cjs');
const fixtures=new Map([
 ['/auth/access',{role:'ADMIN',permissions:['admin.read','catalog.read','catalog.write','crm.read','customers.read','web_orders.read','loyalty.read','marketplace.read','helpdesk.read','leadership.read','system.manage','media.read'],denied:[]}],
 ['/crm/dashboard',{forecast:1000,wonMonth:{amount:500,count:1},openLeads:1,customers:4,overdueTasks:0,dueToday:0,funnel:[{id:'test-stage',name:'Новые',color:'#73757f',count:1,amount:1000}],recentInteractions:[]}],
 ['/marketplaces/orders',[]],['/marketplaces/integrations',[]],
 ['/helpdesk/tickets',[]],['/helpdesk/dashboard',{open:0,overdue:0,resolvedToday:0,unassigned:0,queues:[]}],
 ['/leadership/overview',{sales:{revenue:0,previousRevenue:0,orders:0,averageOrder:0,growth:0},customers:{total:0,new:0},operations:{lowStock:0,helpdeskOverdue:0,helpdeskOpen:0,activeTasks:0,openLeads:0},channels:[]}],
]);
async function main(){
 const output=path.resolve(__dirname,'../.screenshots/workspace-layout');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const width of [1920,1440,900,801,390,320]){
  const f=await isolatedContext(browser,width,false,false,{fixtures,preserveLayoutPreference:true});
  try{
   await f.page.goto('http://127.0.0.1:3001/crm',{waitUntil:'domcontentloaded'});await f.page.locator('.dashboard-grid').waitFor();
   const toggle=f.page.getByRole('button',{name:'Свернуть боковую панель',exact:true});
   const measure=()=>f.page.evaluate(()=>{
    const rail=document.querySelector('.studio-rail'),main=document.querySelector('.crm-main'),kpis=document.querySelector('.crm-main>.kpis'),head=document.querySelector('.crm-main>.page-head');
    const a=rail.getBoundingClientRect(),b=main.getBoundingClientRect(),c=kpis.getBoundingClientRect();return {rail:a.width,main:b.width,left:b.left,gutterLeft:c.left-b.left,gutterRight:b.right-c.right,headerLeft:parseFloat(getComputedStyle(head).paddingLeft),overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   if(width>800){
    assert.ok(await toggle.isVisible());let m=await measure();assert.equal(m.rail,250);assert.equal(m.main,width-250);assert.equal(m.gutterLeft,24);assert.equal(m.gutterRight,24);assert.equal(m.headerLeft,24);assert.equal(m.overflow,false);
    await toggle.click();const open=f.page.getByRole('button',{name:'Развернуть боковую панель',exact:true});assert.equal(await open.getAttribute('aria-expanded'),'false');
    assert.equal(await f.page.evaluate(()=>localStorage.getItem('sarkisian-workspace-rail-collapsed')),'true');
    m=await measure();assert.equal(m.rail,76);assert.equal(m.main,width-76);assert.equal(m.left,76);assert.equal(m.gutterLeft,24);assert.equal(m.gutterRight,24);assert.equal(m.overflow,false);
    assert.equal(await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).isVisible(),true);
    assert.equal(await f.page.locator('.studio-rail .studio-area-switch').count(),0);
    assert.equal(await f.page.locator('.wn-group-items a').first().isVisible(),false);
    assert.ok(await f.page.locator('.wn-group-toggle').first().isVisible());assert.ok(await f.page.locator('.rail-user').isVisible());
    await auditTypography(f.page);await f.page.screenshot({path:path.join(output,width+'-collapsed.png')});
    await f.page.reload({waitUntil:'domcontentloaded'});await open.waitFor();await f.page.locator('.dashboard-grid').waitFor();assert.equal((await measure()).rail,76);
    await f.page.locator('.wn-group-toggle').first().click();await toggle.waitFor();assert.ok(await f.page.locator('.wn-group-items a').first().isVisible());
    await toggle.click();await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).focus();assert.ok(await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).evaluate(el=>el===document.activeElement));
    // The remembered desktop preference never hides mobile navigation.
    await f.page.setViewportSize({width:390,height:900});await f.page.getByRole('button',{name:'Открыть разделы',exact:true}).click();
    assert.ok(await f.page.locator('.wn-group-items a').first().isVisible());
    await f.page.getByRole('button',{name:'Закрыть разделы',exact:true}).click();await f.page.setViewportSize({width,height:900});await open.click();
   }else{
    assert.equal(await toggle.isVisible(),false);const m=await measure();assert.equal(m.main,width);assert.equal(m.left,0);assert.equal(m.gutterLeft,16);assert.equal(m.gutterRight,16);assert.equal(m.overflow,false);
    await f.page.getByRole('button',{name:'Открыть разделы',exact:true}).click();assert.ok(await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).isVisible());await f.page.getByRole('button',{name:'Закрыть разделы',exact:true}).click();
    assert.ok(await f.page.locator('.wn-rail-dock').evaluate(el=>[...el.children].every(child=>child.scrollWidth<=child.clientWidth+2&&child.getBoundingClientRect().right<=innerWidth&&child.getBoundingClientRect().left>=0)),'Mobile dock captions do not clip');
   }
   await auditTypography(f.page);await f.page.screenshot({path:path.join(output,width+'-expanded.png')});
   for(const [area,destination]of [['marketplaces','/crm-marketplaces/overview'],['site','/admin-workspace/dashboard'],['support','/helpdesk/overview'],['management','/leadership/overview']]){
    await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).selectOption(area);await f.page.waitForURL(url=>url.pathname===destination,{waitUntil:'domcontentloaded'});await f.page.locator('.workspace-frame h1').waitFor();
    assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await auditTypography(f.page);
   }
   for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors,[]);
   console.log(width+': full-width content/gutters, '+(width>800?'collapse/reload/group/area focus and mobile resize':'mobile menu/dock')+', five business spaces PASS');
  }catch(error){await f.page.screenshot({path:path.join(output,width+'-failure.png')});throw error;}finally{await f.context.close();}
 }}finally{await browser.close();}
 console.log('6 rendered layout cases PASS. Actual API/DB writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
