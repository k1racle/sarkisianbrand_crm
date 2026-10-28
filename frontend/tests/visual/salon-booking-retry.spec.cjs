// All APIs are intercepted; no real appointments, contacts or notifications.
const { test, expect } = require('@playwright/test');
const company='10000000-0000-4000-8000-000000000001',service='20000000-0000-4000-8000-000000000001',master='30000000-0000-4000-8000-000000000001';
for (const width of [1440,390]) test(`Public booking recovers an ambiguous response with the same request key ${width}`, async ({ browser }) => {
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage(),posts=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/api/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
    if(path===`/salon-booking/${company}`)return route.fulfill({json:{name:'Тестовый салон',timeZone:'UTC',today:'2026-10-26',horizonDays:30,services:[{id:service,name:'Маникюр',duration:60,price:1500}],masters:[{id:master,name:'Анна'}]}});
    if(path===`/salon-booking/${company}/slots`)return route.fulfill({json:{slots:['2026-10-27T09:00:00.000Z'],timeZone:'UTC'}});
    if(path===`/salon-booking/${company}/bookings`){posts.push(req.postDataJSON());if(posts.length===1)return route.abort('failed');return route.fulfill({status:201,json:{id:'confirmed',serviceName:'Маникюр',startTime:'2026-10-27T09:00:00.000Z',endTime:'2026-10-27T10:00:00.000Z',status:'NEW',priceSnapshot:'1500',timeZone:'UTC'}});}
    return route.fulfill({status:404,json:{message:'Unknown fixture route'}});
  });
  try {
    await page.goto(`/booking/${company}?embed=1`);
    await page.getByLabel('Услуга',{exact:true}).selectOption(service);await page.getByLabel('Мастер',{exact:true}).selectOption(master);
    await page.getByRole('button',{name:'Выбрать время',exact:true}).click();await page.getByLabel('Дата визита',{exact:true}).fill('2026-10-27');await page.getByRole('button',{name:'09:00',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
    await page.getByLabel('Ваше имя',{exact:true}).fill('Анна');await page.getByLabel('Телефон',{exact:true}).fill('+7 900 000-00-00');await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Записаться',exact:true}).click();await expect(page.getByRole('alert')).toContainText('повторная запись не появится');
    await page.getByRole('button',{name:'Записаться',exact:true}).click();await expect(page.getByRole('heading',{name:'Запись создана',exact:true})).toBeVisible();
    expect(posts).toHaveLength(2);expect(posts[0].requestKey).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);expect(posts[1]).toEqual(posts[0]);expect(posts[0].phone).toBe('79000000000');expect(errors).toEqual([]);
  } finally {await context.close();}
});
for(const missing of ['services','masters'])test(`Public booking explains unavailable ${missing} and retains salon contacts`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'}),page=await context.newPage(),posts=[];
 await context.route('**/api/v1/**',async route=>{
  const req=route.request();if(req.method()==='POST')posts.push(new URL(req.url()).pathname);
  const profile={name:'Тестовый салон',presentation:{address:'Москва, Тестовая 1',phones:['+7 900 000-00-00'],emails:[],socialLinks:[]},timeZone:'UTC',today:'2026-10-26',horizonDays:30,services:[{id:service,name:'Маникюр',duration:60,price:1500}],masters:[{id:master,name:'Анна'}]};profile[missing]=[];return route.fulfill({json:profile});
 });
 try{await page.goto(`/booking/${company}?embed=1`);await expect(page.getByRole('heading',{name:'Онлайн-запись пока недоступна',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'+7 900 000-00-00',exact:true})).toHaveAttribute('href','tel:+79000000000');await expect(page.locator('.public-salon-contacts')).toContainText('Москва, Тестовая 1');expect(await page.getByRole('combobox').count()).toBe(0);expect(await page.getByRole('button',{name:'Выбрать время',exact:true}).count()).toBe(0);expect(await page.locator('.public-booking-steps').count()).toBe(0);expect(posts).toEqual([]);}finally{await context.close();}
});
