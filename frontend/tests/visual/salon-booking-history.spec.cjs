// All APIs intercepted: edit history and stale-form recovery without real data.
const {test,expect}=require('@playwright/test');
const organization='10000000-0000-4000-8000-000000000001',master='20000000-0000-4000-8000-000000000001',clientId='30000000-0000-4000-8000-000000000001',serviceId='40000000-0000-4000-8000-000000000001',bookingId='50000000-0000-4000-8000-000000000001';
for(const width of [1440,390])for(const theme of ['light','dark'])for(const unavailable of [false,true])test(`Salon history and stale edit recovery ${width} ${theme} ${unavailable?'inactive master':'active master'}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),actor={id:'qa-owner',role:'CUSTOMER_B2B',email:'qa@example.invalid',firstName:'Анна'};
 await context.addCookies([{name:'sarkisian-crm-theme',value:theme,domain:'127.0.0.1',path:'/'}]);
 await context.addInitScript(actor=>{localStorage.setItem('sarkisian-b2b-token','fixture-not-jwt');localStorage.setItem('sarkisian-b2b-user',JSON.stringify(actor));},actor);
 const page=await context.newPage(),posts=[],errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-26T12:00:00Z')});
 const member={id:master,role:unavailable?'BUYER':'OWNER',user:{firstName:'Анна',lastName:'Мастер'}},client={id:clientId,firstName:'Елена',lastName:'Тестовая'},service={id:serviceId,name:'Маникюр',duration:60,price:1500,isActive:true};
 let booking={id:bookingId,version:1,clientId,serviceId,masterMemberId:master,client,service,masterMember:member,status:'NEW',priceSnapshot:'1500',startTime:'2026-10-27T09:00:00.000Z',endTime:'2026-10-27T10:00:00.000Z',notes:''};
 const history=[{id:'event-created',action:'CREATED',actorLabel:'Анна Мастер',createdAt:'2026-10-26T12:00:00.000Z',version:1,before:null,after:{...booking}}];
 await context.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1','');
  if(req.method()==='PATCH'&&path===`/b2b/bookings/${bookingId}`){const body=req.postDataJSON();posts.push(body);if(posts.length===1){booking={...booking,version:2,notes:'Другой сотрудник изменил запись'};return route.fulfill({status:409,json:{code:'BOOKING_VERSION_CONFLICT',message:'Запись уже изменил другой сотрудник. Обновите данные записи и проверьте изменения.'}});}booking={...booking,...body,version:3};return route.fulfill({json:booking});}
  const fixtures=new Map([['/auth/me',actor],['/b2b/organizations',[{id:organization,name:'Тестовый салон',status:'ACTIVE',role:'OWNER',canOrder:true,canSeeFinance:true,canUseSalon:true}]],['/b2b/profile',{id:organization,name:'Тестовый салон',status:'ACTIVE',membership:{role:'OWNER',canOrder:true,canSeeFinance:true},capabilities:{salon:true},members:[member]}],['/b2b/booking-settings',{timeZone:'Europe/Moscow',startMinute:540,endMinute:1200,workingDays:[0,1,2,3,4,5,6]}],['/b2b/clients',[client]],['/b2b/services',[service]],['/b2b/bookings',[booking]],[`/b2b/bookings/${bookingId}`,booking],[`/b2b/bookings/${bookingId}/history`,history]]);
  if(req.method()==='GET'&&fixtures.has(path))return route.fulfill({json:fixtures.get(path)});
  unexpected.push(req.method()+' '+path);return route.fulfill({status:404,json:{message:'Unknown fixture request'}});
 });
 try{
  await page.goto('/b2b?section=calendar');await page.getByLabel('Дата календаря',{exact:true}).fill('2026-10-27');if(unavailable)await expect(page.getByLabel('Создать запись: Анна Мастер · недоступен, 2026-10-27, 13:00',{exact:true})).toBeDisabled();await page.locator('.salon-calendar-visit').filter({hasText:'Елена Тестовая'}).click();const dialog=page.getByRole('dialog');
  if(unavailable){await expect(dialog.getByLabel('Мастер',{exact:true}).getByRole('option',{name:'Мастер недоступен',exact:true})).toHaveCount(1);expect(await dialog.getByLabel('Мастер',{exact:true}).getByRole('option',{name:'Анна Мастер',exact:true}).count()).toBe(0);}
  await expect(dialog.getByRole('region',{name:'История записи',exact:true})).toContainText('Запись создана');await expect(dialog.getByRole('region',{name:'История записи',exact:true})).toContainText('Анна Мастер');
  await dialog.getByLabel('Комментарий',{exact:true}).fill('Мои изменения');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog.getByRole('button',{name:'Обновить данные записи',exact:true})).toBeVisible();expect(posts[0].version).toBe(1);
  page.once('dialog',prompt=>prompt.accept());await dialog.getByRole('button',{name:'Обновить данные записи',exact:true}).click();await expect(dialog.getByLabel('Комментарий',{exact:true})).toHaveValue('Другой сотрудник изменил запись');
  await dialog.getByLabel('Комментарий',{exact:true}).fill('Проверено после обновления');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(dialog).toHaveCount(0);expect(posts[1].version).toBe(2);expect(errors).toEqual([]);expect(unexpected).toEqual([]);
 }finally{await context.close();}
});
