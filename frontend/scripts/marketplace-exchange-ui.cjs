// Isolated UI contract: all API traffic and writes are synthetic fixtures.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3002').origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const permissions = ['crm.read','marketplace.read','marketplace.write','marketplace.configure','catalog.read','customers.read','customers.write','system.manage'];
const fixture = new Map([
  ['/auth/access', { role:'ADMIN', permissions }],
  ['/marketplaces/integrations', []],
]);
const baseStatus = { enabled:true, configured:true, automatic:false, running:false, hasMore:false, lastSuccessAt:null, lastError:null };
async function main() {
  const browser = await chromium.launch({ headless:true });
  for (const [width,theme] of [[1440,'light'],[390,'dark']]) {
    const f = await isolatedContext(browser, width, false, false, { fixtures:fixture, allowFixtureForms:true });
    await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:origin}]);
    const writes = [];
    await f.context.route('**/api/v1/marketplaces/**', async route => {
      const req=route.request(), url=new URL(req.url()), method=req.method(), path=url.pathname.slice('/api/v1'.length);
      let data;
      if(path==='/marketplaces/wildberries/fbs/status' && method==='GET') data=baseStatus;
      else if(path==='/marketplaces/ozon/status' && method==='GET') data={FBS:baseStatus,FBO:{...baseStatus,supported:false}};
      else if(path==='/marketplaces/wildberries/fbs/unresolved' && method==='GET') data={items:[{externalVariantId:'12345',article:'Гель 30 мл',orders:2}],truncated:false};
      else if(path==='/marketplaces/ozon/unresolved' && method==='GET') data={items:[{externalVariantId:'sku:123',article:'Инструмент',orders:1}],truncated:false};
      else if(path.endsWith('/mappings') && method==='GET') data=[];
      else if(path.endsWith('/variants') && method==='GET') data=[{id:'11111111-1111-4111-8111-111111111111',sku:'SKU-1',name:'30 мл',product:{nameRu:'Гель'}}];
      else if(path.endsWith('/mappings') && method==='POST') { writes.push({path,body:req.postDataJSON()}); data={...req.postDataJSON()}; }
      else if(path==='/marketplaces/wildberries/fbs/sync' && method==='POST') { writes.push({path}); data={processed:3,unmapped:1,hasMore:true}; }
      else return route.fallback();
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await f.page.goto(origin+'/crm/marketplaces/integrations');
    const panel=f.page.getByRole('region',{name:'Обмен заказами'});
    await panel.getByText('Ожидает первой загрузки').first().waitFor();
    assert.equal(await panel.getByText('Загрузка пока не подключена').count(),1);
    const fbo=panel.locator('article').filter({hasText:'Ozon · FBO'});
    assert.equal(await fbo.getByRole('button').count(),0);
    await panel.getByRole('button',{name:'Выбрать товар'}).first().click();
    await panel.getByLabel('Поиск по названию или SKU').fill('Гель');
    await panel.getByRole('button',{name:'Найти',exact:true}).click();
    await panel.getByLabel('Товар каталога').selectOption('11111111-1111-4111-8111-111111111111');
    await panel.getByRole('button',{name:'Сохранить соответствие'}).click();
    await panel.getByText('Соответствие сохранено.',{exact:false}).waitFor();
    assert.deepEqual(writes[0].body,{externalVariantId:'12345',variantId:'11111111-1111-4111-8111-111111111111'});
    await panel.getByRole('button',{name:'Выбрать товар'}).last().click();
    await panel.getByLabel('Поиск по названию или SKU').fill('SKU-1');
    await panel.getByRole('button',{name:'Найти',exact:true}).click();
    await panel.getByLabel('Товар каталога').selectOption('11111111-1111-4111-8111-111111111111');
    await panel.getByRole('button',{name:'Сохранить соответствие'}).click();
    await panel.getByText('Соответствие сохранено.',{exact:false}).waitFor();
    assert.deepEqual(writes[1].body,{externalVariantId:'sku:123',variantId:'11111111-1111-4111-8111-111111111111'});
    const wb=panel.locator('article').filter({hasText:'Wildberries · FBS'});
    await wb.getByRole('button',{name:'Загрузить заказы'}).click();
    await panel.getByText('Wildberries: обработано заказов — 3.',{exact:false}).waitFor();
    assert.equal(writes.length,3); assert.equal(f.traffic.prohibitedWrites.length,0);
    assert.equal(f.traffic.externalRequests.length,0); assert.equal(f.errors.length,0, f.errors.join('\n'));
    const overflow=await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow,false,`${width}x ${theme} has horizontal overflow`);
    await f.page.screenshot({path:`.screenshots/marketplace-exchange-${width}-${theme}.png`,fullPage:true});
    console.log(`${width}px ${theme}: status, disabled FBO, mapping, sync PASS`);
    await f.context.close();
  }
  await browser.close();
}
main().catch(error => { console.error(error); process.exitCode=1; });
