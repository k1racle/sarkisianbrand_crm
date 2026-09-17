/* Navigation interactions only; private reads mocked, writes/external traffic forbidden. */
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const assert=require('node:assert/strict');
const fixtures=new Map([
  ['/auth/access',{role:'ADMIN',permissions:['admin.read','catalog.read','crm.read','customers.read','web_orders.read','loyalty.read','marketplace.read','helpdesk.read','leadership.read','system.manage','media.read'],denied:[]}],
  ['/crm/dashboard',{forecast:0,wonMonth:{amount:0,count:0},openLeads:0,customers:0,overdueTasks:0,dueToday:0,funnel:[],recentInteractions:[]}],
  ['/crm/tasks',[]],
  ['/marketplaces/orders',[]],['/marketplaces/integrations',[]],
  ['/helpdesk/tickets',[]],['/helpdesk/dashboard',{open:0,overdue:0,resolvedToday:0,unassigned:0,queues:[]}],
  ['/leadership/overview',{sales:{revenue:0,previousRevenue:0,orders:0,averageOrder:0,growth:0},customers:{total:0,new:0},operations:{lowStock:0,helpdeskOverdue:0,helpdeskOpen:0,activeTasks:0,openLeads:0},channels:[]}],
]);
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{for(const width of [1440,390,320]){
    const f=await isolatedContext(browser,width,false,false,{fixtures});
    try{
      await f.page.goto('http://127.0.0.1:3001/workspace',{waitUntil:'domcontentloaded'});
      await f.page.locator('.workspace-frame h1').waitFor();
      for(const [area,path] of [['crm','/crm'],['marketplaces','/crm-marketplaces/overview'],['site','/admin-workspace/dashboard'],['support','/helpdesk/overview'],['management','/leadership/overview']]){
        if(width<800)await f.page.getByRole('button',{name:'Открыть разделы',exact:true}).click();
        await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).selectOption(area);
        await f.page.waitForURL(url=>url.pathname===path,{waitUntil:'domcontentloaded'});
        await f.page.locator('.workspace-frame h1').waitFor();
        assert.equal(await f.page.getByLabel('Выбрать рабочее пространство',{exact:true}).inputValue(),area);
        if(area==='marketplaces')assert.equal(await f.page.locator('.wn-group-items a[href="/crm-marketplaces/orders"]').count(),1);
        assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No page overflow');
      }
      await f.page.locator('.wn-chat-trigger').click();
      await f.page.locator('.platform-chat .chat-body').waitFor();
      assert.ok(f.traffic.mockedReads.includes('/platform-chat/channels'));
      assert.equal(await f.page.locator('.wn-chat-trigger').getAttribute('aria-expanded'),'true');
      await f.page.getByRole('button',{name:'Закрыть чат',exact:true}).click();
      await f.page.locator('.platform-chat').waitFor({state:'hidden'});
      await f.page.locator('.wn-signout').click();
      await f.page.waitForURL('**/workspace-login',{waitUntil:'domcontentloaded'});
      assert.equal(await f.page.evaluate(()=>localStorage.getItem('sarkisian-workspace-token')),null);
      for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
      assert.deepEqual(f.errors,[]);
      console.log(`${width}: five workspace transitions, marketplace sales, chat open/close and local sign-out PASS`);
    }finally{await f.context.close();}
  }}finally{await browser.close();}
  console.log('3 isolated browser cases PASS. Actual HTTP/API writes: 0. No integration tests.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
