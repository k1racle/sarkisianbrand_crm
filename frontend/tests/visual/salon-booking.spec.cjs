/* Every API request is fulfilled locally. No real logins, records or providers. */
const {test,expect}=require('@playwright/test');
const {auditTypography}=require('../../scripts/workspace-typography-audit.cjs');
const company='10000000-0000-4000-8000-000000000001',master='20000000-0000-4000-8000-000000000001',client='30000000-0000-4000-8000-000000000001',serviceId='40000000-0000-4000-8000-000000000001';
const actor={id:'qa-user',email:'qa@example.invalid',firstName:'Анна',role:'CUSTOMER_B2B'};
const service={id:serviceId,name:'Маникюр с покрытием',duration:60,price:1800,color:'#77709e',isActive:true};
const customer={id:client,firstName:'Елена',lastName:'Тестовая',phone:'79001234567'};
const member={id:master,role:'OWNER',user:{firstName:'Анна',lastName:'Мастер',email:'qa@example.invalid'}};
const profile={id:company,name:'Тестовый салон',status:'ACTIVE',membership:{role:'OWNER',canOrder:true,canSeeFinance:true},members:[member]};
const settings={organizationId:company,enabled:false,timeZone:'Europe/Moscow',startMinute:540,endMinute:1200,slotStep:15,horizonDays:30,workingDays:[1,2,3,4,5,6],masterIds:[master],canEdit:true};
const fixtureLogo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=','base64');
for(const width of [1440,390])test(`Salon logo upload updates cabinet and widget, removal restores brand ${width}`,async({browser})=>{
 const f=await isolated(browser,width);try{
  await f.page.goto('/b2b?section=settings&area=salon');const panel=f.page.getByRole('form',{name:'Оформление салона'});await expect(panel.getByLabel('Название салона для клиентов')).toBeVisible();await panel.getByLabel('Загрузить логотип салона',{exact:true}).setInputFiles({name:'logo.png',mimeType:'image/png',buffer:fixtureLogo});await expect(panel.getByRole('status')).toContainText('Логотип обновлён');await expect(f.page.locator('.b2b-rail .brand img')).toHaveClass('salon-tenant-logo');await expect(f.page.locator('.b2b-rail .brand img')).toHaveAttribute('src',new RegExp('qa-revision'));expect(await f.page.locator('.b2b-rail .brand img').evaluate(el=>getComputedStyle(el).filter)).toBe('none');await f.page.goto(`/booking/${company}?embed=1`);await expect(f.page.locator('.public-salon-logo')).toBeVisible();await expect(f.page.locator('.public-salon-logo')).toHaveAttribute('src',new RegExp('qa-revision'));await f.page.goto('/b2b?section=settings&area=salon');await panel.getByRole('button',{name:'Удалить логотип салона',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Логотип удалён');await expect(f.page.locator('.b2b-rail .brand img')).toHaveAttribute('src','/sarkisian-logo.png');expect(f.writes.map(item=>item.method)).toEqual(['POST','DELETE']);expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
test('Early opening and late closing expand the calendar and appear on the public page',async({browser})=>{
 const f=await isolated(browser,1440);try{
  await f.page.goto('/b2b?section=settings&area=salon');
  await f.page.getByLabel('Включить публичную запись',{exact:true}).check();
  await f.page.getByText('Суббота',{exact:true}).click();
  for(const [label,value] of [['Начало: Суббота','06:00'],['Окончание: Суббота','23:30']]){await f.page.getByLabel(label,{exact:true}).fill(value);await f.page.getByLabel(label,{exact:true}).blur();}
  await f.page.getByLabel('Добавить перерыв: Суббота',{exact:true}).click();
  await f.page.getByRole('button',{name:'Сохранить настройки',exact:true}).click();
  await expect(f.page.locator('.salon-online-settings form').getByRole('status')).toContainText('Настройки сохранены');
  await f.page.goto('/b2b?section=calendar');await f.page.getByLabel('Дата календаря',{exact:true}).fill('2026-09-19');
  await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 06:00',{exact:true})).toBeEnabled();
  await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 23:15',{exact:true})).toBeEnabled();
  await f.page.goto(`/booking/${company}?embed=1`);await f.page.getByText('Часы работы и перерывы',{exact:true}).click();
  await expect(f.page.locator('.public-salon-hours')).toContainText('06:00–23:30');
  await expect(f.page.locator('.public-salon-hours')).toContainText('Перерыв 13:00–13:30');
  expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
const initial={id:'qa-visit',clientId:client,serviceId,masterMemberId:master,startTime:'2026-09-19T06:00:00.000Z',endTime:'2026-09-19T07:00:00.000Z',status:'NEW',client:customer,service,masterMember:member};
for(const width of [1440,390,320])test(`Purchasing dashboard, catalog quantities, order filters and settings ${width}`,async({browser},info)=>{
 const f=await isolated(browser,width,{purchasing:true});try{
  await f.page.goto('/b2b?section=purchases');await expect(f.page.locator('.business-purchases-overview')).toBeVisible();await expect(f.page.locator('.business-dashboard-order')).toHaveCount(2);await expect(f.page.locator('.salon-organization')).toBeVisible();await info.attach('business-purchases',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=catalog');await expect(f.page.locator('.business-product')).toHaveCount(2);await f.page.getByLabel('Наличие оптовых товаров').selectOption('available');await expect(f.page.locator('.business-product')).toHaveCount(1);await f.page.getByLabel('Наличие оптовых товаров').selectOption('all');await f.page.getByLabel('Категория оптовых товаров').selectOption('gels');await expect(f.page.locator('.business-product')).toHaveCount(1);await f.page.getByLabel('Количество QA-GEL-15',{exact:true}).fill('7');await f.page.getByLabel('Количество QA-GEL-15',{exact:true}).blur();await expect(f.page.getByLabel('Количество QA-GEL-15',{exact:true})).toHaveValue('5');await expect(f.page.getByLabel('Добавить QA-GEL-15',{exact:true})).toBeDisabled();await expect(f.page.locator('.business-cart')).toContainText('4');await f.page.getByLabel('Уменьшить количество QA-GEL-15',{exact:true}).click();await expect(f.page.getByLabel('Количество QA-GEL-15',{exact:true})).toHaveValue('4');await info.attach('business-catalog',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=orders');await expect(f.page.locator('.business-order-row')).toHaveCount(2);await f.page.getByLabel('Статус закупочного заказа').selectOption('DELIVERED');await expect(f.page.locator('.business-order-row')).toHaveCount(1);await f.page.getByLabel('Статус закупочного заказа').selectOption('');await f.page.getByLabel('Состав заказа SB-QA-001',{exact:true}).click();await expect(f.page.locator('.business-order-details')).toContainText('Гель QA');await info.attach('business-orders',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=settings&area=purchases');const form=f.page.locator('.business-company-settings');await form.getByLabel('Название компании',{exact:true}).fill('Компания QA');await form.getByRole('button',{name:'Сохранить компанию',exact:true}).click();await expect(form.getByRole('status')).toContainText('Данные компании сохранены');expect(f.writes.at(-1)).toMatchObject({path:'/b2b/company-settings',method:'PATCH',body:{name:'Компания QA'}});await expect(f.page.locator('.salon-presentation-settings')).toHaveCount(0);if(width<800)await f.page.getByLabel('Открыть меню кабинета',{exact:true}).click();await expect(f.page.locator('#b2b-navigation-links>a:last-child')).toHaveAccessibleName('Настройки компании');if(width<800)await f.page.getByLabel('Закрыть меню кабинета',{exact:true}).click();
  for(const section of ['catalog','orders','purchases','settings&area=purchases']){await f.page.goto(`/b2b?section=${section}`);await expect(f.page.locator('.portal .body')).toBeVisible();expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),section).toBe(true);await auditTypography(f.page,'.b2b-frame,.b2b-rail,.ui-mobile-dock');}expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
for(const width of [1440,390])test(`Salon settings last in navigation and daily hours/breaks visible in calendar ${width}`,async({browser},info)=>{
 const f=await isolated(browser,width);try{
  await f.page.goto('/b2b?section=settings&area=salon');await expect(f.page.locator('.business-settings')).toBeVisible();if(width<800)await f.page.getByLabel('Открыть меню кабинета',{exact:true}).click();await expect(f.page.locator('#b2b-navigation-links>a:last-child')).toHaveAccessibleName('Настройки салона');if(width<800)await f.page.getByLabel('Закрыть меню кабинета',{exact:true}).click();await f.page.getByText('Суббота',{exact:true}).click();await f.page.getByLabel('Начало: Суббота',{exact:true}).fill('10:00');await f.page.getByLabel('Начало: Суббота',{exact:true}).blur();await f.page.getByLabel('Окончание: Суббота',{exact:true}).fill('17:00');await f.page.getByLabel('Окончание: Суббота',{exact:true}).blur();await f.page.getByLabel('Добавить перерыв: Суббота',{exact:true}).click();await f.page.getByLabel('Перерыв с: Суббота 1',{exact:true}).fill('13:00');await f.page.getByLabel('Перерыв с: Суббота 1',{exact:true}).blur();await f.page.getByLabel('Перерыв до: Суббота 1',{exact:true}).fill('14:00');await f.page.getByLabel('Перерыв до: Суббота 1',{exact:true}).blur();await f.page.getByRole('button',{name:'Сохранить настройки',exact:true}).click();await expect(f.page.locator('.salon-online-settings form').getByRole('status')).toContainText('Настройки сохранены');expect(f.writes.at(-1).body.weeklySchedule).toContainEqual({day:6,startMinute:600,endMinute:1020,breaks:[{startMinute:780,endMinute:840}]});
  await f.page.goto('/b2b?section=calendar');await f.page.getByLabel('Дата календаря',{exact:true}).fill('2026-09-19');await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 09:00',{exact:true})).toBeDisabled();await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 10:00',{exact:true})).toBeEnabled();await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 13:00',{exact:true})).toBeDisabled();await expect(f.page.getByLabel('Создать запись: Анна Мастер, 2026-09-19, 13:00',{exact:true})).toHaveAttribute('title','Перерыв');await expect(f.page.locator('.salon-calendar-slot.is-break')).not.toHaveCount(0);await info.attach('salon-break-calendar',{body:await f.page.screenshot(),contentType:'image/png'});expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
for(const width of [1440,390,320])test(`Salon management lists, organization and support ${width}`,async({browser},info)=>{
 const f=await isolated(browser,width,{management:true});try{
  await f.page.goto('/b2b');await expect(f.page.locator('.salon-overview>:first-child')).toHaveClass('salon-organization');await expect(f.page.locator('.salon-organization')).toContainText('150');
  await f.page.goto('/b2b?section=services');await expect(f.page.locator('.salon-service-row')).toHaveCount(2);await f.page.getByLabel('Доступность услуг',{exact:true}).selectOption('inactive');await expect(f.page.locator('.salon-service-row')).toHaveCount(1);await expect(f.page.locator('.salon-service-row')).toContainText('Дизайн');await f.page.getByLabel('Доступность услуг',{exact:true}).selectOption('all');await f.page.getByLabel('Поиск услуг',{exact:true}).fill('покрытием');await expect(f.page.locator('.salon-service-row')).toHaveCount(1);await f.page.getByLabel('Очистить поиск услуг',{exact:true}).click();
  await f.page.getByLabel('Редактировать Маникюр с покрытием',{exact:true}).click();const dialog=f.page.getByRole('dialog');await expect(dialog.getByLabel('Услуга доступна для записи')).toBeChecked();await dialog.getByLabel('Услуга доступна для записи').uncheck();await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);expect(f.writes.at(-1)).toMatchObject({method:'PATCH',path:`/b2b/services/${serviceId}`,body:{isActive:false}});await expect(f.page.locator('.salon-service-row')).toHaveCount(2);
  await info.attach('salon-services',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=clients');await expect(f.page.locator('.salon-client-row')).toHaveCount(2);await f.page.getByLabel('Поиск клиентов',{exact:true}).fill('999111');await expect(f.page.locator('.salon-client-row')).toHaveCount(1);await expect(f.page.locator('.salon-client-row')).toContainText('Мария');await f.page.getByLabel('Очистить поиск клиентов',{exact:true}).click();await f.page.getByLabel('Тег клиента',{exact:true}).selectOption('VIP');await expect(f.page.locator('.salon-client-row')).toHaveCount(1);await expect(f.page.locator('.salon-client-tags')).toContainText('VIP');await expect(f.page.locator('a[href="mailto:client@example.invalid"]')).toBeVisible();await f.page.getByLabel('Тег клиента',{exact:true}).selectOption('');
  await info.attach('salon-clients',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=team');await expect(f.page.locator('.salon-organization')).toHaveCount(0);await expect(f.page.locator('.salon-team-row')).toHaveCount(2);await f.page.getByLabel('Роль сотрудника',{exact:true}).selectOption('BUYER');await expect(f.page.locator('.salon-team-row')).toHaveCount(1);await expect(f.page.locator('.salon-team-access')).toContainText('Закупки');await expect(f.page.locator('.salon-team-access')).not.toContainText('Финансы');await f.page.getByLabel('Роль сотрудника',{exact:true}).selectOption('');
  await info.attach('salon-team',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto('/b2b?section=support');await expect(f.page.getByRole('heading',{name:'Поддержка',exact:true})).toBeVisible();await expect(f.page.locator('.support-intro')).toHaveCount(0);await expect(f.page.getByRole('button',{name:'Обращение',exact:true})).toHaveCount(1);
  for(const section of ['services','clients','team','dashboard']){await f.page.goto(`/b2b?section=${section}`);await expect(f.page.locator('.portal .body')).toBeVisible();expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),section).toBe(true);await auditTypography(f.page,'.b2b-frame,.b2b-rail,.ui-mobile-dock');}
  expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
 }finally{await f.context.close();}
});
test('Salon financial details stay hidden without finance permission',async({browser})=>{
 const f=await isolated(browser,1440,{management:true,finance:false});try{await f.page.goto('/b2b');await expect(f.page.locator('.salon-organization')).toBeVisible();await expect(f.page.locator('.salon-organization-finance')).toHaveCount(0);await f.page.goto('/b2b?section=clients');await expect(f.page.locator('.salon-client-row')).toHaveCount(2);await expect(f.page.locator('.salon-client-spent')).toHaveCount(0);expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);}finally{await f.context.close();}
});
for(const width of [1440,390])test(`Salon presentation saves and appears in public booking ${width}`,async({browser},info)=>{
 const f=await isolated(browser,width);try{
  await f.page.goto('/b2b?section=settings&area=salon');const panel=f.page.getByRole('form',{name:'Оформление салона'});await expect(panel.getByLabel('Название салона для клиентов')).toBeVisible();await panel.getByLabel('Название салона для клиентов').fill('Студия QA');await panel.getByLabel('Адрес салона',{exact:true}).fill('Москва, улица Салонная, 1');await panel.getByRole('button',{name:'Добавить телефон',exact:true}).click();await panel.getByLabel('Телефон салона 1').fill('+7 999 123-45-67');await panel.getByRole('button',{name:'Добавить email',exact:true}).click();await panel.getByLabel('Email салона 1').fill('salon@example.ru');await panel.getByRole('button',{name:'Добавить соцсеть',exact:true}).click();await panel.getByLabel('Название соцсети 1').fill('VK');await panel.getByLabel('Ссылка соцсети 1').fill('https://vk.com/salon');await panel.getByRole('button',{name:'Сохранить оформление'}).click();await expect(panel.getByRole('status')).toContainText('Оформление сохранено');expect(f.writes.at(-1)).toMatchObject({method:'PATCH',path:'/b2b/salon-presentation',body:{displayName:'Студия QA',emails:['salon@example.ru']}});
  await panel.scrollIntoViewIfNeeded();await info.attach('salon-presentation',{body:await f.page.screenshot(),contentType:'image/png'});
  await f.page.goto(`/booking/${company}?embed=1`);await expect(f.page.getByRole('heading',{name:'Студия QA'})).toBeVisible();await expect(f.page.locator('.public-salon-contacts')).toContainText('Москва, улица Салонная');await expect(f.page.getByRole('link',{name:'VK',exact:true})).toHaveAttribute('href','https://vk.com/salon');await expect(f.page.locator('.public-salon-contacts')).toContainText('09:00–20:00');expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
async function isolated(browser,width,{publicClosed=false,conflict=false,businessRole='OWNER',management=false,finance=true,purchasing=false}={}){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<800,hasTouch:width<800,serviceWorkers:'block'});
 const writes=[],reads=[],errors=[],unexpected=[];let visits=[initial],online={...settings},presentation={displayName:'',address:'',phones:[],emails:[],socialLinks:[],logoUrl:null};
 const serviceList=management?[service,{...service,id:'qa-disabled',name:'Дизайн',description:'До четырёх ногтей',price:600,duration:30,isActive:false}]:[service];
 const clientList=management?[{...customer,tags:['VIP'],email:'client@example.invalid',totalVisits:6,totalSpent:10800},{...customer,id:'qa-second-client',firstName:'Мария',lastName:'Гостевая',phone:'+7 (999) 111-22-33',tags:['Новый'],totalVisits:1,totalSpent:1800}]:[customer];
 await context.addInitScript(actor=>{localStorage.clear();localStorage.setItem('sarkisian-b2b-token','fixture-not-a-jwt');localStorage.setItem('sarkisian-b2b-user',JSON.stringify(actor));},actor);
 const fixtures=new Map([['/auth/me',actor],['/b2b/profile',{...profile,inn:'7700123456',legalAddress:'Москва, Тестовая улица, 1',discountTier:15,creditLimit:150000,members:management?[{...member,canOrder:true,canSeeFinance:true},{id:'qa-buyer',role:'BUYER',canOrder:true,canSeeFinance:false,user:{firstName:'Иван',lastName:'Закупщик',email:'buyer@example.invalid'}}]:profile.members,membership:{...profile.membership,role:businessRole,canSeeFinance:finance},capabilities:{salon:['OWNER','EMPLOYEE'].includes(businessRole)}}],['/b2b/clients',clientList],['/b2b/services',serviceList],['/b2b/dashboard',{clients:1,bookingsToday:1,upcoming:1,recentOrders:[],nextBookings:[],purchaseOrdersMonth:0}],['/b2b/orders',[]],['/b2b/catalog',[]],['/b2b/support',[]]]);
 if(purchasing){fixtures.set('/b2b/catalog',[{id:'qa-gel',nameRu:'Гель QA',sku:'QA-GEL',images:[],categories:[{category:{id:'gels',nameRu:'Гели'}}],variants:[{id:'qa-variant',sku:'QA-GEL-15',name:'15 г',b2bPrice:850,retailPrice:1000,available:5}]},{id:'qa-tools',nameRu:'Ножницы QA',sku:'QA-TOOLS',images:[],categories:[{category:{id:'tools',nameRu:'Инструменты'}}],variants:[{id:'qa-tools-variant',sku:'QA-TOOLS',b2bPrice:1700,retailPrice:2000,available:0}]}]);fixtures.set('/b2b/orders',[{id:'qa-order',orderNumber:'SB-QA-001',createdAt:'2026-09-18T10:00:00Z',status:'NEW',finalAmount:1700,isSynced1C:false,items:[{productName:'Гель QA',quantity:2,total:1700,externalSku:'QA-GEL-15'}]},{id:'qa-delivered',orderNumber:'SB-QA-002',createdAt:'2026-09-17T10:00:00Z',status:'DELIVERED',finalAmount:850,isSynced1C:true,items:[{productName:'Гель QA',quantity:1,total:850}]}]);}
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api\/v1/,'');
  const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};
  if(url.pathname.startsWith('/api/v1/')){
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(req.method()==='GET'){
    reads.push(path);
    if(path==='/b2b/bookings')return route.fulfill({headers,json:visits});
    if(path==='/b2b/booking-settings')return route.fulfill({headers,json:online});
    if(path==='/b2b/salon-presentation')return route.fulfill({headers,json:presentation});
    if(path===`/salon-booking/${company}/logo`)return route.fulfill({headers,contentType:'image/png',body:fixtureLogo});
    if(path===`/salon-booking/${company}`)return route.fulfill({status:publicClosed?404:200,headers,json:publicClosed?{message:'Недоступно'}:{name:presentation.displayName||profile.name,presentation,weeklySchedule:online.weeklySchedule||[],workingDays:online.workingDays,startMinute:online.startMinute,endMinute:online.endMinute,timeZone:'Europe/Moscow',today:'2026-09-19',horizonDays:30,services:[service],masters:[{id:master,name:'Анна Мастер'}]}});
    if(path===`/salon-booking/${company}/slots`)return route.fulfill({headers,json:{slots:['2026-09-19T06:00:00.000Z','2026-09-19T07:30:00.000Z'],timeZone:'Europe/Moscow'}});
    if(fixtures.has(path))return route.fulfill({headers,json:fixtures.get(path)});
   }
   if(path==='/b2b/salon-logo'&&req.method()==='POST'){writes.push({path,method:'POST',body:{multipart:true}});presentation={...presentation,logoUrl:`/api/v1/salon-booking/${company}/logo?v=qa-revision`};return route.fulfill({headers,json:presentation});}
   if(path==='/b2b/salon-logo'&&req.method()==='DELETE'){writes.push({path,method:'DELETE'});presentation={...presentation,logoUrl:null};return route.fulfill({headers,json:{logoUrl:null}});}
   if(['POST','PATCH'].includes(req.method())){
    const body=req.postDataJSON();writes.push({path,method:req.method(),body});
    if(path==='/b2b/booking-settings'){online={...online,...body};return route.fulfill({headers,json:online});}
    if(path==='/b2b/salon-presentation'){presentation={...presentation,...body};return route.fulfill({headers,json:presentation});}
    if(path==='/b2b/company-settings'){fixtures.set('/b2b/profile',{...fixtures.get('/b2b/profile'),...body});return route.fulfill({headers,json:body});}
    if(path.startsWith('/b2b/services/')){const i=serviceList.findIndex(item=>item.id===path.split('/').pop());if(i>=0){serviceList[i]={...serviceList[i],...body};return route.fulfill({headers,json:serviceList[i]});}}
    if(path.startsWith('/b2b/clients/')){const i=clientList.findIndex(item=>item.id===path.split('/').pop());if(i>=0){clientList[i]={...clientList[i],...body};return route.fulfill({headers,json:clientList[i]});}}
    if(path==='/b2b/bookings'){const value={...initial,...body,id:'qa-created',endTime:new Date(Date.parse(body.startTime)+60*60000).toISOString(),client:customer,service,masterMember:member};visits.push(value);return route.fulfill({headers,json:value});}
    if(path==='/b2b/bookings/qa-visit'){visits=visits.map(v=>v.id==='qa-visit'?{...v,...body,...(body.startTime?{endTime:new Date(Date.parse(body.startTime)+60*60000).toISOString()}:{})}:v);return route.fulfill({headers,json:visits[0]});}
    if(path===`/salon-booking/${company}/bookings`){if(conflict){conflict=false;return route.fulfill({status:409,headers,json:{message:'Это время уже недоступно. Выберите другой слот.'}});}return route.fulfill({headers,json:{id:'qa-public',startTime:body.startTime,endTime:'2026-09-19T07:00:00.000Z',status:'NEW',serviceName:service.name,timeZone:'Europe/Moscow'}});}
   }
   unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:403,headers,json:{message:'Unexpected fixture request'}});
  }
  if(url.origin==='http://127.0.0.1:3001'&&(req.resourceType()==='document'||/^\/(_nuxt|fonts)\//.test(url.pathname)||['/sarkisian-logo.png','/favicon.ico'].includes(url.pathname)))return route.continue();
  unexpected.push(req.url());return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {context,page,writes,reads,errors,unexpected};
}
for(const width of [1440,390]){
 test(`Salon day/week calendar, edit and workspace navigation ${width}`,async({browser},info)=>{
  const f=await isolated(browser,width);
  try{
   await f.page.goto('/b2b?section=calendar');await expect(f.page.locator('.salon-calendar')).toBeVisible();
   await expect(f.page.locator('.b2b-rail .company')).toHaveCount(0);
   await expect(f.page.locator('.business-toolbar nav')).toHaveCount(0);
   await expect(f.page.locator('.b2b-rail .bottom a')).toHaveCount(0);
   await expect(f.page.locator('.b2b-rail .bottom').getByRole('button',{name:'Выйти',exact:true})).toHaveCount(0);
   await expect(f.page.locator('.business-toolbar-actions').getByRole('link',{name:'Открыть сайт'})).toHaveAttribute('target','_blank');
   await expect(f.page.locator('.business-toolbar-actions>:last-child')).toHaveAccessibleName('Выйти');
   const theme=await f.page.getByLabel('Рабочее пространство бизнеса').evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}));
   expect(theme.color).toBe('rgb(255, 255, 255)');expect(theme.background).toBe(await f.page.locator('.b2b-rail').evaluate(el=>getComputedStyle(el).backgroundImage));
   const controls=await f.page.locator('.salon-calendar-tools>button,.salon-calendar-tools>input,.salon-calendar-modes>button,.business-toolbar .wn-icon-control').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius})));
   for(const control of controls)expect(control).toEqual({height:44,radius:'8px'});
   if(width===1440){const row=await f.page.locator('.salon-calendar-tools>*').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));expect(new Set(row).size).toBe(1);}
   expect(await f.page.locator('.salon-calendar-slot').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height}))).toEqual({radius:'0px',height:24});
   if(width===1440)expect(await f.page.getByLabel('Рабочее пространство бизнеса').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(260);
   await f.page.getByLabel('Дата календаря',{exact:true}).fill('2026-09-19');
   const card=f.page.locator('.salon-calendar-visit').filter({hasText:'Елена Тестовая'});await expect(card).toBeVisible();
   await expect(f.page.getByRole('button',{name:'День',exact:true})).toHaveAttribute('aria-pressed','true');
   await card.click();const dialog=f.page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Карточка записи'})).toBeVisible();
   await dialog.getByLabel('Дата и время салона',{exact:true}).fill('2026-09-19T10:30');
   await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);
   expect(f.writes[0]).toMatchObject({path:'/b2b/bookings/qa-visit',method:'PATCH',body:{startTime:'2026-09-19T07:30:00.000Z'}});
   await f.page.getByRole('button',{name:'Неделя',exact:true}).click();await expect(f.page.locator('.salon-calendar-heading')).toHaveCount(7);
   await f.page.getByRole('button',{name:'День',exact:true}).click();
   await f.page.getByRole('button',{name:'Создать запись: Анна Мастер, 2026-09-19, 12:00',exact:true}).click();
   await expect(dialog.getByLabel('Дата и время салона',{exact:true})).toHaveValue('2026-09-19T12:00');
   await dialog.getByLabel('Клиент',{exact:true}).selectOption(client);await dialog.getByLabel('Услуга',{exact:true}).selectOption(serviceId);
   await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);
   expect(f.writes.at(-1)).toMatchObject({path:'/b2b/bookings',body:{masterMemberId:master,startTime:'2026-09-19T09:00:00.000Z'}});
   if(width===1440){
    const destination=f.page.getByRole('button',{name:'Создать запись: Анна Мастер, 2026-09-19, 14:00',exact:true});
    // Scroll before pressing the mouse: Playwright's target autoscroll must not
    // move a different card underneath the pointer before native dragstart.
    await destination.scrollIntoViewIfNeeded();
    await expect(f.page.locator('.salon-calendar-visit[data-booking-id="qa-visit"]')).toBeInViewport();
    f.page.once('dialog',dialog=>dialog.accept());
    await f.page.locator('.salon-calendar-visit[data-booking-id="qa-visit"]').dragTo(destination);
    await expect.poll(()=>f.writes.length).toBe(3);expect(f.writes.at(-1)).toMatchObject({path:'/b2b/bookings/qa-visit',body:{startTime:'2026-09-19T11:00:00.000Z'}});
    await expect(f.page.locator('.salon-calendar-visit[data-booking-id="qa-visit"]')).toContainText('14:00');
   }
   expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
   await info.attach('salon-calendar',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
   const switcher=f.page.getByLabel('Рабочее пространство бизнеса');await switcher.selectOption('purchases');await expect(f.page.getByRole('heading',{name:'Обзор закупок',exact:true})).toBeVisible();
   if(width<800){await expect(f.page.locator('.b2b-mobile-dock>a')).toHaveCount(4);await expect(f.page.locator('.b2b-mobile-dock')).toContainText('Каталог');expect(await f.page.locator('.b2b-mobile-dock').textContent()).not.toContain('Календарь');}
   await switcher.selectOption('salon');await expect(f.page.locator('.portal .body')).toBeVisible();
   expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
 });
 test(`Salon publication settings and embed code ${width}`,async({browser},info)=>{
  const f=await isolated(browser,width);
  try{
   await f.page.goto('/b2b?section=online-booking');await expect(f.page.getByRole('heading',{name:'Условия онлайн-записи'})).toBeVisible();
   await expect(f.page.getByLabel('Включить публичную запись')).toBeVisible();
   await expect(f.page.getByRole('heading',{name:'Расписание',exact:true})).toBeVisible();
   await expect(f.page.getByRole('heading',{name:'Страница записи',exact:true})).toBeVisible();
   await expect(f.page.getByRole('heading',{name:'Виджет для сайта',exact:true})).toBeVisible();
   await expect(f.page.getByLabel('Код виджета')).toBeHidden();
   await f.page.locator('.salon-widget-code summary').click();await expect(f.page.getByLabel('Код виджета')).toBeVisible();
   expect(await f.page.locator('.salon-day-options label').count()).toBe(7);
   await expect(f.page.getByLabel('Пн',{exact:true})).toBeChecked();await expect(f.page.getByLabel('Вс',{exact:true})).not.toBeChecked();
   expect(await f.page.locator('.salon-day-options input:checked+span').first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}))).toEqual({background:'rgb(32, 33, 39)',color:'rgb(255, 255, 255)'});
   expect(await f.page.getByRole('button',{name:'Сохранить настройки',exact:true}).count()).toBe(1);
   await f.page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__qaCopiedText=text;}}}));
   await f.page.getByRole('button',{name:'Скопировать ссылку',exact:true}).click();expect(await f.page.evaluate(()=>window.__qaCopiedText)).toBe(await f.page.getByLabel('Ссылка онлайн-записи').inputValue());
   await f.page.getByRole('button',{name:'Скопировать код виджета',exact:true}).click();expect(await f.page.evaluate(()=>window.__qaCopiedText)).toBe(await f.page.getByLabel('Код виджета').inputValue());
   await f.page.getByRole('button',{name:'Обновить',exact:true}).click();
   await expect.poll(()=>f.reads.filter(path=>path==='/b2b/booking-settings').length).toBe(2);
   await expect(f.page.getByLabel('Код виджета')).toHaveValue(new RegExp(`/booking/${company}\\?embed=1`));
   await f.page.getByLabel('Включить публичную запись').check();await f.page.getByRole('button',{name:'Сохранить настройки'}).click();
   await expect(f.page.locator('form').first().getByRole('status')).toContainText('Настройки сохранены');expect(f.writes).toHaveLength(1);expect(f.writes[0].body).toMatchObject({enabled:true,masterIds:[master]});
   expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
   await auditTypography(f.page,'.b2b-frame,.b2b-rail,.ui-mobile-dock');
   await info.attach('salon-settings',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
 });
 test(`Public salon booking full flow ${width}`,async({browser},info)=>{
  const f=await isolated(browser,width);
  try{
   await f.page.goto(`/booking/${company}`);await expect(f.page.getByRole('heading',{name:'Тестовый салон'})).toBeVisible();
   await f.page.getByLabel('Услуга',{exact:true}).selectOption(serviceId);await f.page.getByLabel('Мастер',{exact:true}).selectOption(master);await f.page.getByRole('button',{name:'Выбрать время'}).click();
   await f.page.getByRole('button',{name:'09:00',exact:true}).click();await f.page.getByRole('button',{name:'Продолжить'}).click();
   await f.page.getByLabel('Ваше имя').fill('Елена');await f.page.getByLabel('Телефон',{exact:true}).fill('+7 900 123-45-67');
   await expect(f.page.getByRole('button',{name:'Записаться',exact:true})).toBeDisabled();await f.page.getByRole('checkbox').check();
   await expect(f.page.getByRole('button',{name:'Записаться',exact:true})).toBeEnabled();
   await info.attach('public-booking',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
   await f.page.getByRole('button',{name:'Записаться',exact:true}).click();await expect(f.page.getByRole('heading',{name:'Запись создана'})).toBeVisible();
   expect(f.writes).toHaveLength(1);expect(f.writes[0].body).toMatchObject({serviceId,masterMemberId:master,personalDataConsent:true,startTime:'2026-09-19T06:00:00.000Z'});
   await expect(f.page.locator('.b2b-rail')).toHaveCount(0);expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
  }finally{await f.context.close();}
 });
}
test('Embedded form handles a concurrently occupied slot without losing contacts',async({browser})=>{
 const f=await isolated(browser,390,{conflict:true});try{
  await f.page.goto(`/booking/${company}?embed=1`);await expect(f.page.locator('.public-salon-booking.is-embedded')).toBeVisible();
  await f.page.getByLabel('Услуга',{exact:true}).selectOption(serviceId);await f.page.getByLabel('Мастер',{exact:true}).selectOption(master);await f.page.getByRole('button',{name:'Выбрать время'}).click();await f.page.getByRole('button',{name:'09:00',exact:true}).click();await f.page.getByRole('button',{name:'Продолжить'}).click();await f.page.getByLabel('Ваше имя').fill('Елена');await f.page.getByLabel('Телефон',{exact:true}).fill('79001234567');await f.page.getByRole('checkbox').check();await f.page.getByRole('button',{name:'Записаться',exact:true}).click();
  await expect(f.page.getByRole('alert')).toContainText('уже недоступно');await f.page.getByRole('button',{name:'10:30',exact:true}).click();await f.page.getByRole('button',{name:'Продолжить'}).click();await expect(f.page.getByLabel('Ваше имя')).toHaveValue('Елена');await f.page.getByRole('button',{name:'Записаться',exact:true}).click();await expect(f.page.getByRole('heading',{name:'Запись создана'})).toBeVisible();expect(f.writes).toHaveLength(2);expect(f.unexpected).toEqual([]);
 }finally{await f.context.close();}
});
test('Disabled public booking has no client/contact form',async({browser})=>{
 const f=await isolated(browser,390,{publicClosed:true});try{await f.page.goto(`/booking/${company}`);await expect(f.page.getByRole('alert')).toContainText('не открыл онлайн-запись');await expect(f.page.getByLabel('Телефон',{exact:true})).toHaveCount(0);expect(f.writes).toEqual([]);}finally{await f.context.close();}
});
test('The widget loads inside an actual third-party-style iframe host',async({browser},info)=>{
 const f=await isolated(browser,390);try{
  await f.context.route('**/qa-widget-host',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Сайт салона</title><body><h1>Сайт салона</h1><iframe src="/booking/${company}?embed=1" title="Онлайн-запись" width="100%" height="720"></iframe></body></html>`}));
  await f.page.goto('/qa-widget-host');const frame=f.page.frameLocator('iframe');await expect(frame.getByRole('heading',{name:'Тестовый салон'})).toBeVisible();await frame.getByLabel('Услуга',{exact:true}).selectOption(serviceId);await frame.getByLabel('Мастер',{exact:true}).selectOption(master);await frame.getByRole('button',{name:'Выбрать время'}).click();await expect(frame.getByRole('button',{name:'09:00',exact:true})).toBeVisible();await info.attach('actual-widget',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);expect(f.writes).toEqual([]);
 }finally{await f.context.close();}
});
test('A purchasing-only employee is redirected before any salon client API read',async({browser})=>{
 const f=await isolated(browser,390,{businessRole:'BUYER'});try{
  await f.page.goto('/b2b?section=calendar');await expect(f.page).toHaveURL(/section=purchases/);await expect(f.page.getByRole('heading',{name:'Обзор закупок',exact:true})).toBeVisible();
  await expect(f.page.getByLabel('Рабочее пространство бизнеса').locator('option')).toHaveCount(1);
  expect(f.reads).not.toContain('/b2b/clients');expect(f.reads).not.toContain('/b2b/bookings');expect(f.reads).not.toContain('/b2b/booking-settings');expect(f.writes).toEqual([]);expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
 }finally{await f.context.close();}
});
test('A visit crossing midnight remains visible on the following day',async({browser})=>{
 const f=await isolated(browser,390);try{
  await f.context.route('**/api/v1/b2b/bookings?*',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3001'},json:[{...initial,id:'qa-night',startTime:'2026-09-18T20:00:00.000Z',endTime:'2026-09-18T22:00:00.000Z'}]}));
  await f.page.goto('/b2b?section=calendar');await expect(f.page.locator('.salon-calendar')).toBeVisible();await f.page.getByLabel('Дата календаря',{exact:true}).fill('2026-09-19');
  const card=f.page.locator('[data-booking-id="qa-night"]');await expect(card).toBeVisible();expect(await card.evaluate(el=>({top:parseFloat(getComputedStyle(el).top),height:el.getBoundingClientRect().height}))).toEqual({top:0,height:93});expect(f.writes).toEqual([]);expect(f.errors).toEqual([]);
 }finally{await f.context.close();}
});
for(const width of [320,768]){
 test(`Business controls and service editor fit the viewport ${width}`,async({browser},info)=>{
  const f=await isolated(browser,width);try{
   for(const section of ['clients','services','team','support','catalog','orders']){
    await f.page.goto(`/b2b?section=${section}`);await expect(f.page.locator('.portal .body')).toBeVisible();
    expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    await auditTypography(f.page,'.b2b-frame,.b2b-rail,.ui-mobile-dock');
    const header=await f.page.locator('.business-toolbar').evaluate(el=>el.getBoundingClientRect().height);expect(header).toBeLessThanOrEqual(80);
   }
   await f.page.goto('/b2b?section=services');await expect(f.page.locator('.portal .body')).toBeVisible();
   await f.page.getByRole('button',{name:'Новая услуга',exact:true}).click();const dialog=f.page.getByRole('dialog');await expect(dialog).toBeVisible();
   const fields=await dialog.locator('input:not([type=checkbox]):not([type=color]),select,textarea').evaluateAll(els=>els.map(el=>({radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height,right:el.getBoundingClientRect().right})));
   expect(fields.length).toBeGreaterThan(2);for(const field of fields){expect(field.radius).toBe('8px');expect(field.height).toBeGreaterThanOrEqual(44);expect(field.right).toBeLessThanOrEqual(width);}
   await info.attach('business-service-editor',{body:await f.page.screenshot({fullPage:true}),contentType:'image/png'});
   await auditTypography(f.page,'.b2b-frame,.b2b-rail,.ui-mobile-dock,.admin-dialog');
   expect(f.writes).toEqual([]);expect(f.errors).toEqual([]);expect(f.unexpected).toEqual([]);
  }finally{await f.context.close();}
 });
}
