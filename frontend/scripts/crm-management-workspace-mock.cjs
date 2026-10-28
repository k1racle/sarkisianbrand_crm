/* Management acceptance against a loopback frontend. Synthetic reads only.
 * All writes are intercepted local fixtures; nothing reaches CRM, SMS, mail or 1C.
 * Covers response races, dirty forms, failed writes, gift retry identity and layout. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const { assertTypography } = require('./crm-workspace-smoke.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname), 'Loopback frontend required');
const output = path.resolve(__dirname, '../.screenshots/crm-management-workspace');
fs.mkdirSync(output, { recursive: true });
const person = { id:'qa-management-partner',displayName:'Мария Александрова',code:'MARIA',kind:'BLOGGER',status:'ACTIVE',payoutVerified:true,rewardPercent:7,user:{email:'maria@example.invalid'},channels:[],_count:{clicks:2,attributions:1,registrations:0} };
const product = { id:'qa-management-variant',productName:'Гель моделирующий',variantName:'30 мл',sku:'QA-GEL-30',available:12 };
const entity = { id:'qa-management-entity',entityType:'LLC',legalName:'ООО «Пример»',inn:'0000000000',kpp:'000000000',ogrn:'0000000000000',address:'Тестовый город, Примерная улица, 1',signerName:'Анна Иванова',signerBasis:'Устав',isActive:true };
const document = { id:'qa-management-template',templateKey:'service',version:1,documentType:'SERVICE_AGREEMENT',title:'Договор информационных услуг',bodyHtml:'<p>Заказчик: {{company_name}}. Исполнитель: {{partner_name}}.</p>',audience:'ALL',taxStatus:'ALL',entityType:'ALL',isActive:true };
const smsSettings = { pepEnabled:false,providerKey:'SMS_AERO',codeTtlSeconds:300,maxAttempts:5,resendCooldownSeconds:60,consentRequired:true,eligibleDocumentTypes:['SERVICE_AGREEMENT'] };
const ticket = n => ({ id:'qa-management-ticket-'+n,number:'HD-'+n,subject:'Проверить реквизиты '+n,description:'Тестовое обращение без реальных клиентов.',source:'EMPLOYEE',priority:'MEDIUM',status:'OPEN',requesterName:'Анна Иванова',queue:'Первая линия',createdAt:'2026-10-27T07:00:00Z',resolutionDueAt:'2099-01-01T00:00:00Z',canWrite:true,comments:[] });
function fixtures() {
  const map = new Map(base), access=map.get('/auth/access');
  map.set('/auth/access',{...access,permissions:[...new Set([...access.permissions,'system.manage','partners.read','partners.write','partners.payouts','crm.read','crm.write','helpdesk.read','helpdesk.write','leadership.read','marketplace.read','marketplace.write','marketplace.configure','knowledge.read','knowledge.write','loyalty.read','loyalty.write','promotions.read','promotions.write','gift_cards.read','gift_cards.write','gift_card_product.read','gift_card_product.write'])]});
  map.set('/partners/admin/documents/workspace',{templates:[document],settings:smsSettings,entities:[entity],smsIntegration:{configured:false,isEnabled:false}});
  map.set('/partners/admin/documents/participants',[person]);
  map.set('/partners/admin/legal-entities',[entity]);
  map.set('/partners/admin/gifts',{participants:[person],products:[product],shipments:[]});
  map.set('/helpdesk/tickets',Array.from({length:26},(_,i)=>ticket(i+1)));
  map.set('/helpdesk/agents',[]);
  map.set('/helpdesk/knowledge',{items:[{id:'qa-article',title:'Как оформить обращение',category:'Рабочие процессы',excerpt:'Порядок работы с заявками',status:'PUBLISHED',version:1,updatedAt:'2026-10-27T07:00:00Z'}],categories:[{name:'Рабочие процессы',count:1}],total:1,page:1,pages:1,canWrite:true});
  map.set('/admin/contact-messages',{items:[],total:0,unread:0,page:1,pages:1});
  map.set('/admin/contact-messages/settings',{recipientEmail:'manager@example.invalid',deliveryEnabled:true});
  return map;
}
const reply = (route,body,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function context(browser,width=390,theme='dark',options={}) {
  const f=await isolatedContext(browser,width,false,false,{fixtures:fixtures(),allowFixtureForms:true,...options});
  await f.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:origin}]);
  return f;
}
function assertTraffic(f,expectedConsoleErrors=0) {
  for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
  const expected=f.errors.filter(message=>/Failed to load resource|net::ERR_FAILED/.test(message));
  assert.ok(expected.length<=expectedConsoleErrors,JSON.stringify(f.errors));
  assert.deepEqual(f.errors.filter(message=>!expected.includes(message)),[]);
}
async function giftRetry(browser) {
  const f=await context(browser),page=f.page,requests=[];
  await page.route('**/api/v1/partners/admin/gifts',async route=>{
    if(route.request().method()==='GET')return reply(route,fixtures().get('/partners/admin/gifts'));
    assert.equal(route.request().method(),'POST');
    requests.push(route.request().postDataJSON());
    if(requests.length===1)return route.abort('failed');
    return reply(route,{message:'Состав изменился. Обновите данные перед повтором.'},409);
  });
  try {
    await page.goto(origin+'/crm/bloggers/gifts',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Новая отправка',exact:true}).first().click();
    await page.getByLabel('Партнёр',{exact:true}).selectOption(person.id);
    await page.getByLabel('Имя получателя').fill('Мария Александрова');
    await page.getByLabel('Телефон',{exact:true}).fill('+70000000000');
    await page.getByLabel('Адрес доставки').fill('Тестовый город, Примерная улица, 1');
    await page.getByLabel('Товар и вариант').selectOption(product.id);
    const submit=page.getByRole('button',{name:'Создать отправку',exact:true});
    await submit.click();await page.locator('.gift-error').waitFor();await submit.waitFor({state:'visible'});
    await submit.click();await page.getByText('Состав изменился. Обновите данные перед повтором.',{exact:true}).waitFor();
    assert.equal(requests.length,2);assert.equal(requests[0].requestKey,requests[1].requestKey,'Lost response retry keeps identity');
    await page.getByLabel('Количество',{exact:true}).fill('3');await submit.click();
    await page.waitForFunction(()=>document.querySelector('.gift-error')?.textContent.includes('Состав изменился'));
    await page.waitForFunction(()=>!document.querySelector('.gift-form button[type=submit]')?.disabled);
    assert.equal(requests.length,3);assert.notEqual(requests[1].requestKey,requests[2].requestKey,'Changed gift uses a new identity');
    assert.equal(await page.locator('.gift-create').count(),1,'409 does not pretend success');
    assert.equal(await page.locator('.gift-notice').count(),0);
    assertTraffic(f,3);return {case:'gift-retry',attempts:3,samePayloadKeyStable:true,changedPayloadNewKey:true,conflictShown:true};
  } finally {await f.context.close();}
}
async function emailRace(browser) {
  const f=await context(browser),page=f.page;let fail=false;
  await page.route('**/api/v1/admin/contact-messages**',async route=>{
    assert.equal(route.request().method(),'GET');const url=new URL(route.request().url());
    if(url.pathname.endsWith('/settings'))return reply(route,fail?{message:'Тестовая ошибка загрузки уведомлений'}:{recipientEmail:'manager@example.invalid',deliveryEnabled:true},fail?503:200);
    const unread=url.searchParams.get('unread')==='true';
    await new Promise(resolve=>setTimeout(resolve,unread?500:10));
    try{return await reply(route,{items:[{id:unread?'new':'all',name:unread?'Только новые':'Все обращения',message:'Синтетическое сообщение',createdAt:'2026-10-27T07:00:00Z',readAt:'2026-10-27T07:01:00Z'}],total:1,unread:0,page:1,pages:1});}catch{ /* The stale request was deliberately aborted. */ }
  });
  try {
    await page.goto(origin+'/crm/messages',{waitUntil:'networkidle'});
    const recipient=page.getByLabel('Почта получателя');await recipient.fill('edited@example.invalid');
    await page.getByRole('button',{name:'Обновить',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('main.contact-inbox')?.getAttribute('aria-busy')==='false');
    assert.equal(await recipient.inputValue(),'edited@example.invalid','Refresh preserves unsaved email');
    const unread=page.getByLabel('Только новые');
    const pending=page.waitForRequest(request=>request.url().includes('/admin/contact-messages?')&&request.url().includes('unread=true'));
    await unread.check();await pending;await unread.uncheck();
    await page.getByText('Все обращения',{exact:true}).waitFor();await page.waitForTimeout(600);
    assert.equal(await page.getByText('Только новые',{exact:true}).count(),1,'Only the filter label remains, no stale row');
    assert.equal(await recipient.inputValue(),'edited@example.invalid');
    fail=true;await page.getByRole('button',{name:'Обновить',exact:true}).click();
    await page.getByRole('alert').getByText('Тестовая ошибка загрузки уведомлений',{exact:true}).waitFor();
    assert.equal(await recipient.inputValue(),'edited@example.invalid','Failed refresh preserves draft too');
    assertTraffic(f,2);return {case:'contact-race',dirtyEmailPreserved:true,latestFilterWins:true,errorVisible:true};
  } finally {await f.context.close();}
}
async function partnerSearch(browser) {
  const f=await context(browser),page=f.page;
  await page.route('**/api/v1/partners/admin/BLOGGER/participants**',async route=>{
    assert.equal(route.request().method(),'GET');const query=new URL(route.request().url()).searchParams.get('search')||'';
    await new Promise(resolve=>setTimeout(resolve,query==='older'?800:10));
    try{return await reply(route,{...base.get('/partners/admin/BLOGGER/participants'),rows:[{...person,displayName:query==='older'?'Старый ответ':query==='newest'?'Новый ответ':person.displayName}],total:1,page:1,pages:1});}catch{ /* Superseded read. */ }
  });
  try {
    await page.goto(origin+'/crm/bloggers/participants',{waitUntil:'networkidle'});
    const input=page.locator('.partner-search input');
    const first=page.waitForRequest(req=>req.url().includes('search=older'));
    await input.fill('older');await first;await input.fill('newest');
    await page.getByText('Новый ответ',{exact:true}).waitFor();await page.waitForTimeout(900);
    assert.equal(await page.getByText('Старый ответ',{exact:true}).count(),0);assertTraffic(f);
    return {case:'partner-search',latestResponseWins:true};
  } finally {await f.context.close();}
}
async function documentDraft(browser) {
  const f=await context(browser,320,'light'),page=f.page;
  try {
    await page.goto(origin+'/crm/partners/documents',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/Открыть шаблон/}).click();
    await page.getByLabel(/^Название документа/).fill('Несохранённая версия');
    await page.getByRole('tab',{name:'Генератор',exact:true}).click();
    assert.equal(await page.getByRole('tab',{name:'Шаблоны',exact:true}).getAttribute('aria-selected'),'true');
    assert.equal(await page.getByLabel(/^Название документа/).inputValue(),'Несохранённая версия');
    await page.getByRole('button',{name:'К шаблонам',exact:true}).click();
    assert.equal(await page.locator('.pds-editor').count(),1,'Canceling discard keeps the editor');
    assertTraffic(f);return {case:'document-draft',tabAndBackRespectUnsavedChanges:true};
  } finally {await f.context.close();}
}
async function employeeError(browser) {
  const f=await context(browser,320,'light'),page=f.page;let writes=0;
  await page.route('**/api/v1/system-settings/staff',route=>{
    if(route.request().method()==='GET')return route.fallback();
    assert.equal(route.request().method(),'POST');writes++;return reply(route,{message:'Учётная запись с такой почтой уже существует'},409);
  });
  try {
    await page.goto(origin+'/crm/settings/staff',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Добавить',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Добавить сотрудника'});
    await dialog.getByLabel('Имя',{exact:true}).fill('Тестовый');await dialog.getByLabel('Email',{exact:true}).fill('duplicate@example.invalid');await dialog.getByLabel('Временный пароль').fill('Synthetic-Password-123');
    await dialog.getByRole('button',{name:'Создать сотрудника',exact:true}).press('Enter');
    await dialog.getByRole('alert').getByText('Учётная запись с такой почтой уже существует',{exact:true}).waitFor();
    assert.equal(await dialog.getByLabel('Email',{exact:true}).inputValue(),'duplicate@example.invalid');
    assert.equal(await dialog.getByRole('button',{name:'Создать сотрудника',exact:true}).isEnabled(),true);
    assert.equal(writes,1);assertTraffic(f,1);return {case:'employee-error',errorInsideDialog:true,draftRetained:true};
  } finally {await f.context.close();}
}
async function supportPaging(browser) {
  const f=await context(browser),page=f.page;
  try {
    await page.goto(origin+'/crm/support/tickets',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.ticket-row[role=button]').count(),25);
    await page.getByRole('navigation',{name:'Страницы заявок'}).getByRole('button',{name:'Далее',exact:true}).click();
    assert.equal(await page.locator('.ticket-row[role=button]').count(),1);
    await page.getByLabel('Поиск заявок').fill('реквизиты 1');
    assert.equal(await page.getByRole('navigation',{name:'Страницы заявок'}).count(),0,'Filtering resets the page');
    const row=page.locator('.ticket-row[role=button]').first();await row.focus();await page.keyboard.press('Enter');
    const dialog=page.getByRole('dialog');await dialog.waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    assert.equal(await row.evaluate(el=>el===document.activeElement),true);assertTraffic(f);return {case:'support-paging',pageSize:25,filterResetsPage:true,keyboardReturnsFocus:true};
  } finally {await f.context.close();}
}
async function surfaces(browser) {
  const routes=['/crm/settings/overview','/crm/settings/staff','/crm/settings/accounts','/crm/settings/integrations','/crm/settings/bot-commands','/crm/reports/sales','/crm/bloggers/settings','/crm/partners/documents','/crm/support/tickets','/crm/support/knowledge','/crm/marketplaces/orders','/crm/messages','/crm/loyalty/settings','/crm/gift-cards'];
  if(process.argv.includes('--deep-typography'))routes.push('/crm/buyers','/crm/marketplaces/overview','/crm/marketplaces/integrations','/crm/loyalty/members','/crm/support/overview','/crm/reports/overview','/crm/settings/access','/crm/settings/audit','/crm/settings/logs','/crm/settings/trash','/crm/bloggers/gifts');
  const result=[], typography=[];
  for(const width of process.argv.includes('--deep-typography')?[390]:[1440,390,320])for(const theme of ['light','dark']) {
    const f=await context(browser,width,theme),page=f.page;
    try {
      for(const route of routes) {
        await page.goto(origin+route,{waitUntil:'networkidle'});await page.locator('h1:visible').first().waitFor();await page.evaluate(()=>document.fonts.ready);
        if(process.argv.includes('--candidate-styles'))await page.addStyleTag({content:fs.readFileSync(path.resolve(__dirname,'../assets/css/crm-management-workspace.css'),'utf8')});
        if(await page.locator('h1:visible').count()!==1){await page.screenshot({path:path.join(output,`${width}-${theme}-failure.png`),fullPage:true});console.error(route,await page.locator('body').innerText());}
        const bounds=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,theme:document.documentElement.dataset.crmTheme}));
        try { await assertTypography(page); } catch(error) { typography.push({route,width,theme,findings:error.actual}); }
        assert.equal(bounds.theme,theme);assert.ok(bounds.scroll<=bounds.viewport+1,route+': horizontal overflow '+JSON.stringify(bounds));assert.equal(await page.locator('h1:visible').count(),1,route+': one heading');
        result.push({route,width,theme,...bounds});
        if(['/crm/settings/staff','/crm/partners/documents','/crm/bloggers/settings','/crm/support/knowledge','/crm/messages'].includes(route))await page.screenshot({path:path.join(output,`${width}-${theme}-${route.split('/').slice(2).join('-')}.png`),fullPage:true});
      }
      assertTraffic(f);
    }finally{await f.context.close();}
    console.log(`PASS management surfaces ${width}px ${theme}`);
  }
  fs.writeFileSync(path.join(output,'typography-report.json'),JSON.stringify(typography,null,2));
  assert.deepEqual(typography,[], 'Management screens use the unchanged approved typography assertion');
  return result;
}
async function inventory() {
  const source=fs.readFileSync(path.resolve(__dirname,'../shared/crm-workspace.ts'),'utf8');
  const {CRM_DESTINATIONS}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
  return CRM_DESTINATIONS.filter(item=>['system','reports','partner','partner-documents-settings','partner-gifts','support','channels','messages','store'].includes(item.screen)).map(({path,label,screen,section})=>({path,label,screen,section}));
}
async function main() {
  const report={inventory:await inventory(),candidateStyles:process.argv.includes('--candidate-styles'),functional:[],surfaces:[]},browser=await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    const requested=process.argv.find(value=>value.startsWith('--case='))?.slice(7);
    if(!process.argv.includes('--surfaces-only'))for(const check of [giftRetry,emailRace,partnerSearch,documentDraft,employeeError,supportPaging]){if(requested && check.name!==requested)continue;const result=await check(browser);report.functional.push(result);console.log('PASS '+result.case);}
    if(report.functional.length)fs.writeFileSync(path.join(output,'functional-report.json'),JSON.stringify(report.functional,null,2));
    if(!process.argv.includes('--functional-only'))report.surfaces=await surfaces(browser);
  } finally {await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
  console.log(`PASS management acceptance: ${report.functional.length} functional scenarios, ${report.surfaces.length} surface cases; fixture writes only.`);
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={fixtures,inventory,person,product,entity,document,smsSettings,ticket};
