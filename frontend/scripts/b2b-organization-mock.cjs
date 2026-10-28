// Fixture-only multi-company workflow. All API reads/writes are intercepted, no real credentials or DB.
const { chromium } = require('playwright-core'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const ids = ['56c46548-3428-4438-9f6f-12c16c0194dc', '6453a4f4-52b8-4014-9d3e-5a32fc687290'];
const organizations = ids.map((id, index) => ({ id, name: `Компания ${index ? 'Б' : 'А'}`, status: 'ACTIVE', role: 'OWNER', canOrder: true, canSeeFinance: true, canUseSalon: true }));
const profiles = organizations.map(item => ({ ...item, legalName: item.name, legalAddress: 'Москва', inn: '7700123456', members: [], membership: { role: 'OWNER', canOrder: true, canSeeFinance: true }, capabilities: { salon: true, purchasing: true }, presentation: null }));
const actor = { id: 'qa-business-owner', email: 'org-owner@example.invalid', firstName: 'Владелец', role: 'CUSTOMER_B2B' };
const output = path.resolve(__dirname, '../.screenshots/b2b-organization'); fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) for (const dark of [false, true]) {
      const f = await isolatedContext(browser, width, false, false, { b2b: true, actor, fixtures: new Map() });
      const reads = [], writes = [];
      try {
        f.page.removeAllListeners('dialog');
        await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',domain:'127.0.0.1',path:'/'}]);
        await f.context.route('**/api/v1/b2b/**', async route => {
          const request = route.request(), endpoint = new URL(request.url()).pathname.replace('/api/v1', '');
          if (request.method() !== 'GET') { writes.push(endpoint); return route.fulfill({ status: 400, json: { message: 'No writes in this workflow' } }); }
          if (endpoint === '/b2b/organizations') return route.fulfill({ json: organizations });
          const id = request.headers()['x-b2b-organization-id'], index = ids.indexOf(id); assert.ok(index >= 0, 'Every scoped read has a selected organization');
          reads.push({ endpoint, id });
          if (endpoint === '/b2b/profile') return route.fulfill({ json: profiles[index] });
          if (endpoint === '/b2b/catalog') return route.fulfill({ json: [{ id: `product-${index}`, sku: `SKU-${index}`, nameRu: `Товар ${index ? 'Б' : 'А'}`, images: [], categories: [], variants: [{ id: `variant-${index}`, sku: `SKU-${index}`, name: '15 мл', b2bPrice: 100, retailPrice: 100, available: 10 }] }] });
          if (endpoint === '/b2b/dashboard') return route.fulfill({ json: {} });
          return route.fulfill({ json: [] });
        });
        await f.page.goto('http://127.0.0.1:3001/b2b?section=settings&area=purchases');
        const picker = f.page.getByLabel('Организация', { exact: true }); await picker.waitFor();
        await f.page.getByRole('alert').filter({ hasText: 'Выберите организацию' }).waitFor(); assert.equal(reads.length, 0, 'No arbitrary organization is selected');
        await picker.selectOption(ids[0]);
        const name = f.page.getByLabel('Название компании', { exact: true }); await name.waitFor(); assert.equal(await name.inputValue(), organizations[0].name);
        await name.fill('Несохранённая компания А');
        f.page.once('dialog', dialog => dialog.dismiss()); await picker.selectOption(ids[1]);
        assert.equal(await picker.inputValue(), ids[0]); assert.equal(await name.inputValue(), 'Несохранённая компания А');
        f.page.once('dialog', dialog => dialog.accept()); await picker.selectOption(ids[1]);
        await f.page.waitForFunction(() => document.querySelector('input[maxlength="120"]')?.value === 'Компания Б');
        assert.equal(await picker.inputValue(), ids[1]); assert.equal(await name.inputValue(), organizations[1].name);
        assert.ok(reads.some(row => row.id === ids[0])); assert.ok(reads.some(row => row.id === ids[1]));
        await f.page.reload(); await name.waitFor(); assert.equal(await picker.inputValue(), ids[1]); assert.equal(await name.inputValue(), organizations[1].name);
        await f.page.goto('http://127.0.0.1:3001/b2b?section=catalog&organization='+ids[1]);
        const quantityB = f.page.getByLabel('Количество SKU-1', { exact: true }); await quantityB.waitFor();
        await f.page.getByLabel('Добавить SKU-1', { exact: true }).click(); assert.equal(await quantityB.inputValue(), '1');
        f.page.once('dialog', dialog => dialog.accept()); await picker.selectOption(ids[0]);
        const quantityA = f.page.getByLabel('Количество SKU-0', { exact: true }); await quantityA.waitFor(); assert.equal(await quantityA.inputValue(), '0', 'The previous company cart is cleared');
        assert.equal(await f.page.getByText('Товар Б', { exact: true }).count(), 0); assert.deepEqual(writes, []);
        const bounds = await picker.boundingBox(); assert.ok(bounds.width >= 100 && bounds.height >= 44); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await f.page.locator('html').getAttribute('data-business-theme'), dark?'dark':'light');
        const panel = await f.page.locator('.salon-services-panel').first().evaluate(el=>getComputedStyle(el).backgroundColor);
        const values=panel.match(/[\d.]+/g)?.slice(0,3).map(Number)||[];assert.equal(values.length,3);assert.ok(dark?Math.max(...values)<100:Math.min(...values)>180,'Requested palette must change the actual surface');
        if(width<800){
          const contrast=await f.page.locator('.ui-mobile-dock > :is(a,button) > span').evaluateAll(elements=>elements.map(el=>{
            const rgba=value=>{const parts=value.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [...parts.slice(0,3),parts[3]??1];},blend=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3])),lum=values=>values.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
            const layers=[];for(let node=el;node;node=node.parentElement)layers.push(rgba(getComputedStyle(node).backgroundColor));
            const background=layers.reverse().reduce((back,front)=>blend(front,back),[255,255,255]);
            const a=lum(blend(rgba(getComputedStyle(el).color),background)),b=lum(background);return {text:el.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
          }));
          for(const item of contrast)assert.ok(item.ratio>=4.5,`Mobile navigation contrast ${item.text}: ${item.ratio}`);
          await f.page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
          const positions=await f.page.evaluate(()=>({footer:document.querySelector('.business-cart footer')?.getBoundingClientRect().bottom,dock:document.querySelector('.ui-mobile-dock')?.getBoundingClientRect().top}));
          if(positions.footer!==undefined)assert.ok(positions.footer<=positions.dock-8,'The bottom action can scroll clear of the mobile dock');
        }
        assert.deepEqual(f.errors, []); await f.page.screenshot({ path: path.join(output, `${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
        console.log(`PASS B2B organization UI ${width} ${dark ? 'dark' : 'light'}: explicit selection, scoped reads, draft cancellation/confirmation, remembered company and cleared cart.`);
      } catch(error) { await f.page.screenshot({path:path.join(output,'failure.png'),fullPage:true}); console.error((await f.page.locator('body').innerText()).slice(-1800)); throw error; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
