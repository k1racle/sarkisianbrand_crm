/* CRM UI uses fake sessions and read-only API fixtures. PWA exercises a real
 * localhost service worker in a separate anonymous context, without credentials. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const base = process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001';
const output = path.resolve(__dirname, '../.screenshots/crm-workspace');
const permissions = ['admin.read','crm.read','crm.write','content_plan.read','content_plan.write','content_plan.approve','customers.read','customers.write','web_orders.read','loyalty.read','partners.read','partners.write','partners.payouts','helpdesk.read','leadership.read','media.read','system.manage','oms.read','oms.write','marketplace.read','marketplace.configure'];
const fixtures = new Map([
  ['/auth/access', { permissions }],
  ['/crm/dashboard', { forecast:125000, wonMonth:{amount:74000,count:6}, openLeads:12, customers:43, overdueTasks:0, dueToday:2, funnel:[], recentInteractions:[] }],
  ['/crm/tasks', []], ['/crm/team', []], ['/crm/leads', []], ['/crm/pipelines', [{id:'default',name:'Продажи'}]], ['/crm/pipeline', {id:'default',name:'Продажи',stages:[]}],
  ['/crm/content-plan', {items:[],total:0}], ['/crm/content-plan/team', []],
  ['/customer-360/dashboard', { totalCustomers:0, b2cCustomers:0, b2bCustomers:0, organizations:0 }],
  ['/customer-360/customers', []], ['/customer-360/organizations', []],
  ['/helpdesk/tickets', []], ['/helpdesk/agents', []],
  ['/admin/contact-messages', {items:[],total:0,unread:0,page:1,pages:1}], ['/admin/contact-messages/settings', {recipientEmail:'',deliveryEnabled:false}],
  ['/partners/admin/BLOGGER/overview', {settings:{},summary:{participants:0,pending:0,uniqueVisitors:0,registrations:0},totals:[]}],
  ['/partners/admin/BLOGGER/participants', {settings:{},rows:[],total:0,page:1,pages:1}],
  ['/leadership/overview', {sales:{revenue:0,previousRevenue:0,orders:0,averageOrder:0,growth:0},customers:{total:0,new:0},operations:{lowStock:0,helpdeskOverdue:0,helpdeskOpen:0,activeTasks:0,openLeads:0},channels:[]}],
]);
async function assertWidth(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'No viewport overflow');
}
async function assertTypography(page) {
  const findings=await page.evaluate(()=>[...document.querySelectorAll('.crm-app *,.crm-app-login *,.crm-install-dialog *,.crm-search-dialog *,.admin-dialog *')].flatMap(el=>{
    if(el.closest('svg') || !el.getBoundingClientRect().width || !el.getBoundingClientRect().height) return [];
    if(!el.matches('input,select,textarea') && ![...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim())) return [];
    const style=getComputedStyle(el), input=el.matches('input,select,textarea');
    const chrome=!!el.closest('.crm-app-sidebar,.crm-topbar,.crm-mobile-tabs');
    const family=style.fontFamily.replace(/["\s]/g,'');
    const sizes=chrome?[10,11,12,13,14,18]:[12,13,14,16,18,20,24,28];
    return sizes.includes(parseFloat(style.fontSize)) && ['400','500','600'].includes(style.fontWeight) && family==='Montserrat,Arial,sans-serif' ? [] : [{tag:el.tagName,cls:el.className,text:el.textContent.trim().slice(0,40),size:style.fontSize,weight:style.fontWeight,family}];
  }));
  assert.deepEqual(findings,[], 'CRM uses only approved text sizes and weights');
}
async function assertMenuSurface(page,theme='light') {
  const sidebar=page.locator('.crm-app-sidebar');
  assert.equal(await sidebar.evaluate(el=>getComputedStyle(el).backgroundColor),theme==='dark'?'rgb(29, 32, 37)':'rgb(247, 248, 250)');
  const target=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crm-control-height')));
  for(const height of await page.locator('.crm-navigation a:visible').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height)))assert.ok(height>=target-.5,'Navigation follows the current density; touch targets remain44px');
  await assertTypography(page);
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    const records=require('./workspace-design-review.cjs').fixtures;
    for(const width of process.argv.includes('--pwa-only')?[]:[360,390,768,1440])for(const theme of ['light','dark']){
      const f=await isolatedContext(browser,width,false,false,{fixtures:records}),p=f.page;
      let logoutRequests=0;
      await f.context.route('**/api/v1/auth/logout',async route=>{
        const request=route.request(),headers={'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
        if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
        assert.equal(request.method(),'POST');assert.equal(request.headers().authorization,'Bearer mock-admin-design-not-a-valid-jwt');logoutRequests++;
        return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({loggedOut:true})});
      });
      p.setDefaultTimeout(12000);
      await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:base}]);
      try{
        await p.goto(base+'/crm/',{waitUntil:'networkidle'});
        await p.locator('.crm-frame h1').waitFor();await p.evaluate(()=>document.fonts.ready);
        assert.equal(await p.locator('.crm-frame h1').textContent(),'Мой день');
        assert.equal(await p.locator('.crm-frame h1').evaluate(el=>getComputedStyle(el).fontSize),await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--crm-type-page').trim()));
        await assertWidth(p);await assertTypography(p);
        const primary=p.locator('.crm-day-head .crm-button--primary').first();
        assert.equal(await primary.evaluate(el=>getComputedStyle(el).fontSize),'13px');
        assert.equal(await primary.evaluate(el=>getComputedStyle(el).color),theme==='dark'?'rgb(30, 27, 75)':'rgb(255, 255, 255)');
        await primary.hover();
        assert.equal(await primary.evaluate(el=>getComputedStyle(el).color),theme==='dark'?'rgb(30, 27, 75)':'rgb(255, 255, 255)');
        await p.mouse.move(0,0);
        if(width<1024){await p.getByRole('button',{name:'Открыть разделы CRM',exact:true}).click();await p.getByRole('dialog',{name:'Разделы CRM'}).waitFor();}
        await assertMenuSurface(p,theme);
        if(width<1024)await p.keyboard.press('Escape');
        await p.keyboard.press('Control+k');await p.getByLabel('Название раздела CRM').fill('клиенты 360');
        await p.locator('.crm-search-dialog a[href="/crm/customers"]').click();await p.waitForURL('**/crm/customers');
        await p.locator('.crm-frame h1').waitFor();await assertWidth(p);await assertTypography(p);
        for(const destination of ['/crm/tasks','/crm/deals']){
          if(width<1024)await p.getByRole('button',{name:'Открыть разделы CRM',exact:true}).click();
          await p.locator(`.crm-primary-navigation a[href="${destination}"]`).click();await p.waitForURL(url=>url.pathname===destination);
          await p.locator('.crm-frame h1').waitFor();await assertWidth(p);await assertTypography(p);
        }
        await p.getByRole('button',{name:'Открыть чат команды',exact:true}).click();await p.locator('.crm-messenger button[aria-label="Закрыть чат"]:visible').first().waitFor();
        await assertTypography(p);await p.locator('.crm-messenger button[aria-label="Закрыть чат"]:visible').first().click();
        await p.screenshot({path:path.join(output,`${width}-${theme}-shell.png`),fullPage:true});
        if(width<1024)await p.getByRole('button',{name:'Открыть разделы CRM',exact:true}).click();
        await p.getByRole('button',{name:'Выйти из CRM',exact:true}).click();await p.waitForURL('**/crm/login');
        await p.waitForFunction(()=>localStorage.getItem('sarkisian-workspace-token')===null);
        assert.equal(await p.evaluate(()=>localStorage.getItem('sarkisian-workspace-token')),null);
        assert.equal(logoutRequests,1,'Sign-out revokes the synthetic server session exactly once');
        assert.deepEqual(f.errors,[]);for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
        console.log(`${width}px ${theme}: approved CRM shell, navigation, search, chat, logout PASS`);
      }finally{await f.context.close();}
    }
    if(!process.argv.includes('--pwa-only')){
      const restricted=await isolatedContext(browser,390,false,false,{fixtures:new Map([...records,['/auth/access',{permissions:['crm.read','customers.read']}]]),actor:{role:'MANAGER_B2B'}});
      try{
        await restricted.page.goto(base+'/crm/');await restricted.page.locator('.crm-frame h1').waitFor();
        await restricted.page.getByRole('button',{name:'Открыть разделы CRM',exact:true}).click();
        assert.equal(await restricted.page.locator('.crm-navigation a[href="/crm/bloggers/payouts"]').count(),0);
        assert.equal(await restricted.page.locator('.crm-navigation a[href="/crm/orders"]').count(),0);
        await restricted.page.goto(base+'/crm/bloggers/payouts');await restricted.page.waitForURL('**/crm/');
        assert.ok(!restricted.traffic.mockedReads.some(endpoint=>endpoint.includes('payouts')));
        console.log('Restricted CRM navigation and direct-route guard PASS');
      }finally{await restricted.context.close();}
    }

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sarkisian-crm-pwa-'));
    const pwa = await chromium.launchPersistentContext(profile, {...require('./crm-test-browser.cjs'), viewport:{width:390,height:844},serviceWorkers:'allow'});
    try {
      const unexpected = [];
      await pwa.route('**/*', route => {
        const req=route.request(), url=new URL(req.url());
        if (url.origin !== new URL(base).origin || url.pathname.includes('/api/')) { unexpected.push(url.pathname); return route.abort(); }
        return route.continue();
      });
      const page = await pwa.newPage();
      page.on('pageerror', error => console.error('PWA page error:', error.message));
      await page.goto(base+'/crm-pipeline?pipeline=test#card');
      await page.waitForURL(url=>url.pathname==='/crm/login' && url.searchParams.get('redirect')==='/crm/deals?pipeline=test#card');
      await page.locator('.crm-login-card').waitFor();
      const installButton=page.getByRole('button',{name:'Установить CRM',exact:true});
      assert.equal(await installButton.evaluate(el=>getComputedStyle(el).color),'rgb(67, 56, 202)','Installation is a readable secondary action');
      await installButton.hover();
      assert.equal(await installButton.evaluate(el=>getComputedStyle(el).color),'rgb(67, 56, 202)','Install label remains readable on hover');
      await assertTypography(page);
      await page.getByRole('button',{name:'Показать пароль'}).click();
      assert.equal(await page.locator('#crm-password').getAttribute('type'),'text');
      await page.getByRole('button',{name:'Скрыть пароль'}).click();
      const registration = await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,script:r.active?.scriptURL};});
      assert.equal(registration.scope, base+'/crm/');
      const manifest = await (await pwa.request.get(base+'/crm/manifest.webmanifest')).json();
      assert.equal(manifest.start_url, '/crm/'); assert.equal(manifest.scope, '/crm/'); assert.equal(manifest.display, 'standalone');
      for(const size of [192,512]) {
        const icon=manifest.icons.find(icon=>icon.sizes===`${size}x${size}`);
        const response=await pwa.request.get(base+icon.src); assert.equal(response.status(),200); assert.match(response.headers()['content-type'],/image\/png/);
      }
      const cdp = await pwa.newCDPSession(page);
      await cdp.send('Page.enable');
      const result=await cdp.send('Page.getAppManifest');
      assert.deepEqual(result.errors,[],'Manifest is valid in Chromium');
      const installability=await cdp.send('Page.getInstallabilityErrors');
      assert.deepEqual(installability.installabilityErrors,[],'Browser reports app installable');
      await page.screenshot({path:path.join(output,'login-mobile.png'),fullPage:true});
      await pwa.setOffline(true);
      await page.goto(base+'/crm/tasks');
      await page.getByRole('heading',{name:'Вы временно не в сети'}).waitFor();
      await page.getByRole('button',{name:'Попробовать снова'}).click();
      await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('пока не восстановлено'), null, {timeout:5000});
      const cached=await page.evaluate(async()=>{const names=await caches.keys();const entries=await Promise.all(names.map(async name=>(await(await caches.open(name)).keys()).map(request=>new URL(request.url).pathname)));return entries.flat();});
      assert.ok(cached.length >= 6);
      const publicAssets=new Set(['/crm/pwa/offline.html','/crm/pwa/offline.css','/crm/pwa/offline.js','/crm/pwa/icon.svg','/crm/pwa/icon-192.png','/crm/pwa/icon-512.png','/crm/pwa/icon-180.png','/crm/pwa/icon-maskable-512.png','/fonts/mont/Mont-Regular.woff2','/fonts/mont/Mont-Bold.woff2','/fonts/montserrat-cyrillic.woff2','/fonts/montserrat-latin.woff2']);
      assert.ok(cached.every(url=>publicAssets.has(url)), 'Only explicitly allowed public offline assets and fonts are cached');
      await page.screenshot({path:path.join(output,'offline-mobile.png'),fullPage:true});
      await pwa.setOffline(false);
      await page.getByRole('button',{name:'Попробовать снова'}).click();
      await page.waitForURL(url=>url.pathname==='/crm/login' && url.searchParams.get('redirect')==='/crm/tasks');
      assert.deepEqual(unexpected,[]);
      console.log('PWA manifest/icons/installability, guest deep-link, real service worker, offline/recovery, public-only cache PASS');
    } finally {
      await pwa.close();
      assert.equal(path.dirname(profile), path.resolve(os.tmpdir()));
      assert.ok(path.basename(profile).startsWith('sarkisian-crm-pwa-'));
      fs.rmSync(profile, {recursive:true,force:true});
    }
  } finally { await browser.close(); }
}
module.exports = { fixtures, assertTypography, assertWidth };
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1;});
