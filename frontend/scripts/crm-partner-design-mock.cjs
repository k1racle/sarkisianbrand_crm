/* CRM design flow acceptance. All APIs are intercepted with synthetic fixtures.
 * No real credentials, database writes, SMS, mail, shipping or 1C calls.
 * ADMIN_DESIGN_URL can select an already running loopback frontend. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-partner-design');
fs.mkdirSync(output, { recursive: true });
const company = { id: 'design-entity', entityType: 'LLC', legalName: 'ООО «Студия»', inn: '0000000000', kpp: '000000000', ogrn: '0000000000000', address: 'Тестовый город, улица Примерная, 1', signerName: 'Анна Иванова', signerBasis: 'Устав', isActive: true };
const person = { id: 'design-partner', displayName: 'Мария Александрова', code: 'MARIA', kind: 'BLOGGER', taxStatus: 'SELF_EMPLOYED', user: { email: 'maria@example.invalid' } };
const product = { id: 'design-variant', productName: 'Гель моделирующий камуфлирующий № 201', variantName: '30 мл', sku: 'QA-201', availabilityStatus: 'CURRENT', available: 12 };
const template = { id: 'design-template', templateKey: 'service', documentType: 'SERVICE_AGREEMENT', title: 'Договор оказания информационных услуг', version: 2, audience: 'ALL', taxStatus: 'ALL', entityType: 'ALL', isActive: true, bodyHtml: '<p>Заказчик: {{company_name}}. Исполнитель: {{partner_name}}.</p><p>Вознаграждение: {{reward_terms}}.</p>' };
const settings = { pepEnabled: false, providerKey: 'SMS_AERO', codeTtlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 60, consentRequired: true, eligibleDocumentTypes: ['SERVICE_AGREEMENT','SERVICE_ACT'] };
function shipment(id, number) { return { id, createdAt: '2026-10-20T12:00:00Z', participant: person, order: { id: 'order-'+id, orderNumber: number, status: 'ASSEMBLING', buyerName: 'Мария Александрова', isSynced1C: false, items: [{ id: 'line-'+id, productName: product.productName, variantName: product.variantName, quantity: 2 }] } }; }
const ticket = { id: 'design-ticket', number: 'HD-2026-001', subject: 'Обновить реквизиты компании в документах', description: 'В новых документах нужно использовать актуальный адрес.', source: 'B2B', priority: 'MEDIUM', status: 'OPEN', requesterName: 'Мария Александрова', requesterEmail: 'maria@example.invalid', queue: 'Первая линия', createdAt: '2026-10-25T10:00:00Z', resolutionDueAt: '2099-01-01T00:00:00Z', canWrite: true, comments: [] };
async function checkLayout(page, label) {
  const measures = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(measures.body <= measures.viewport + 1, label + ': page must not overflow horizontally');
}
async function presentationTop(page) {
  // Capture the page at its natural starting position, after interaction assertions.
  // Do not remove focus indicators/skip links with CSS or change product elements.
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({top:0,left:0,behavior:'instant'}); });
  await page.waitForFunction(() => window.scrollY === 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function main() {
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  let cases = 0;
  try {
    for (const width of [1440,390,320]) for (const dark of [false,true]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...new Set([...access.permissions, 'partners.read','partners.write','partners.payouts','leadership.read','helpdesk.read','helpdesk.write'])] });
      fixtures.set('/partners/admin/documents/participants',[person]);
      fixtures.set('/partners/admin/legal-entities',[company]);
      fixtures.set('/partners/admin/BLOGGER/participants',{...base.get('/partners/admin/BLOGGER/participants'),rows:[{...person,user:{...person.user},status:'ACTIVE',payoutVerified:true,rewardPercent:7,channels:[{label:'Канал партнёра',url:'https://example.invalid/channel'}],_count:{clicks:23,attributions:8,registrations:1}}],total:1});
      fixtures.set('/partners/admin/BLOGGER/rewards',{...base.get('/partners/admin/BLOGGER/rewards'),rows:[{id:'reward-design',participant:person,amount:500,unit:'RUB',status:'APPROVED',order:{orderNumber:'SB-2026-008'},readyAt:'2026-10-25T10:00:00Z'}],total:1});
      fixtures.set('/helpdesk/tickets',[ticket]);
      fixtures.set('/helpdesk/agents',[]);
      fixtures.set('/helpdesk/dashboard',{ total:1,new:0,inWork:1,waiting:0,overdue:0 });
      fixtures.set('/leadership/overview',{ access:{sales:true,customers:true,inventory:true,crm:true,helpdesk:true},sales:{revenue:284000,orders:84,averageOrder:3381,previousRevenue:240000,growth:18.3},customers:{total:328,new:42},operations:{lowStock:4,helpdeskOverdue:0,helpdeskOpen:8,activeTasks:17,openLeads:12},channels:[{channel:'WEB',orders:60,revenue:210000},{channel:'B2B',orders:24,revenue:74000}] });
      const f = await isolatedContext(browser,width,false,false,{ fixtures,allowFixtureForms:true }), p = f.page;
      const requests=[];
      let templates=[{...template}], shipments=[shipment('gift-first','GIFT-2026-001')];
      await p.route('**/api/v1/partners/admin/**', async route => {
        const req=route.request(), url=new URL(req.url()), endpoint=url.pathname.replace('/api/v1','');
        const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
        if (endpoint==='/partners/admin/documents/workspace') return send({ templates,settings,entities:[company],smsIntegration:{configured:false,isEnabled:false} });
        if (endpoint==='/partners/admin/gifts' && req.method()==='GET') return send({ participants:[person],products:[product],shipments });
        if (req.method()==='GET') return route.fallback();
        requests.push({endpoint,body:req.postDataJSON()});
        if (endpoint==='/partners/admin/documents/templates') { const b=req.postDataJSON(); assert.ok(b.bodyHtml.includes('{{partner_name}}')); assert.equal(b.bodyText,undefined);templates.push({...template,...b,id:'template-new',version:3});return send(templates.at(-1)); }
        if (endpoint==='/partners/admin/documents/generate') { assert.deepEqual(req.postDataJSON(),{participantId:person.id,entityId:company.id});return send([{id:'doc-ready',title:template.title,documentType:'SERVICE_AGREEMENT',templateVersion:3,fileName:'contract.doc'}]); }
        if (endpoint==='/partners/admin/documents/settings') { assert.equal(req.postDataJSON().pepEnabled,false);return send(req.postDataJSON()); }
        if (endpoint==='/partners/admin/gifts') { const b=req.postDataJSON();assert.equal(b.participantId,person.id);assert.deepEqual(b.items,[{variantId:product.id,quantity:2}]);assert.match(b.requestKey,/^[0-9a-f-]{36}$/);shipments.unshift(shipment('gift-second','GIFT-2026-002'));return send({orderNumber:'GIFT-2026-002'}); }
        throw Error('Unexpected partner mutation '+endpoint);
      });
      await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
      const shot=async name=>{await presentationTop(p);await checkLayout(p,name);await p.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-${name}.png`),fullPage:true});};
      try {
        await p.goto(origin+'/crm/partners/documents',{waitUntil:'networkidle'});
        assert.equal(await p.locator('html').getAttribute('data-crm-theme'),dark?'dark':'light','Requested theme is actually applied');
        await p.getByRole('button',{name:'Открыть шаблон'}).waitFor();
        assert.equal(await p.locator('.pds-excerpt').innerText().then(x=>x.includes('{{')),false,'Template summaries use human field labels');
        const tab=p.getByRole('tab',{name:'Шаблоны',exact:true});assert.equal(await tab.getAttribute('aria-selected'),'true');
        const activeTab=await tab.evaluate(el=>{const s=getComputedStyle(el);return{border:s.borderBottomColor,borderWidth:parseFloat(s.borderBottomWidth),color:s.color};});
        const inactiveTab=await p.getByRole('tab',{name:'Генератор',exact:true}).evaluate(el=>{const s=getComputedStyle(el);return{border:s.borderBottomColor,color:s.color};});
        assert.ok(activeTab.borderWidth>=2&&activeTab.border!==inactiveTab.border&&activeTab.color!==inactiveTab.color,'Active section has a visible distinct underline and text in either theme');
        await shot('documents');
        await p.getByRole('button',{name:'Открыть шаблон'}).click();
        await p.getByRole('heading',{name:'Новая версия шаблона'}).waitFor();
        assert.equal(await p.getByLabel('Название документа').evaluate(el=>el===document.activeElement),true);
        await p.getByRole('heading',{name:'Новая версия шаблона'}).waitFor();
        await p.getByText('Выбрать поле для вставки',{exact:true}).click();
        const editor=p.getByLabel('Текст документа',{exact:true});await editor.fill('Договор с ');await editor.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
        await p.locator('.pds-token').filter({hasText:'ФИО партнёра'}).click();assert.equal(await editor.inputValue(),'Договор с {{partner_name}}');
        await p.getByText('Пример заполненного документа',{exact:true}).click();await p.getByText('Договор с Анна Иванова',{exact:true}).waitFor();
        await shot('document-editor');
        await p.getByRole('button',{name:'Сохранить новую версию',exact:true}).click();await p.getByRole('status').filter({hasText:'Сохранена новая версия'}).waitFor();
        await p.getByRole('tab',{name:'Генератор',exact:true}).click();
        const generate=p.getByRole('button',{name:'Сформировать комплект'});assert.equal(await generate.isDisabled(),true);
        await p.locator('.pds-people>button').first().click();await p.getByLabel('Реквизиты компании',{exact:true}).selectOption(company.id);assert.equal(await generate.isEnabled(),true);
        await shot('document-generator');await generate.click();await p.getByRole('heading',{name:'Документы готовы'}).waitFor();
        await p.getByRole('tab',{name:'SMS-подпись',exact:true}).click();await p.getByText('Подписание пока недоступно',{exact:true}).waitFor();
        assert.equal(await p.locator('.pds-doc-checks input[role=switch]').count(),0,'Document selection uses checkboxes');assert.equal(await p.locator('.pds-doc-checks input').first().evaluate(el=>getComputedStyle(el,'::before').width),'20px','Checkboxes have a square selection box');await shot('document-signature');
        await p.getByRole('tab',{name:'Реквизиты',exact:true}).click();assert.equal(await p.locator('h1').count(),1,'Embedded entity settings do not add a second page heading');await p.getByRole('button',{name:'Изменить',exact:true}).click();await p.getByLabel('Полное юридическое наименование').waitFor();await shot('document-entity');
        await p.goto(origin+'/crm/bloggers/gifts',{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Подарки партнёрам'}).waitFor();assert.equal(await p.locator('.gift-create').count(),0,'History is the initial view');
        await presentationTop(p);
        const freshGift=await p.evaluate(()=>{const bar=document.querySelector('.crm-topbar').getBoundingClientRect(),h1=document.querySelector('h1').getBoundingClientRect(),skip=document.querySelector('.crm-skip-link'),link=skip.getBoundingClientRect(),tabs=document.querySelector('.crm-section-links'),current=tabs.querySelector('[aria-current=page]'),tb=tabs.getBoundingClientRect(),active=current.getBoundingClientRect();return{scrollY,headerTop:bar.top,headerBottom:bar.bottom,headingTop:h1.top,skipFocused:skip.matches(':focus'),skipBottom:link.bottom,tabBar:{left:tb.left,right:tb.right},activeTab:{left:active.left,right:active.right}};});
        assert.equal(freshGift.scrollY,0);assert.ok(Math.abs(freshGift.headerTop)<=1,'Fresh header starts at the top');assert.ok(freshGift.headingTop>=freshGift.headerBottom,'Fresh gift heading is below the header');assert.equal(freshGift.skipFocused,false);assert.ok(freshGift.skipBottom<=0,'Unfocused skip link stays offscreen');
        assert.ok(freshGift.activeTab.left>=freshGift.tabBar.left-1&&freshGift.activeTab.right<=freshGift.tabBar.right+1,'Current section stays visible after fonts load');
        fs.writeFileSync(path.join(output,`${width}-${dark?'dark':'light'}-gifts-fresh-layout.json`),JSON.stringify(freshGift,null,2));await p.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-gifts-fresh-viewport.png`)});
        await p.getByLabel('Поиск подарочных отправок').fill('не существует');await p.getByRole('heading',{name:'Отправки не найдены'}).waitFor();await p.getByRole('button',{name:'Сбросить поиск'}).click();await shot('gifts');
        await p.getByRole('button',{name:'Новая отправка',exact:true}).click();
        await p.getByLabel('Партнёр',{exact:true}).selectOption(person.id);await p.getByLabel('Имя получателя').fill('Мария Александрова');await p.getByLabel('Телефон',{exact:true}).fill('+70000000000');await p.getByLabel('Адрес доставки').fill('Тестовый город, улица Примерная, 1');await p.getByLabel('Товар и вариант').selectOption(product.id);
        const prepareGift=p.getByRole('button',{name:'Подготовить отправку',exact:true});
        await p.getByLabel('Количество',{exact:true}).fill('13');assert.equal(await prepareGift.isDisabled(),true,'A gift cannot exceed the stock confirmed by 1C');await p.getByText(/подтверждено 1С 12 шт\./i).waitFor();
        await p.getByLabel('Количество',{exact:true}).fill('2');assert.equal(await prepareGift.isEnabled(),true,'The confirmed quantity makes preparation available');await shot('gift-create');
        await prepareGift.click();await p.getByText('GIFT-2026-002',{exact:true}).waitFor();assert.equal(await p.locator('.gift-create').count(),0);
        await p.goto(origin+'/crm/bloggers/participants',{waitUntil:'networkidle'});await p.locator('.partner-table tbody tr').waitFor();await shot('partner-participants');await p.getByRole('button',{name:'Изменить',exact:true}).click();await p.getByRole('dialog').getByRole('heading',{name:'Решение по участнику'}).waitFor();await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
        await p.goto(origin+'/crm/bloggers/rewards',{waitUntil:'networkidle'});await p.locator('.partner-table tbody tr').waitFor();assert.equal(await p.locator('.partner-table th').filter({hasText:'Действия'}).count(),0,'Read-only reward rows do not waste an empty actions column');await shot('partner-rewards');
        await p.goto(origin+'/crm/bloggers/settings',{waitUntil:'networkidle'});await p.getByRole('switch',{name:'Программа открыта для участия'}).waitFor();assert.equal(await p.getByRole('switch').count(),3,'Program boolean preferences are switches');assert.equal(await p.getByRole('switch').first().evaluate(el=>getComputedStyle(el,'::before').width),'44px');
        await p.goto(origin+'/crm/support/tickets',{waitUntil:'networkidle'});await p.getByRole('status').filter({hasText:'Заявок: 1'}).waitFor();
        await p.getByLabel('Поиск заявок').fill('не существует');await p.getByText(/По заданным условиям заявок нет/).waitFor();await p.getByRole('button',{name:'Сбросить',exact:true}).click();
        const row=p.locator('.ticket-row[role=button]').first();await row.focus();await p.keyboard.press('Enter');const detail=p.getByRole('dialog');await detail.getByRole('heading',{name:ticket.subject}).waitFor();await p.keyboard.press('Escape');await detail.waitFor({state:'hidden'});assert.equal(await row.evaluate(el=>el===document.activeElement),true,'Keyboard returns to the opened ticket');await shot('support');
        await p.getByRole('button',{name:'Новая заявка',exact:true}).click();await p.getByLabel('Тема',{exact:true}).waitFor();assert.equal(await p.getByLabel('Тема',{exact:true}).evaluate(el=>el===document.activeElement),true,'New ticket focuses its first field');await p.keyboard.press('Shift+Tab');assert.ok(await p.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),'Tab stays inside the dialog');await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
        await p.goto(origin+'/crm/reports/sales',{waitUntil:'networkidle'});await p.locator('.sales-row:not(.head)').first().waitFor();assert.equal(await p.locator('.report-context>span').innerText(),'Последние 30 дней');await shot('reports');
        assert.deepEqual(requests.map(x=>x.endpoint),['/partners/admin/documents/templates','/partners/admin/documents/generate','/partners/admin/gifts']);
        for(const name of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[name],[],name);
        assert.deepEqual(f.errors,[]);console.log(`PASS CRM partner/service design ${width}px ${dark?'dark':'light'}: templates/edit/autofill/preview/generate/requisites/signing, gifts/search/create, support/filter/keyboard, report/mobilefields`);cases++;
      } catch (error) { await p.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-failure.png`),fullPage:true}); console.error(await p.locator('.pds-generator label').allTextContents()); throw error; } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`PASS ${cases}/6 design flow variants; all writes were intercepted fixtures.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
