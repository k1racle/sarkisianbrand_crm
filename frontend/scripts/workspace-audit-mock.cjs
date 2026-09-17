/* Built UI audit: fixtures only, all writes and external traffic forbidden. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const {auditTypography}=require('./workspace-typography-audit.cjs');
const { stripTypeScriptTypes } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.screenshots/workspace-audit');
const navigation = fs.readFileSync(path.join(root, 'composables/useWorkspaceNavigation.ts'), 'utf8');
const registry = {};
vm.runInNewContext(stripTypeScriptTypes(navigation.replaceAll('import.meta.client','false')).replace(/^export /gm, '') + '\nthis.leaves = flattenWorkspaceNavigation(buildWorkspaceNavigation("ADMIN"));', registry);
const permissions = [...new Set(registry.leaves.map(x => x.permission).filter(Boolean)), 'web_orders.manage', 'catalog.write', 'marketplace.configure', 'loyalty.write'];
const marketplaceOrder = { id:'qa-channel-order', orderNumber:'QA-OMS-001', externalId:'QA-OZON-001', channel:'OZON', status:'NEW', buyerName:'Тестовый покупатель', totalAmount:'1560', createdAt:'2026-09-16T10:00:00Z' };
const fixtures = new Map([
  ['/auth/access', { role:'ADMIN', permissions, denied:[] }],
  ['/marketplaces/orders', [marketplaceOrder]], ['/marketplaces/integrations', [{ channel:'OZON', shopName:'Тестовый кабинет', isActive:false }]],
  ['/helpdesk/tickets', []], ['/helpdesk/agents', []],
  ['/system-settings/dashboard', { staff:1, activeStaff:1, sessions:1, permissions:permissions.length, auditToday:0, integrations:0 }],
  ['/system-settings/staff', []], ['/system-settings/access', { roles:['ADMIN'], permissions:[] }], ['/audit', []],
  ['/system-settings/logs', { sync:[], integrations:[], recentAudit:[], jobs:[], queue:{ connected:false, counts:{} } }],
  ['/system-settings/integrations', []], ['/system-settings/bot-commands', []], ['/system-settings/bot-events', { items:[], identities:0, unlinked:0, statuses:{} }],
  ['/system-settings/accounts', { items:[], total:0, pages:1, totals:{ all:0, staff:0, b2c:0, b2b:0 } }], ['/system-settings/profile-change-requests', []],
  ['/data-lifecycle/trash', { items:[] }],
  ['/crm/dashboard', { forecast:0, wonMonth:{amount:0,count:0}, openLeads:0, customers:0, overdueTasks:0, dueToday:0, funnel:[], recentInteractions:[] }],
  ['/crm/pipelines', [{id:'qa-pipeline',name:'Основная воронка',isDefault:true,stages:[]}]], ['/crm/pipeline', {id:'qa-pipeline',name:'Основная воронка',stages:[]}],
  ['/crm/team', []], ['/crm/leads', []], ['/customer-360/dashboard', {customers:0,newCustomers:0,active:0,b2cCustomers:0,b2bCustomers:0,organizations:0}],
  ['/crm/tasks', [{id:'qa-task',title:'Проверить заказы',status:'TODO',priority:'MEDIUM',progress:0,createdAt:'2026-09-16T10:00:00Z',startDate:null,dueDate:null,assignedTo:null,comments:[],_count:{comments:0}}]],
  ['/customer-360/customers', []], ['/customer-360/organizations', []],
  ['/leadership/overview', { sales:{revenue:0,previousRevenue:0,orders:0,averageOrder:0,growth:0},customers:{total:0,new:0},operations:{lowStock:0,helpdeskOverdue:0,helpdeskOpen:0,activeTasks:0,openLeads:0},channels:[] }],
]);
async function main() {
  fs.mkdirSync(output, { recursive:true });
  const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true });
  const results = [];
  try {
    for (const width of (process.env.WORKSPACE_AUDIT_WIDTHS || '1440,390').split(',').map(Number)) for (const leaf of registry.leaves.filter(x => x.id !== 'crm-chat' && (!process.env.WORKSPACE_AUDIT_IDS || process.env.WORKSPACE_AUDIT_IDS.split(',').includes(x.id)))) {
      const f = await isolatedContext(browser,width,false,false,{fixtures});
      try {
        await f.page.goto('http://127.0.0.1:3001'+leaf.to,{waitUntil:'domcontentloaded'});
        await f.page.locator('.wn-toolbar').waitFor();
        await f.page.locator('.workspace-frame h1').first().waitFor();
        await f.page.waitForTimeout(450); await f.page.evaluate(() => document.fonts.ready);
        const typography=await auditTypography(f.page);
        const state = await f.page.evaluate(() => {
          const h1 = document.querySelector('.workspace-frame h1');
          const controls = [...document.querySelectorAll('.workspace-frame button')].filter(el => el.getClientRects().length && !el.disabled).map(el => {
            const s = getComputedStyle(el), box = el.getBoundingClientRect();
            return {label:(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0,80),color:s.color,background:s.backgroundColor,height:box.height,width:box.width};
          });
          const outside = [...document.querySelectorAll('.workspace-frame input,.workspace-frame select,.workspace-frame button')].filter(el => {
            if (!el.getClientRects().length) return false;
            let parent=el.parentElement;
            while(parent) { const s=getComputedStyle(parent); if(['auto','scroll','hidden'].includes(s.overflowX)) return false; parent=parent.parentElement; }
            const b=el.getBoundingClientRect();return b.right>innerWidth+2 || b.left < -2;
          }).map(el => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0,80));
          const fonts = [...new Set([...document.querySelectorAll('.workspace-frame :is(h1,h2,h3,p,span,strong,label,button,input,select)')].filter(el=>el.getClientRects().length).map(el=>getComputedStyle(el).fontFamily.replace(/["\s]/g,'')))];
          const filterBoxes = [...document.querySelectorAll('.filters>select')].map(el=>{const b=el.getBoundingClientRect();return {top:b.top,height:b.height};});
          return {title:h1?.textContent,headingSize:h1?getComputedStyle(h1).fontSize:null,pageWidth:document.documentElement.scrollWidth,outside,controls,fonts,filterBoxes};
        });
        assert.ok(state.title, 'Page heading is missing');
        assert.ok(parseFloat(state.headingSize)<=28,'Oversized page heading: '+state.headingSize);
        assert.ok(state.pageWidth<=width+2,'Page overflow');
        assert.deepEqual(state.outside,[],'Controls outside viewport');
        assert.deepEqual(state.fonts,['Montserrat,Arial,sans-serif'],'One workspace font family');
        assert.deepEqual(await f.page.locator('.studio-area-switch option').allTextContents(),['CRM','Маркетплейсы','Сайт','Поддержка','Управление'],'Business workspace order');
        assert.equal(await f.page.locator('.wn-toolbar-actions>:last-child').getAttribute('aria-label'),'Выйти','Sign out must be last');
        assert.equal(await f.page.locator('.wn-toolbar-actions>:nth-child(2)').getAttribute('aria-label'),'Чат платформы','Chat follows search');
        assert.equal(await f.page.locator('.wn-toolbar-actions>:nth-child(3)').getAttribute('aria-label'),'Открыть сайт','Site shortcut follows chat');
        assert.equal(await f.page.locator('.rail-bottom .platform-chat-button,.rail-bottom a[target="_blank"]').count(),0,'No duplicate chat or site shortcuts in the rail');
        if (leaf.id === 'customers' && state.filterBoxes.length === 2) {
          assert.ok(Math.abs(state.filterBoxes[0].top-state.filterBoxes[1].top)<2,'Customer filter selects share a row');
          assert.ok(state.filterBoxes.every(box=>box.height>=44 && box.height<=46),'Filter controls have a consistent, readable size');
        }
        if(leaf.id==='categories'){await f.page.locator('.cs-category-row').first().waitFor();assert.ok(f.traffic.mockedReads.includes('/admin/catalog/categories'));assert.equal(await f.page.locator('.cs-savebar').count(),0,'Initial category load must not create a dirty draft');}
        if(leaf.id==='product-badges'){await f.page.locator('.cs-badge-row').first().waitFor();assert.ok(f.traffic.mockedReads.includes('/admin/catalog/badges'));}
        if (['pipeline','tasks','bot-commands'].includes(leaf.id)) {
          const selector = {pipeline:'#pipeline-query',tasks:'#task-query','bot-commands':'#bot-command-query'}[leaf.id];
          const search = f.page.locator(selector);
          assert.ok(await search.isVisible(), 'Operational search must be visible');
          const box = await search.boundingBox();
          assert.ok(box && box.x >= 0 && box.x + box.width <= width + 2, 'Search must fit the viewport');
          if (leaf.id !== 'bot-commands') {
            const toolbar = await f.page.locator('.toolbar').boundingBox();
            assert.ok(toolbar && box.y >= toolbar.y && box.y + box.height <= toolbar.y + toolbar.height + 2, 'Search must not be clipped by its toolbar');
          }
        }
        for(const button of state.controls) if(button.background!=='rgba(0, 0, 0, 0)' && button.label) assert.notEqual(button.color,button.background,'Invisible button: '+button.label);
        if(leaf.to.startsWith('/crm-marketplaces/')) assert.equal(await f.page.locator('.marketplace-page .tabs').count(),0,'Channel sections must be separate pages');
        for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks']) assert.deepEqual(f.traffic[key],[],key);
        assert.deepEqual(f.errors,[],'Browser errors');
        await f.page.screenshot({path:path.join(output,`${width}-${leaf.id}.png`),fullPage:false});
        results.push({id:leaf.id,width,passed:true,title:state.title,typography});
      } catch(error) {
        await f.page.screenshot({path:path.join(output,`${width}-${leaf.id}-failure.png`),fullPage:false}).catch(()=>{});
        results.push({id:leaf.id,width,passed:false,message:error.message,errors:f.errors,warnings:f.consoleWarnings,traffic:f.traffic});
      }
      finally { await f.context.close(); }
      console.log(`${width} ${leaf.id}: ${results.at(-1).passed?'PASS':'FAIL '+results.at(-1).message}`);
    }
    for(const [url,endpoint] of [['/crm-marketplaces/integrations','/marketplaces/integrations'],['/system-settings/staff','/system-settings/staff'],['/helpdesk/tickets','/helpdesk/tickets']]) {
      const f=await isolatedContext(browser,390,false,false,{fixtures,failures:[endpoint]});
      try {
        await f.page.goto('http://127.0.0.1:3001'+url,{waitUntil:'domcontentloaded'});
        await f.page.getByRole('alert').first().waitFor();
        assert.ok(await f.page.getByRole('alert').first().isVisible());
        assert.deepEqual(f.errors.filter(message=>!/^console: Failed to load resource: the server responded with a status of 503\b/.test(message)),[]);
        assert.deepEqual(f.traffic.prohibitedWrites,[]);
        results.push({id:'load-error:'+url,width:390,passed:true});
      }catch(error){results.push({id:'load-error:'+url,width:390,passed:false,message:error.message});}
      finally{await f.context.close();}
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({mockedOnly:true,actualApiWrites:0,integrationTests:false,results},null,2));
  console.log(JSON.stringify({cases:results.length,failed:results.filter(x=>!x.passed)},null,2));
  if(results.some(x=>!x.passed))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
