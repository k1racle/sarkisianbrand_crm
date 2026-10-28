/* Explicit finite state inventory for management forms/tabs/drawers. All API traffic mocked. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{isolatedContext}=require('./admin-design-mock.cjs');
const {managementFixtures}=require('./crm-comfort-management-fixtures.cjs');
const {capture,output}=require('./crm-comfort-management-mock.cjs');
const origin=new URL(process.env.ADMIN_DESIGN_URL||'http://127.0.0.1:3001').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const click=(p,name)=>p.getByRole('button',{name,exact:true}).first().click();
const tab=(p,name)=>p.getByRole('tab',{name,exact:true}).click();
const docs='/crm/partners/documents',cards='/crm/gift-cards',settings='/crm/settings/';
const legal=async p=>tab(p,'Реквизиты');
const cardList=async p=>click(p,'Выданные карты');
const cases=[];
const add=(route,id,open,ready)=>cases.push({route,id,open,ready});
add('/crm/orders','order-detail',p=>p.locator('.studio-order-open:visible,.studio-mobile-order:visible').first().click(),'.crm-order-webdrawer');
add('/crm/marketplaces/orders','marketplace-new-order',p=>p.locator('.order-row.clickable').first().click(),'[role=dialog]');
add('/crm/marketplaces/orders','marketplace-picking-order',p=>p.locator('.order-row.clickable').nth(1).click(),'[role=dialog]');
for(const mode of ['Начислить','Списать'])add('/crm/loyalty/members','loyalty-'+(mode==='Начислить'?'accrual':'writeoff'),async p=>{await p.locator('.loyalty-row:not(.head)').first().click();await click(p,mode);},'[role=dialog]');
add('/crm/promotions','promotion-new',p=>click(p,'Новый промокод'),'.sb-promo-form');
add('/crm/promotions','promotion-edit',p=>p.getByRole('button',{name:'Редактировать DESIGN10',exact:true}).click(),'.sb-promo-form');
add('/crm/promotions','promotion-deactivate',p=>p.getByRole('button',{name:'Выключить DESIGN10',exact:true}).click(),'[role=dialog]');
add('/crm/promotions','promotion-delete',p=>p.getByRole('button',{name:'Удалить DESIGN10',exact:true}).click(),'[role=dialog]');
add(cards,'gift-card-terms',p=>click(p,'Номиналы и срок'),'.sb-gift-denominations');
add(cards,'gift-card-list',cardList,'.sb-gift-table');
add(cards,'gift-card-issue',async p=>{await cardList(p);await click(p,'Выдать карту');},'.sb-gift-form');
add(cards,'gift-card-edit',async p=>{await cardList(p);await p.getByRole('button',{name:/^Редактировать карту /}).first().click();},'.sb-gift-form');
add(cards,'gift-card-history',async p=>{await cardList(p);await p.getByRole('button',{name:/^История карты /}).first().click();},'[role=dialog]');
add(cards,'gift-card-reveal-confirm',async p=>{await cardList(p);await p.getByRole('button',{name:/^Открыть код карты /}).first().click();},'[role=dialog]');
add(cards,'gift-card-deactivate-confirm',async p=>{await cardList(p);await p.getByRole('button',{name:/^Выключить карту /}).first().click();},'[role=dialog]');
add('/crm/messages','message-detail',p=>p.locator('.contact-inbox__row').first().click(),'[role=dialog]');
add('/crm/support/tickets','support-create',p=>click(p,'Новая заявка'),'[role=dialog]');
add('/crm/support/tickets','support-detail',p=>p.locator('.ticket-row[role=button]').first().click(),'[role=dialog]');
add('/crm/support/overview','support-overview-ticket',p=>p.locator('.ticket-compact').first().click(),'[role=dialog]');
add('/crm/support/knowledge','knowledge-new',p=>click(p,'Новая статья'),'.crm-knowledge-editor');
add('/crm/support/knowledge','knowledge-reader',p=>p.locator('.crm-knowledge-card').first().click(),'.crm-knowledge-reader');
add('/crm/support/knowledge','knowledge-editor',async p=>{await p.locator('.crm-knowledge-card').first().click();await click(p,'Редактировать');},'.crm-knowledge-editor');
add(settings+'staff','staff-create',p=>click(p,'Добавить'),'[role=dialog]');
add(settings+'staff','staff-access-review',p=>p.getByRole('button',{name:'Проверить права сотрудника',exact:true}).first().click(),'[role=dialog]');
add(settings+'departments','department-new',p=>click(p,'Новый отдел'),'[role=dialog]');
add(settings+'departments','department-edit',p=>click(p,'Изменить'),'[role=dialog]');
add(settings+'accounts','account-detail',p=>p.locator('button.account-row').first().click(),'[role=dialog]');
for(const name of ['Сотрудники','Клиенты B2C','Партнёры B2B'])add(settings+'accounts','accounts-'+name,async p=>{await p.locator('.account-summary button').filter({hasText:name}).click();});
add(settings+'access','access-profiles',p=>tab(p,'Профили доступа'),'[aria-label="Профили доступа"]');
add(settings+'access','access-profile-new',async p=>{await tab(p,'Профили доступа');await click(p,'Новый профиль');},'[role=dialog]');
add(settings+'access','access-profile-edit',async p=>{await tab(p,'Профили доступа');await click(p,'Изменить');},'[role=dialog]');
for(const provider of ['1С:Управление торговлей','Служба доставки CDEK','Бот для салонов и бизнес-клиентов','SMS Aero','Ozon — кабинет профессиональных материалов','ЮKassa','Онлайн-касса'])add(settings+'integrations','integration-'+provider,p=>p.locator('button.integration-card').filter({hasText:provider}).click(),'[role=dialog]');
for(const category of ['Маркетплейсы','Доставка','1С и учёт','Оплата','Онлайн-касса','Сообщения','Боты'])add(settings+'integrations','integration-category-'+category,p=>p.locator('.category-tabs button').filter({hasText:category}).click());
for(const audience of ['Сотрудники','B2C','B2B'])add(settings+'integrations','integration-audience-'+audience,async p=>{await p.locator('.category-tabs button').filter({hasText:'Боты'}).click();await p.locator('.audience-filter').getByRole('button',{name:audience,exact:true}).click();assert.equal(await p.locator('.audience-filter button.active').innerText(),audience);assert.equal(await p.locator('button.integration-card').count(),audience==='B2B'?1:0);});
add(settings+'bot-commands','bot-new',p=>click(p,'Новая команда'),'[role=dialog]');
add(settings+'bot-commands','bot-edit',p=>p.locator('.command-row:not(.head)').first().getByRole('button',{name:'Редактировать',exact:true}).click(),'[role=dialog]');
add(settings+'bot-commands','bot-filter',async p=>{await p.getByLabel('Аудитория команды',{exact:true}).selectOption('B2B');await p.getByLabel('Канал команды',{exact:true}).selectOption('MAX');});
add(settings+'trash','trash-detail',p=>p.locator('.trash-row:not(.head)').first().click(),'.trash-drawer');
for(const name of ['Генератор','SMS-подпись','Реквизиты'])add(docs,'documents-'+name,p=>tab(p,name));
add(docs,'document-editor-new',p=>click(p,'Добавить шаблон'),'.pds-editor');
add(docs,'document-editor-version',p=>p.getByRole('button',{name:/Открыть шаблон/}).first().click(),'.pds-editor');
add(docs,'document-editor-fields',async p=>{await click(p,'Добавить шаблон');await p.getByText('Выбрать поле для вставки',{exact:true}).click();},'.pds-token-list');
add(docs,'document-editor-preview',async p=>{await p.getByRole('button',{name:/Открыть шаблон/}).first().click();await p.getByText('Пример заполненного документа',{exact:true}).click();},'.pds-preview[open]');
add(docs,'document-generator-ready-selection',async p=>{await tab(p,'Генератор');await p.locator('.pds-people > button').first().click();await p.getByLabel('Реквизиты компании',{exact:true}).selectOption('qa-management-entity');});
for(const entityType of ['IP','LLC'])add(docs,'legal-new-'+entityType,async p=>{await legal(p);await click(p,'Добавить реквизиты');await p.getByLabel('Тип стороны',{exact:true}).selectOption(entityType);},'.partner-legal-editor');
add(docs,'legal-edit',async p=>{await legal(p);await click(p,'Изменить');},'.partner-legal-editor');
for(const kind of ['bloggers','referrals'])add('/crm/'+kind+'/participants',kind+'-participant-decision',p=>click(p,'Изменить'),'[role=dialog]');
add('/crm/bloggers/participants','partner-recipient-verification',p=>click(p,'Получатель'),'[role=dialog]');
for(const mode of ['Клиент уже на сайте','Новый блогер'])add('/crm/bloggers/participants','partner-invite-'+mode,async p=>{await click(p,'Добавить блогера');await click(p,mode);},'[role=dialog]');
add('/crm/bloggers/registrations','partner-registration-verification',p=>click(p,'Проверить'),'[role=dialog]');
add('/crm/bloggers/payouts','partner-payout-approval',p=>p.getByRole('button',{name:'Решение',exact:true}).first().click(),'[role=dialog]');
add('/crm/bloggers/payouts','partner-payout-paid-confirmation',p=>p.getByRole('button',{name:'Решение',exact:true}).nth(1).click(),'[role=dialog]');
add('/crm/referrals/settings','referral-fixed-fields',p=>p.getByLabel('Способ начисления',{exact:true}).selectOption('FIXED'));
add('/crm/bloggers/gifts','gift-create',p=>click(p,'Новая отправка'),'.gift-create');
add('/crm/bloggers/gifts','gift-create-filled',async p=>{await click(p,'Новая отправка');await p.getByLabel('Партнёр',{exact:true}).selectOption('qa-comfort-partner-0');await p.getByLabel('Имя получателя').fill('Мария Александрова-Константинопольская');await p.getByLabel('Товар и вариант').selectOption('qa-management-variant');},'.gift-create');
add('/crm/promotions','promotion-fixed-discount',async p=>{await click(p,'Новый промокод');await p.getByLabel('Тип скидки',{exact:true}).selectOption('FIXED');},'.sb-promo-form');
add(cards,'gift-card-revealed',async p=>{await cardList(p);await p.getByRole('button',{name:/^Открыть код карты /}).first().click();await click(p,'Показать полный код');},'.sb-gift-secret');
add(docs,'document-generator-result',async p=>{await tab(p,'Генератор');await p.locator('.pds-people > button').first().click();await p.getByLabel('Реквизиты компании',{exact:true}).selectOption('qa-management-entity');await click(p,'Сформировать комплект');},'.pds-generated');
add(settings+'access','access-profile-department-scope',async p=>{await tab(p,'Профили доступа');await click(p,'Новый профиль');await p.getByLabel('Разрешить: Просмотр задач и сделок',{exact:true}).check();await p.getByLabel('Область: Просмотр задач и сделок',{exact:true}).selectOption('SELECTED_DEPARTMENTS');},'[role=dialog]');
add(settings+'access','access-profile-preview-form',async p=>{await tab(p,'Профили доступа');await click(p,'Проверить и назначить');},'[role=dialog]');
add('/crm/bloggers/payouts','partner-payout-rejected',async p=>{await p.getByRole('button',{name:'Решение',exact:true}).first().click();await p.getByLabel('Решение по статусу',{exact:true}).selectOption('REJECTED');},'[role=dialog]');
add('/crm/bloggers/participants','partner-invited-not-active',async p=>{await click(p,'Изменить');},'[role=dialog]');
cases.at(-1).modify=map=>{const key='/partners/admin/BLOGGER/participants',data=map.get(key);map.set(key,{...data,rows:data.rows.map((r,i)=>i?r:{...r,status:'INVITED'})});};
add('/crm/bloggers/gifts','gift-create-no-products',p=>click(p,'Новая отправка'),'.gift-create');
cases.at(-1).modify=map=>{const data=map.get('/partners/admin/gifts');map.set('/partners/admin/gifts',{...data,products:[]});};
add(settings+'access','access-profile-archived',async p=>{await tab(p,'Профили доступа');await p.getByLabel('Архив профилей',{exact:true}).check();});
cases.at(-1).modify=map=>{const key='/system-settings/access-profiles',data=map.get(key);map.set(key,{...data,items:data.items.map(r=>({...r,archivedAt:'2026-10-27T08:30:00Z'}))});};
add('/crm/promotions','promotion-inactive',async()=>{});
cases.at(-1).modify=map=>{const data=map.get('/promotions');map.set('/promotions',{...data,items:data.items.map(r=>({...r,isActive:false}))});};
for(const state of ['inactive','expired']){add(cards,'gift-card-'+state,cardList,'.sb-gift-table');cases.at(-1).modify=map=>{const data=map.get('/gift-cards');map.set('/gift-cards',{...data,items:data.items.map(r=>({...r,isActive:state!=='inactive',expiresAt:state==='expired'?'2020-01-01T00:00:00Z':r.expiresAt}))});};}
async function main(){
 const report=[],failures=[],browser=await chromium.launch(require('./crm-test-browser.cjs'));
 const requested=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
 const selected=requested?cases.filter(c=>requested.split(',').includes(c.id)):cases;
 assert.ok(selected.length,'At least one known state is required');
 const requestedWidths=process.argv.find(a=>a.startsWith('--widths='))?.slice(9).split(',').map(Number);
 const variants=(process.argv.includes('--quick')?[[1366,768,'light'],[390,844,'dark']]:[[1366,768,'light'],[1366,768,'dark'],[1440,900,'light'],[1440,900,'dark'],[390,844,'light'],[390,844,'dark']]).filter(v=>!requestedWidths||requestedWidths.includes(v[0]));
 try{for(const [width,height,theme]of variants){
  // Fresh pages reset drafts; one guarded context reuses asset connections to
  // avoid exhausting Windows ephemeral ports in the exhaustive state matrix.
  const shared=await isolatedContext(browser,width,false,false,{fixtures:managementFixtures(),allowFixtureForms:true});
  await shared.context.addCookies([{name:'sarkisian-crm-theme',value:theme,url:origin}]);
  let first=true;
  try{for(const item of selected){
  const stateFixtures=managementFixtures();item.modify?.(stateFixtures);const p=first?shared.page:await shared.context.newPage();first=false;
  const f={...shared,page:p};f.errors.length=0;for(const value of Object.values(f.traffic))if(Array.isArray(value))value.length=0;
  if(p!==shared.page){p.on('pageerror',error=>f.errors.push('pageerror: '+error.message));p.on('console',message=>{if(message.type()==='error')f.errors.push('console: '+message.text());});}
  p.setDefaultTimeout(6000);await p.setViewportSize({width,height});
  if(item.modify)await p.route('**/api/v1/**',route=>{const request=route.request(),endpoint=new URL(request.url()).pathname.replace('/api/v1','');return request.method()==='GET'&&!endpoint.startsWith('/auth/')&&stateFixtures.has(endpoint)?route.fulfill({contentType:'application/json',body:JSON.stringify(stateFixtures.get(endpoint))}):route.fallback();});
  const failedResponses=[];p.on('response',response=>{if(response.status()>=400)failedResponses.push({status:response.status(),url:response.url()});});
  await p.route('**/api/v1/admin/contact-messages/contact-1/read',route=>{assert.equal(route.request().method(),'PATCH');return route.fulfill({contentType:'application/json',body:JSON.stringify({...stateFixtures.get('/admin/contact-messages').items[0],readAt:'2026-10-27T09:00:00Z'})});});
  await p.route('**/api/v1/gift-cards/*/reveal',route=>{assert.equal(route.request().method(),'POST');return route.fulfill({contentType:'application/json',body:JSON.stringify({code:'QA-COMFORT-NOT-VALID'})});});
  await p.route('**/api/v1/partners/admin/documents/generate',route=>{assert.equal(route.request().method(),'POST');return route.fulfill({contentType:'application/json',body:JSON.stringify([{id:'qa-document',title:'Договор оказания информационных услуг',documentType:'SERVICE_AGREEMENT',templateVersion:1,fileName:'qa-contract.doc'}])});});
  try{
   await p.goto(origin+item.route,{waitUntil:'networkidle'});await item.open(p);if(item.ready)await p.locator(item.ready).first().waitFor();await p.waitForTimeout(80);
   await capture(p,item.route,item.id.replaceAll('/','-'),width,height,theme,report,{preservePosition:true});
   assert.deepEqual(report.at(-1).typography,[],'Approved text roles apply inside every state');
   const rendered=report.at(-1).rendered;assert.deepEqual(rendered.unifiedControls,[],'Canonical controls apply inside every state');assert.deepEqual(rendered.contrast.filter(c=>!c.hasImage),[],'Text stays readable on every teleported surface');
   const headingSelector=item.id.startsWith('promotion-')&&['promotion-new','promotion-edit','promotion-fixed-discount'].includes(item.id)?'.sb-promo-form h3':['gift-card-issue','gift-card-edit'].includes(item.id)?'.sb-gift-form h3':['document-editor-new','document-editor-version'].includes(item.id)?'.pds-editor-intro h2':null;
   if(headingSelector){const position=await p.locator(headingSelector).evaluate(el=>({top:el.getBoundingClientRect().top,headerBottom:document.querySelector('.crm-topbar').getBoundingClientRect().bottom}));assert.ok(position.top>=position.headerBottom,`Opened editor heading stays below the sticky header: ${JSON.stringify(position)}`);}
   for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
   assert.deepEqual(f.errors,[]);console.log('PASS state',width,theme,item.id);
  }catch(error){await p.screenshot({path:path.join(output,`${width}-${theme}-FAIL-${item.id.replace(/[<>:"/\\|?*]/g,'-')}.png`)});failures.push({route:item.route,id:item.id,width,theme,message:error.message,traffic:structuredClone(f.traffic),errors:[...f.errors],failedResponses});console.error('FAIL state',width,theme,item.id,error.message.split('\n')[0]);}
  finally{await p.close();}
  fs.writeFileSync(path.join(output,'state-coverage.json'),JSON.stringify({origin,cases:cases.map(({open,ready,...item})=>item),states:report,failures},null,2));
 }}finally{await shared.context.close();}
 }}finally{await browser.close();}
 assert.deepEqual(failures,[]);console.log(`PASS ${report.length} explicit editor/tab/dialog states`);
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={cases};
