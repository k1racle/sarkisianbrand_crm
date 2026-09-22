/* Public loopback reads; all admin requests use fixtures. No real writes or credentials. */
const {test,expect}=require('@playwright/test');
const {isolatedContext}=require('../../scripts/admin-design-mock.cjs');
const fixturePage={"slug":"partnerships","title":"Рекомендуйте то, во что верите.","eyebrow":"СОТРУДНИЧЕСТВО С SARKISIAN","lead":"Хорошие материалы хочется рекомендовать. Делитесь SARKISIAN с друзьями или создавайте полезный контент для своей аудитории — у нас предусмотрены два разных формата участия.","blocks":[{"id":"cover","kind":"hero","icon":"users","title":"Выберите свой формат","body":"Друзьям — рекомендации и бонусы на сайте\nАвторам — партнёрство и денежное вознаграждение\nСалонам — знакомство с бизнес-платформой","buttonLabel":"Реферальная программа","buttonUrl":"/partnerships#referral","secondaryLabel":"Я блогер или автор","secondaryUrl":"/partnerships#bloggers"},{"id":"referral","kind":"feature","icon":"gift","title":"Для тех, кто рекомендует друзьям","body":"Участвовать может зарегистрированный частный клиент сайта: большая аудитория или блог не нужны. После запуска программы и принятия условий в кабинете появляется персональная ссылка.\nЗа подходящие покупки приглашённых клиентов начисляются бонусы, которыми можно оплачивать часть следующих заказов на сайте. Это не денежный доход: вывод и обмен бонусов на деньги не предусмотрены.","buttonLabel":"Условия и моя ссылка","buttonUrl":"/account?tab=referrals"}],"revision":1,"isActive":true,"reviewRequired":false,"seoDescription":"Реферальная программа и сотрудничество с блогерами SARKISIAN: персональная ссылка, бонусы за рекомендации, аналитика и денежное вознаграждение авторам."};
for(const width of [1440,390,320])for(const path of ['/','/business','/partnerships','/club'])test(`Business/partner public ${path} ${width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'}),writes=[],external=[],errors=[];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes.push(url.pathname);return route.fulfill({status:405,json:{message:'Read only QA'}});}
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){external.push(url.origin);return route.abort();}
  if(url.pathname==='/api/v1/cart')return route.fulfill({json:{items:[],total:0}});
  if(url.pathname==='/api/v1/storefront/favorites')return route.fulfill({json:[]});
  if(url.pathname.startsWith('/api/v1/')&&!/^\/api\/v1\/(products(?:\/|$)|seo(?:\/|$)|gift-cards\/product$)/.test(url.pathname))return route.fulfill({status:403,json:{message:'Private reads blocked'}});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto('http://127.0.0.1:3001'+path,{waitUntil:'networkidle'});expect(response.status()).toBe(200);await page.evaluate(()=>document.fonts.ready);
  if(path==='/'){
   await expect(page.locator('.sb-home-partnership')).toHaveCount(3);
   await expect(page.locator('.sb-home-partnership--business')).toHaveClass(/sb-home-partnership--light/);
   await expect(page.locator('.sb-home-partnership--referral')).toHaveClass(/sb-home-partnership--light/);
   await expect(page.locator('.sb-home-partnership--bloggers')).toHaveClass(/sb-home-partnership--dark/);
   await expect(page.getByRole('group',{name:'Макет iPhone с экраном записи TikTok'})).toBeVisible();
   const phone=page.locator('.sb-creator-phone');await expect(phone.locator('img')).toHaveAttribute('src',/svetlana-creator-youtube\.jpg$/);await expect(page.locator('.sb-creator-art__perks')).toHaveCount(0);await expect(phone.locator('.sb-creator-phone__caption, .sb-creator-phone__controls span, .sb-creator-phone__controls b')).toHaveCount(0);await expect(phone).not.toContainText('10 мин.');await expect(phone).not.toContainText('60 с');await expect(phone).not.toContainText('15 с');
   const clip=phone.locator('video');await expect(clip).toHaveAttribute('src',/svetlana-creator-video\.mp4$/);await expect(clip).toHaveAttribute('loop','');await expect(clip).toHaveAttribute('playsinline','');
   await phone.scrollIntoViewIfNeeded();await expect.poll(()=>clip.evaluate(el=>el.readyState>=2&&!el.paused),{timeout:10000}).toBe(true);expect(await clip.evaluate(el=>el.muted)).toBe(true);
   await phone.getByRole('button',{name:'Приостановить видео'}).click();await expect.poll(()=>clip.evaluate(el=>el.paused)).toBe(true);await phone.getByRole('button',{name:'Воспроизвести видео'}).click();await expect.poll(()=>clip.evaluate(el=>!el.paused)).toBe(true);
   await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>clip.evaluate(el=>el.paused)).toBe(true);await page.emulateMedia({reducedMotion:'no-preference'});
   const creatorButton=page.locator('main > .sb-home-partnership--bloggers .sb-partnership-button');expect(await creatorButton.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}))).toEqual({background:'rgb(254, 44, 85)',color:'rgb(255, 255, 255)'});
   const stack=page.locator('.sb-club-referral-stack');await expect(stack).toHaveCount(1);
   const measurements=await stack.evaluate(el=>{const c=el.querySelector('.sb-club-banner'),r=el.querySelector('.sb-home-partnership');return {start:el.getBoundingClientRect().top+scrollY,referral:r.getBoundingClientRect().top+scrollY,height:c.offsetHeight,pin:parseFloat(getComputedStyle(c).top)};});
   await page.evaluate(m=>scrollTo(0,m.start-m.pin+20),measurements);const pinned=(await stack.locator('.sb-club-banner').boundingBox()).y;
   await page.evaluate(m=>scrollTo(0,m.referral-m.pin-m.height*.35),measurements);
   const clubRect=await stack.locator('.sb-club-banner').boundingBox(),refRect=await stack.locator('.sb-home-partnership').boundingBox();expect(Math.abs(clubRect.y-pinned)).toBeLessThan(3);expect(refRect.y).toBeLessThan(clubRect.y+clubRect.height);
   expect(await page.evaluate(({c,r})=>document.elementFromPoint(r.x+r.width*.1,Math.max(r.y+40,c.y+c.height*.6))?.closest('.sb-home-partnership--referral')!==null,{c:clubRect,r:refRect})).toBe(true);
   await info.attach('club-referral-overlay',{body:await page.screenshot(),contentType:'image/png'});
   if(width===1440){
    const bounds=await phone.boundingBox(),blockBounds=await page.locator('.sb-home-partnership--bloggers').boundingBox();expect(bounds.y).toBeLessThan(blockBounds.y);expect(bounds.y+bounds.height).toBeGreaterThan(blockBounds.y+blockBounds.height);
    await phone.evaluate(el=>el.scrollIntoView({block:'center'}));const b=await phone.boundingBox();await page.mouse.move(b.x+b.width*.65,b.y+b.height*.4);await expect(phone).toHaveClass(/is-card-tilting/);await expect.poll(()=>phone.evaluate(el=>Math.abs(parseFloat(el.style.getPropertyValue('--sb-card-tilt-y'))||0))).toBeGreaterThan(.01);
    await page.mouse.move(10,300);await expect(phone).not.toHaveClass(/is-card-tilting/);await expect.poll(()=>phone.evaluate(el=>el.style.getPropertyValue('--sb-card-tilt-y'))).toBe('0deg');
    await page.emulateMedia({reducedMotion:'reduce'});const still=await phone.boundingBox();await page.mouse.move(still.x+still.width*.6,still.y+still.height*.3);await expect(phone).not.toHaveClass(/is-card-tilting/);await page.mouse.move(10,300);await page.emulateMedia({reducedMotion:'no-preference'});
    await info.attach('bloggers-overflow',{body:await page.screenshot(),contentType:'image/png'});
   }else{await phone.dispatchEvent('pointerenter',{pointerType:'touch',clientX:100,clientY:100});await expect(phone).not.toHaveClass(/is-card-tilting/);}
   expect(await page.locator('main').evaluate(el=>Array.from(el.querySelectorAll('.sb-home-partnership, .sb-club-banner')).map(s=>s.classList.contains('sb-club-banner')?'club':s.classList.contains('sb-home-partnership--business')?'business':s.classList.contains('sb-home-partnership--referral')?'referral':'bloggers'))).toEqual(['business','club','referral','bloggers']);
   for(const [kind,href]of [['business','/business'],['referral','/club/referrals'],['bloggers','/partnerships#bloggers']])await expect(page.locator('.sb-home-partnership--'+kind+' .sb-partnership-button')).toHaveAttribute('href',href);
  }else if(path==='/club'){
   await expect(page.locator('.sb-club-hub')).toBeVisible();await expect(page.locator('.sb-club-direction')).toHaveCount(3);await expect(page.locator('.sb-club-direction a[href="/club/referrals"]')).toBeVisible();await expect(page.locator('.sb-club-direction a[href="/business"]')).toBeVisible();await expect(page.locator('.sb-club-direction a[href="/partnerships"]')).toBeVisible();
  }else{
   await expect(page.locator('.sb-partnership-page h1')).toBeVisible();
   if(path==='/business'){
    await expect(page.locator('.sb-business-hero .sb-business-preview')).toBeVisible();
    await expect(page.locator('.sb-business-hero__benefits li')).toHaveCount(3);
    await expect(page.locator('.sb-business-hero__actions a[href="/business-registration"]')).toBeVisible();
    await expect(page.locator('.sb-business-hero__actions a[href="/b2b-login"]')).toBeVisible();
    await expect(page.locator('.sb-business-story')).toHaveCount(2);
   }else if(path==='/partnerships') await expect(page.locator('.sb-blogger-hero')).toBeVisible();
   else await expect(page.locator('.sb-partnership-cover .sb-home-partnership')).toBeVisible();
   if(path==='/partnerships'){await expect(page.locator('.sb-blogger-offer')).toHaveCount(2);await expect(page.locator('.sb-partnership-scene')).toHaveCount(1);}else{await expect(page.locator('.sb-partnership-feature--scene')).toHaveCount(2);await expect(page.locator('.sb-partnership-scene')).toHaveCount(2);}
   for(const card of await page.locator('.sb-partnership-calendar,.sb-partnership-link-card,.sb-partnership-business-card,.sb-partnership-product-shot').all())expect(await card.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
   if(path==='/business'){const photos=page.locator('.sb-partnership-product-shot img');expect(await photos.count()).toBeGreaterThan(0);await photos.first().scrollIntoViewIfNeeded();for(const photo of await photos.all())await expect.poll(()=>photo.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
   if(path==='/partnerships'){await expect(page.locator('#referral')).toHaveCount(0);await expect(page.locator('#bloggers a')).toHaveAttribute('href','/account?tab=bloggers');await expect(page.locator('.sb-partnership-page')).not.toContainText('Рефералы');await expect(page.locator('.sb-partnership-page')).not.toContainText('Реферальная');}
   const faq=page.locator('.sb-partnership-section details').first();await faq.locator('summary').click();await expect(faq).toHaveAttribute('open','');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  await expect(page.locator('.sb-header-actions button > span')).toHaveCount(0);
  if(width===1440){const clubMenu=page.locator('.sb-club-menu');await expect(clubMenu.locator('.sb-club-menu__trigger')).toHaveText(/О клубе/);await clubMenu.locator('.sb-club-menu__trigger').click();await expect(clubMenu.locator('.sb-club-menu__dropdown a[href="/business"]')).toBeVisible();await expect(clubMenu.locator('.sb-club-menu__dropdown a[href="/partnerships"]')).toBeVisible();}
  expect(errors).toEqual([]);expect(writes).toEqual([]);expect(external).toEqual([]);
  if(path!=='/'){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);}
  await info.attach('page',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  if(path==='/'&&width===1440)for(const kind of ['business','referral','bloggers'])await info.attach(kind,{body:await page.locator('.sb-home-partnership--'+kind).screenshot(),contentType:'image/png'});
 }finally{await context.close();}
});
for(const width of [1440,390])test(`CMS partnership home editable ${width}`,async({browser})=>{
 const f=await isolatedContext(browser,width,false,false,{allowFixtureForms:true}),writes=[];
 await f.context.route('**/api/v1/admin/storefront/site-content',async route=>{
  const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Methods':'GET,PATCH,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(route.request().method()==='GET')return route.fulfill({headers,json:{revision:0,content:{}}});
  expect(route.request().method()).toBe('PATCH');const body=route.request().postDataJSON();writes.push(body);return route.fulfill({headers,json:{revision:1,content:body.content}});
 });
 try{
  await f.page.goto('/admin-workspace/site-content');await expect(f.page.getByLabel('Выбрать блок главной')).toBeAttached();
  if(width<800)await f.page.getByLabel('Выбрать блок главной').selectOption('business');else await f.page.getByRole('button',{name:/^Для бизнеса/}).click();
  const editor=f.page.locator('.studio-content-fields');await editor.getByLabel('Заголовок',{exact:true}).fill('Бизнес — тестовый черновик');await editor.getByLabel('Оформление блока').selectOption('rose');await editor.getByLabel('Строки иллюстрации').fill('Закупки\nЗапись');
  expect(writes).toEqual([]);await f.page.getByRole('button',{name:'Сохранить контент',exact:true}).click();await expect(f.page.getByText('Контент сохранён.',{exact:false})).toBeVisible();
  expect(writes).toHaveLength(1);expect(writes[0].content.home.business).toMatchObject({title:'Бизнес — тестовый черновик',theme:'rose',visualLines:['Закупки','Запись']});expect(writes[0].content.home.order).toHaveLength(10);expect(f.traffic.prohibitedWrites).toEqual([]);expect(f.errors).toEqual([]);
 }finally{await f.context.close();}
});
for(const width of [1440,390])test(`CMS partner page preserves formatting/CTA ${width}`,async({browser})=>{
 const f=await isolatedContext(browser,width,false,false,{allowFixtureForms:true,fixtures:new Map([['/admin/storefront/pages',[fixturePage]]])}),writes=[];
 await f.context.route('**/api/v1/admin/storefront/pages/partnerships',async route=>{
  const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Methods':'PATCH,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  expect(route.request().method()).toBe('PATCH');const body=route.request().postDataJSON();writes.push(body);return route.fulfill({headers,json:{...fixturePage,...body,revision:2}});
 });
 try{
  await f.page.goto('/admin-workspace/pages');const block=f.page.locator('.sb-cms-block-editor').nth(1);await expect(block).toBeVisible();await block.getByLabel('Заголовок блока').fill('Рефералы — новое название');await block.getByLabel('Формат',{exact:true}).selectOption('feature');await block.getByLabel('Иконка',{exact:true}).selectOption('gift');await block.locator('summary').click();await block.getByLabel('Подпись основной кнопки').fill('Моя ссылка');
  expect(writes).toEqual([]);await f.page.getByRole('button',{name:'Сохранить страницу',exact:true}).click();await expect(f.page.getByText('Страница сохранена.',{exact:false})).toBeVisible();expect(writes).toHaveLength(1);expect(writes[0].blocks[1]).toMatchObject({kind:'feature',icon:'gift',buttonLabel:'Моя ссылка',buttonUrl:'/account?tab=referrals'});expect(writes[0].blocks[0].kind).toBe('hero');expect(f.traffic.prohibitedWrites).toEqual([]);expect(f.errors).toEqual([]);
 }finally{await f.context.close();}
});
