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
const permissions = ['admin.read','crm.read','crm.write','content_plan.read','content_plan.write','content_plan.approve','customers.read','customers.write','web_orders.read','loyalty.read','partners.read','partners.write','partners.payouts','helpdesk.read','leadership.read','media.read','system.manage'];
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
    return [12,14,20,...(input&&innerWidth<1024?[16]:[])].includes(parseFloat(style.fontSize)) && ['400','600'].includes(style.fontWeight) ? [] : [{tag:el.tagName,cls:el.className,text:el.textContent.trim().slice(0,40),size:style.fontSize,weight:style.fontWeight}];
  }));
  assert.deepEqual(findings,[], 'CRM uses only approved text sizes and weights');
}
async function assertMenuSurface(page) {
  assert.equal(await page.locator('.crm-app-sidebar').evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'Legacy CRM CSS must not paint the new sidebar dark');
  for (const box of await page.locator('.crm-navigation a').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height))) assert.ok(box>=44, 'CRM navigation touch targets');
  const icons=await page.locator('.crm-navigation a svg').evaluateAll(nodes=>nodes.map(el=>({name:el.dataset.icon,shape:el.innerHTML,size:el.getAttribute('width')})));
  assert.ok(icons.every(icon=>icon.name && icon.name!=='LayoutDashboard' && icon.size==='20'),'Real, consistently sized icons, no fallback');
  assert.equal(new Set(icons.map(icon=>icon.shape)).size, icons.length,'Distinct rendered menu symbols');
  for(const size of await page.locator('.crm-navigation a > span').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).fontSize))) assert.equal(size,'14px');
  await assertTypography(page);
}
async function main() {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({executablePath: process.env.CRM_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true});
  try {
    for (const width of process.argv.includes('--pwa-only') ? [] : [360, 390, 768, 1440]) {
      const f = await isolatedContext(browser, width, false, false, {fixtures});
      try {
        await f.page.goto(base+'/crm/', {waitUntil:'networkidle'});
        await f.page.locator('.crm-frame h1').waitFor();
        if(width>=1024) await assertMenuSurface(f.page);
        assert.equal(await f.page.locator('.console-rail').count(), 0, 'Separate CRM shell');
        assert.equal(await f.page.locator('link[rel="manifest"]').getAttribute('href'), '/crm/manifest.webmanifest');
        await assertWidth(f.page);
        await assertTypography(f.page);
        assert.equal(await f.page.locator('.crm-frame h1').evaluate(el=>getComputedStyle(el).fontSize),'20px');
        const primary=f.page.locator('.head-actions a.primary');
        assert.equal(await primary.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(102, 88, 217)');
        await primary.hover();
        await f.page.waitForFunction(()=>getComputedStyle(document.querySelector('.head-actions a.primary')).backgroundColor==='rgb(81, 67, 188)');
        assert.equal(await primary.evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
        await f.page.mouse.move(0,0);
        await f.page.screenshot({path:path.join(output, `dashboard-${width}.png`),fullPage:true});
        await f.page.getByRole('button', {name:'Установить CRM', exact:true}).click();
        await f.page.getByRole('heading', {name:'CRM на вашем устройстве'}).waitFor();
        await assertTypography(f.page);
        await f.page.getByRole('button', {name:'Понятно', exact:true}).click();
        if (width < 1024) {
          for (const box of await f.page.locator('.crm-mobile-tabs a,.crm-mobile-tabs button').evaluateAll(nodes => nodes.map(n=>{const b=n.getBoundingClientRect();return {w:b.width,h:b.height};}))) assert.ok(box.w >= 44 && box.h >= 44);
          await f.page.getByRole('button', {name:'Открыть разделы CRM', exact:true}).click();
          await f.page.getByRole('dialog', {name:'Разделы CRM'}).waitFor();
          await assertMenuSurface(f.page);
          await f.page.screenshot({path:path.join(output,`menu-${width}.png`),fullPage:false});
          await f.page.locator('.crm-navigation').evaluate(el=>{el.scrollTop=el.scrollHeight;});
          await f.page.screenshot({path:path.join(output,`menu-partners-${width}.png`),fullPage:false});
          await f.page.keyboard.press('Escape');
          assert.equal(await f.page.locator('.crm-app-sidebar.is-open').count(), 0);
        }
        await f.page.getByRole('button', {name:'Найти раздел CRM', exact:true}).click();
        await f.page.getByLabel('Название раздела CRM').fill('клиенты 360');
        await assertTypography(f.page);
        await f.page.locator('.crm-search-dialog a').click();
        await f.page.waitForURL('**/crm/customers');
        await f.page.locator('.crm-frame h1').waitFor();
        await assertWidth(f.page);
        await assertTypography(f.page);
        await f.page.screenshot({path:path.join(output, `customers-${width}.png`), fullPage:true});
        if (width < 1024) await f.page.getByRole('button', {name:'Открыть разделы CRM', exact:true}).click();
        await f.page.locator('.crm-navigation a[href="/crm/tasks"]').last().click();
        await f.page.waitForURL('**/crm/tasks');
        await f.page.locator('.crm-frame h1').waitFor();
        await assertWidth(f.page);
        await assertTypography(f.page);
        if (width < 1024) await f.page.getByRole('button', {name:'Открыть разделы CRM', exact:true}).click();
        await f.page.locator('.crm-navigation a[href="/crm/deals"]').last().click();
        await f.page.waitForURL('**/crm/deals');
        await f.page.locator('.crm-frame h1').waitFor();
        await assertWidth(f.page);
        await assertTypography(f.page);
        await f.page.getByRole('button', {name:'Открыть чат команды', exact:true}).click();
        await assertTypography(f.page);
        await f.page.getByRole('button', {name:'Закрыть чат', exact:true}).click();
        if (width === 360 || width === 1440) {
          for (const destination of ['/crm/orders','/crm/messages','/crm/support/tickets','/crm/bloggers/overview','/crm/reports/sales']) {
            if(width<1024) await f.page.getByRole('button',{name:'Открыть разделы CRM',exact:true}).click();
            await f.page.locator(`.crm-navigation a[href="${destination}"]`).last().click();
            await f.page.waitForURL(url=>url.pathname===destination);
            await f.page.locator('.crm-frame h1').waitFor();
            await f.page.waitForFunction(()=>![...document.querySelectorAll('.crm-frame [aria-busy]')].some(el=>el.getAttribute('aria-busy')==='true'));
            await assertWidth(f.page);
            await assertTypography(f.page);
            if(destination==='/crm/bloggers/overview') {
              await f.page.locator('.partner-links a[href="/crm/bloggers/participants"]').click();
              await f.page.waitForURL('**/crm/bloggers/participants');
            }
          }
        }
        if (width < 1024) await f.page.getByRole('button', {name:'Открыть разделы CRM', exact:true}).click();
        await f.page.getByRole('button', {name:'Выйти из CRM', exact:true}).click();
        await f.page.waitForURL('**/crm/login');
        assert.equal(await f.page.evaluate(()=>localStorage.getItem('sarkisian-workspace-token')), null);
        assert.deepEqual(f.errors, []);
        for (const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        console.log(`${width}px: CRM navigation, customers/tasks/deals, search, chat, logout PASS`);
      } finally { await f.context.close(); }
    }
    for(const width of process.argv.includes('--pwa-only') ? [] : [360,1440]) {
      const taskFixtures=new Map([...fixtures, ['/crm/dashboard',{...fixtures.get('/crm/dashboard'),overdueTasks:1,dueToday:1}], ['/crm/tasks',[
        {id:'demo-late',title:'Согласовать условия первой закупки с новым салоном',status:'OVERDUE',dueDate:'2026-09-21T09:00:00Z',assignedTo:{firstName:'Анна',lastName:'Пример'}},
        {id:'demo-next',title:'Ответить на обращение клиента',status:'TODO',dueDate:'2026-09-23T09:00:00Z',assignedTo:{firstName:'Иван',lastName:'Пример'}},
      ]]]);
      const f=await isolatedContext(browser,width,false,false,{fixtures:taskFixtures});
      try {
        await f.page.goto(base+'/crm/',{waitUntil:'networkidle'});
        await f.page.locator('.task-check.overdue').waitFor();
        await assertWidth(f.page); await assertTypography(f.page);
        assert.equal(await f.page.locator('.dashboard-grid > article').first().getAttribute('class'),'panel tasks-panel');
        assert.ok(await f.page.locator('.task-date.late').textContent().then(text=>text.includes('Просрочена')),'Status has a text label, not color alone');
        for(const row of await f.page.locator('.task-list > button').evaluateAll(nodes=>nodes.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})))) assert.ok(row.scroll<=row.width+2,'Task content does not overflow');
        await f.page.screenshot({path:path.join(output,`dashboard-with-tasks-${width}.png`),fullPage:true});
        assert.deepEqual(f.errors,[]);
        for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks']) assert.deepEqual(f.traffic[key],[],key);
        console.log(`${width}px: populated dashboard, overdue status, task text/layout PASS`);
      } finally { await f.context.close(); }
    }
    const restricted = await isolatedContext(browser, 390, false, false, {fixtures:new Map([...fixtures, ['/auth/access',{permissions:['crm.read','customers.read']}]]),actor:{role:'MANAGER_B2B'}});
    try {
      await restricted.page.goto(base+'/crm/');
      await restricted.page.locator('.crm-frame h1').waitFor();
      await restricted.page.getByRole('button',{name:'Открыть разделы CRM'}).click();
      assert.equal(await restricted.page.locator('.crm-navigation a[href="/crm/bloggers/payouts"]').count(), 0);
      assert.equal(await restricted.page.locator('.crm-navigation a[href="/crm/orders"]').count(), 0);
      await restricted.page.goto(base+'/crm/bloggers/payouts');
      await restricted.page.waitForURL('**/crm/');
      assert.ok(!restricted.traffic.mockedReads.some(endpoint=>endpoint.includes('payouts')));
      console.log('Narrow-role CRM navigation/direct-route guard PASS (mock roles; server RBAC unchanged)');
    } finally { await restricted.context.close(); }
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sarkisian-crm-pwa-'));
    const pwa = await chromium.launchPersistentContext(profile, {executablePath: process.env.CRM_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true, viewport:{width:390,height:844},serviceWorkers:'allow'});
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
      assert.equal(await installButton.evaluate(el=>getComputedStyle(el).color),'rgb(81, 67, 188)','Installation is a readable secondary action');
      await installButton.hover();
      assert.equal(await installButton.evaluate(el=>getComputedStyle(el).color),'rgb(81, 67, 188)','Install label remains readable on hover');
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
      assert.ok(cached.every(url=>url.startsWith('/crm/pwa/')), 'Only public PWA assets cached');
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
