// Browser acceptance of palette, persistence and route isolation; API responses are synthetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{isolatedContext}=require('./admin-design-mock.cjs'),{fixtures:base}=require('./crm-rich-fixtures.cjs');
const origin='http://127.0.0.1:3001',output=path.resolve(__dirname,'../.screenshots/crm-themes');
const pages=['/crm/','/crm/customers','/crm/organizations','/crm/deals','/crm/files','/crm/work-time','/crm/settings/overview'];
const audit=[];
function themeFixtures(){
 const fixtures=new Map(base);
 fixtures.set('/staff-notifications',{items:[],fresh:[],unreadCount:0,nextCursor:null,through:new Date().toISOString(),popupsEnabled:false});
 const shared={status:'ACTIVE',canWrite:true,createdAt:'2026-10-01T10:00:00Z',accountManager:null,accountManagerId:null,relatedAccess:{orders:true,helpdesk:true,leads:true},orders:[],leads:[],interactions:[],helpdeskTickets:[],organizationMemberships:[],members:[],_count:{orders:1,leads:0,tasks:0,interactions:0,helpdeskTickets:0,members:1}};
 const customer={...shared,id:'theme-customer',firstName:'Анна',lastName:'Волкова',email:'customer@example.invalid',phone:'+70000000000',segment:'B2B'};
 const organization={...shared,id:'theme-organization',name:'Студия красоты «Форма»',legalName:'ООО «Форма»',inn:'1234567890',discountTier:5,creditLimit:0};
 fixtures.set('/customer-360/customers',[customer]);fixtures.set('/customer-360/customers/'+customer.id,customer);
 fixtures.set('/customer-360/organizations',[organization]);fixtures.set('/customer-360/team',[]);
 fixtures.set('/customer-360/dashboard',{customers:1,active:1,b2cCustomers:0,b2bCustomers:1,organizations:1,newCustomers:1});
 return fixtures;
}
async function loadedBackground(p,theme){
 assert.equal(await p.evaluate(t=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>1000);img.onerror=()=>resolve(false);img.src='/crm/backgrounds/'+t+'.png';}),theme),true,'Real background asset loaded');
 await p.evaluate(()=>document.fonts.ready);
}
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch(require('./crm-test-browser.cjs'));
 try{for(const width of [1440,390,320]){
  const fixtures=themeFixtures();
  const f=await isolatedContext(browser,width,false,false,{fixtures});const p=f.page;
  try{
   await p.goto(origin+'/crm/customers',{waitUntil:'networkidle'});
   assert.equal(await p.locator('html').getAttribute('data-crm-theme'),'light');
   await p.getByRole('button',{name:'Включить тёмную тему',exact:true}).click();
   await p.waitForFunction(()=>document.documentElement.dataset.crmTheme==='dark');
   assert.equal((await f.context.cookies()).find(c=>c.name==='sarkisian-crm-theme')?.value,'dark');
   await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('html').getAttribute('data-crm-theme'),'dark');
   for(const theme of ['dark','light']){
    if(theme==='light')await p.getByRole('button',{name:'Включить светлую тему',exact:true}).click();
    for(const route of (width===320?['/crm/customers']:pages)){
     await p.goto(origin+route,{waitUntil:'networkidle'});
     assert.equal(await p.locator('html').getAttribute('data-crm-theme'),theme);
     await loadedBackground(p,theme);
     const result=await p.evaluate(()=>{
      const body=getComputedStyle(document.body),html=document.documentElement;
      const panels=Array.from(document.querySelectorAll('.crm-surface,.crm-topbar,.crm-app-sidebar,.crm-board-column,.crm-input,.crm-login-card')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).map(e=>({class:e.className,background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
      const pale=Array.from(document.querySelectorAll('main *, .crm-topbar')).filter(e=>{const r=e.getBoundingClientRect();if(r.width*r.height<10000||e.matches('button,a,input,select,textarea'))return false;const rgb=getComputedStyle(e).backgroundColor.match(/^rgb\((\d+), (\d+), (\d+)\)$/);return rgb&&rgb.slice(1).every(n=>+n>190)}).map(e=>({tag:e.tagName,class:e.className}));
      return {background:body.backgroundImage,noOverflow:html.scrollWidth<=innerWidth,panels,pale};
     });
     assert.ok(result.background.includes('/crm/backgrounds/'+theme+'.png'));
     assert.equal(result.noOverflow,true,`${width} ${route}`);
     if(theme==='dark')assert.deepEqual(result.pale,[],`${width} ${route}: no bright legacy panels`);
     for(const panel of result.panels) if(theme==='dark')assert.notEqual(panel.background,'rgb(255, 255, 255)',panel.class);
     audit.push({width,theme,route,...result});
     await p.screenshot({path:path.join(output,`${width}-${theme}-${route.split('/').filter(Boolean).pop()||'home'}.png`),fullPage:true});
    }
   }
   // Theme controls also exist before authentication; the cookie applies to first HTML.
   await p.goto(origin+'/crm/customers',{waitUntil:'networkidle'});
   await p.getByRole('button',{name:'Включить тёмную тему',exact:true}).click();
   await p.getByRole('button',{name:'Найти раздел CRM',exact:true}).click();
   await p.getByRole('dialog').waitFor();
   assert.equal(await p.locator('.crm-search-dialog').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(43, 45, 48)');
   await p.screenshot({path:path.join(output,`${width}-dark-search.png`)});
   await p.getByRole('button',{name:'Закрыть поиск',exact:true}).click();
   await p.getByRole('button',{name:'Уведомления',exact:true}).click();
   await p.locator('.crm-notifications-panel').waitFor();
   assert.equal(await p.locator('.crm-notifications-panel').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(43, 45, 48)');
   await p.screenshot({path:path.join(output,`${width}-dark-notifications.png`)});
   await p.getByRole('button',{name:'Закрыть уведомления',exact:true}).click();
   await p.getByRole('button',{name:'Открыть чат команды',exact:true}).click();
   await p.locator('.crm-messenger').waitFor();
   await p.getByRole('heading',{name:'Сообщения',exact:true}).waitFor();
   await p.screenshot({path:path.join(output,`${width}-dark-chat.png`)});
   await p.getByRole('button',{name:'Закрыть чат',exact:true}).filter({visible:true}).first().click();
   await p.getByRole('button',{name:'Добавить клиента',exact:true}).click();
   await p.locator('.admin-dialog').waitFor();
   await p.screenshot({path:path.join(output,`${width}-dark-customer-dialog.png`)});
   // Drawer bodies teleport outside the shell; the reported regression was white on white.
   await p.goto(origin+'/crm/deals',{waitUntil:'networkidle'});
   await p.getByRole('button',{name:'Новая сделка',exact:true}).click();
   const drawer=p.locator('.admin-dialog.create');await drawer.waitFor();
   const brightSurfaces=await drawer.evaluate(root=>[root,...root.querySelectorAll('*')].filter(e=>{
    const r=e.getBoundingClientRect(),rgb=getComputedStyle(e).backgroundColor.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    return r.width*r.height>10000&&!e.matches('button,input,select,textarea')&&rgb&&rgb.slice(1).every(n=>+n>190);
   }).map(e=>e.className));
   assert.deepEqual(brightSurfaces,[],'Dark deal drawer has no bright legacy body or header');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Deal drawer fits the viewport');
   await p.screenshot({path:path.join(output,`${width}-dark-deal-dialog.png`)});
   const root=await p.request.get(origin+'/crm/login');
   assert.ok((await root.text()).includes('data-crm-theme="dark"'),'SSR palette follows preference cookie');
   const storefront=await p.request.get(origin+'/');const html=await storefront.text();
   assert.ok(!html.includes('data-crm-theme="dark"'),'Storefront is isolated from CRM palette');
   for(const key of ['prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   audit.push({width,unknownReads:f.traffic.unknownReads,errors:f.errors});
  }finally{await f.context.close();}
 }
 for(const width of [1440,390,320]){
  const f=await isolatedContext(browser,width,true),p=f.page;
  try{
   await f.context.addCookies([{name:'sarkisian-crm-theme',value:'dark',url:origin}]);
   await p.goto(origin+'/crm/login',{waitUntil:'networkidle'});await loadedBackground(p,'dark');
   assert.equal(await p.locator('html').getAttribute('data-crm-theme'),'dark');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await p.screenshot({path:path.join(output,`${width}-dark-login.png`)});
   await p.getByRole('button',{name:'Включить светлую тему',exact:true}).click();
   await p.getByRole('link',{name:/На сайт SARKISIAN/}).click();
   await p.waitForURL(origin+'/');
   await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-crm-theme'));
   assert.equal(await p.locator('html').getAttribute('data-crm-theme'),null,'Client navigation removes CRM theme');
  }finally{await f.context.close();}
 }
 }finally{await browser.close();fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(audit,null,2));}
 console.log(JSON.stringify({result:'PASS',screens:audit.filter(r=>r.route).length,checks:'light/dark, saved cookie, reload/SSR, 1440/390/320, backgrounds, surfaces, search and deal dialogs, storefront isolation',output}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
