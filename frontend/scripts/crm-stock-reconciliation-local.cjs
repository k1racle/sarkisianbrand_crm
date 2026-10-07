// Read-only UI verification; populated states use response evidence from the local API smoke.
const { chromium } = require('playwright-core'), assert = require('node:assert/strict'), fs = require('node:fs');
const base=process.env.STOCK_QA_URL||process.env.LOCAL_SITE_URL||'http://127.0.0.1:3001', evidence=JSON.parse(fs.readFileSync(process.env.STOCK_QA_EVIDENCE||'/evidence/stock-acceptance.json'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),p=await browser.newPage({viewport:{width:1880,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(base+'/crm/login');await p.locator('input[type=email]').fill(process.env.LOCAL_ADMIN_EMAIL);await p.locator('input[type=password]').fill(process.env.LOCAL_ADMIN_PASSWORD);await p.locator('button[type=submit]').click();await p.waitForURL(u=>['/crm','/crm/'].includes(u.pathname));
  await p.goto(base+'/crm/inventory');await p.locator('button.crm-inventory-row').first().click();await p.getByRole('tab',{name:'Сверка 1С',exact:true}).click();await p.getByText('Данные 1С ещё не получены',{exact:true}).waitFor();
  assert.equal(await p.locator('#inventory-reconciliation-panel .crm-stock-comparison').count(),0);await p.getByRole('button',{name:'Закрыть товар',exact:true}).click();
  let state='pending';
  await p.route('**/api/v1/oms/inventory**',route=>{
   assert.equal(route.request().method(),'GET');const url=new URL(route.request().url());
   const detail=url.pathname.split('/').pop()===evidence.variantId;
   const data=detail?evidence[state]:{...evidence.list,items:[evidence.pending.item],total:1,pages:1};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await p.reload();await p.locator('button.crm-inventory-row').first().waitFor();
  for(const width of [1880,1366,390]){
   await p.setViewportSize({width,height:1000});await p.locator('button.crm-inventory-row').first().click();await p.getByRole('tab',{name:'Сверка 1С',exact:true}).click();
   for(const name of ['pending','matched','difference','stale']){
    state=name;await p.getByRole('dialog').getByRole('button',{name:'Обновить',exact:true}).click();await p.locator('.crm-stock-status[data-state="'+evidence[name].reconciliation.status+'"]').waitFor();
    if(name==='stale')assert.equal(await p.getByRole('rowheader',{name:'Ожидается с учётом движений CRM',exact:true}).count(),0);
    else assert.equal(await p.getByRole('rowheader',{name:'Ожидается с учётом движений CRM',exact:true}).count(),1);
    await p.evaluate(()=>document.fonts.ready);
    const clipped=await p.locator('.crm-stock-status,.crm-stock-comparison,.crm-stock-comparison [role="cell"],.crm-stock-pending').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(b=>b.left < -1||b.right>innerWidth+1));
    assert.deepEqual(clipped,[],name+' '+width);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const bounds=await p.getByRole('dialog').boundingBox();assert(bounds.y>=-1 && bounds.y+bounds.height<=1001,'Dialog must fit viewport');
    if(name==='pending'||name==='difference')await p.screenshot({path:'/evidence/stock-'+name+'-'+width+'.png'});
   }
   await p.getByRole('tab',{name:'О товаре',exact:true}).click();await p.locator('#inventory-product-panel').waitFor({state:'visible'});
   await p.getByRole('tab',{name:'Сверка 1С',exact:true}).click();await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
  }
  assert.deepEqual(errors,[]);console.log('PASS UI: real missing snapshot; API-evidence pending/matched/difference/stale states; desktop/laptop/mobile, quantities, tabs, keyboard and no overflow. No business writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
