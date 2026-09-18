/* Public reads or isolated CMS fixtures only; never real mutations. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
for(const width of [1440,390,320])test(`Home accents and about biography/portrait/buttons ${width}`,async({browser},info)=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3001',viewport:{width,height:960},serviceWorkers:'block'}),errors=[],writes=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return route.abort();
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(url.pathname);return route.fulfill({status:405,json:{}});}
  if(url.pathname==='/api/v1/cart')return route.fulfill({json:{items:[],total:0}});
  if(url.pathname==='/api/v1/storefront/favorites')return route.fulfill({json:[]});
  if(url.pathname.startsWith('/api/v1/')&&!/^\/api\/v1\/(products(?:\/|$)|seo(?:\/|$)|gift-cards\/product$)/.test(url.pathname))return route.fulfill({status:403,json:{}});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/',{waitUntil:'networkidle'});
  const color=el=>getComputedStyle(el).color;
  expect(await page.locator('.sb-home-partnership--bloggers .sb-partnership-heading em').evaluate(color)).toBe(await page.locator('.sb-club-banner__copy h2 em').evaluate(color));
  expect(await page.locator('.sb-referral-card-back').evaluate(el=>getComputedStyle(el).transform)).not.toBe('none');
  await page.goto('/about',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('article.sb-content-page.is-about')).toHaveCount(1);await expect(page.locator('.sb-partnership-page')).toHaveCount(0);
  await expect.poll(()=>page.locator('.sb-about-hero-logo').evaluate(el=>el.naturalWidth)).toBe(3901);
  await expect(page.locator('.sb-content-toc')).toHaveCount(0);await expect(page.locator('.sb-content-actions a[href="/b2b-login"]')).toHaveCount(0);
  const hero=page.locator('.sb-content-hero');await expect(hero.locator('a[href="/catalog"] svg')).toBeVisible();await expect(hero.locator('.sb-about-hero-logo')).toBeVisible();
  const articleBounds=await page.locator('article.sb-content-page.is-about').boundingBox(),biographyBounds=await page.locator('.sb-founder-biography').boundingBox();expect(Math.abs(biographyBounds.x-articleBounds.x)).toBeLessThan(2);expect(Math.abs(biographyBounds.width-articleBounds.width)).toBeLessThan(2);
  if(width>760){const menuBounds=await page.locator('.sb-header').boundingBox();expect(Math.abs(menuBounds.x-articleBounds.x)).toBeLessThan(2);expect(Math.abs(menuBounds.width-articleBounds.width)).toBeLessThan(2);}
  const personalSocials=page.getByRole('navigation',{name:'Личные соцсети Светланы Саркисян'});await expect(personalSocials.locator('a')).toHaveCount(3);await expect(personalSocials.getByRole('link',{name:'Telegram',exact:true})).toHaveAttribute('href','https://t.me/sarkisian_sv');await expect(personalSocials.getByRole('link',{name:'ВКонтакте',exact:true})).toHaveAttribute('href','https://vk.ru/sarkisian_sv');await expect(personalSocials.getByRole('link',{name:'Instagram',exact:true})).toHaveAttribute('href','https://www.instagram.com/sarkisian.sv/');
  if(width<=760){const logo=await hero.locator('.sb-about-hero-logo').boundingBox(),photo=await hero.locator('.sb-content-photo').boundingBox();expect(logo.y+logo.height+16).toBeLessThan(photo.y);}
  if(width>760){const geometry=await hero.evaluate(el=>{const r=el.getBoundingClientRect(),bg=r.y+parseFloat(getComputedStyle(el,'::before').top);return {bg,logoBottom:el.querySelector('.sb-about-hero-logo').getBoundingClientRect().bottom,photoTop:el.querySelector('.sb-content-photo').getBoundingClientRect().top,copyTop:el.querySelector('.sb-content-hero__copy .sb-kicker').getBoundingClientRect().top};});expect(geometry.logoBottom).toBeLessThan(geometry.bg);expect(geometry.photoTop).toBeLessThan(geometry.bg);expect(geometry.copyTop).toBeGreaterThan(geometry.bg);}
  const gallery=page.getByRole('region',{name:'Фотографии Светланы Саркисян'});await expect(page.getByRole('heading',{name:'Светлана Саркисян',exact:true})).toBeVisible();
  await expect(gallery.locator('.sb-founder-gallery__pagination button')).toHaveCount(3);
  const imageBounds=await gallery.locator('figure').boundingBox(),arrowBounds=await gallery.getByRole('button',{name:'Следующая фотография'}).boundingBox();expect(Math.abs(arrowBounds.y+arrowBounds.height/2-imageBounds.y-imageBounds.height/2)).toBeLessThan(2);
  await gallery.getByRole('button',{name:'Показать фотографию 3',exact:true}).click();await expect(gallery.getByRole('button',{name:'Показать фотографию 3',exact:true})).toHaveAttribute('aria-current','true');await gallery.getByRole('button',{name:'Показать фотографию 1',exact:true}).click();
  await gallery.getByRole('button',{name:'Следующая фотография'}).click();await expect(gallery.getByRole('status')).toHaveText('2 / 3');await expect.poll(()=>gallery.locator('img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await gallery.focus();await page.keyboard.press('ArrowLeft');await expect(gallery.getByRole('status')).toHaveText('1 / 3');
  const help=page.locator('.sb-content-help a');await expect(help.locator('svg')).toBeVisible();await help.hover();expect(await help.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(21, 21, 21)');await expect.poll(()=>help.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(234, 233, 231)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);expect(errors).toEqual([]);expect(writes).toEqual([]);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);await info.attach('about',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 }finally{await context.close();}
});
test('CMS biography text and gallery survive save without live writes',async({browser})=>{
 const bio={id:'founder',kind:'biography',title:'Светлана Саркисян',body:'Исходная биография',images:['/storefront/svetlana-portrait.png','/storefront/hero.jpg']};
 const about={slug:'about',title:'О бренде',eyebrow:'SARKISIAN',lead:'От мастера — мастерам.',blocks:[bio],revision:1,isActive:true,reviewRequired:false};
 const f=await isolatedContext(browser,1440,false,false,{allowFixtureForms:true,fixtures:new Map([['/admin/storefront/pages',[about]]])}),writes=[];
 await f.context.route('**/api/v1/admin/storefront/pages/about',async route=>{const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Methods':'PATCH,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});const body=route.request().postDataJSON();writes.push(body);return route.fulfill({headers,json:{...about,...body,revision:2}});});
 try{
  await f.page.goto('/admin-workspace/pages');const block=f.page.locator('.sb-cms-block-editor').first();
  await expect(block.getByRole('heading',{name:'Фотографии слайдера'})).toBeVisible();
  await block.locator('textarea').first().fill('Биография — обновлённый текст');
  await block.getByRole('button',{name:'Удалить фотографию 2'}).click();
  await f.page.getByLabel('Личная страница: Telegram',{exact:true}).fill('https://t.me/fixture_founder');
  await f.page.getByRole('button',{name:'Сохранить страницу',exact:true}).click();
  await expect(f.page.getByText('Страница сохранена.',{exact:false})).toBeVisible();
  expect(writes).toHaveLength(1);expect(writes[0].blocks[0]).toMatchObject({kind:'biography',body:'Биография — обновлённый текст',images:['/storefront/svetlana-portrait.png'],socials:{telegram:'https://t.me/fixture_founder'}});
  expect(f.errors).toEqual([]);expect(f.traffic.prohibitedWrites).toEqual([]);
 }finally{await f.context.close();}
});
