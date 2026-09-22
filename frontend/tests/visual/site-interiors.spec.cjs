/* Public reads only. Checkout/private endpoints never reach real services. */
const { test, expect } = require('@playwright/test');
const paths = ['/catalog','/catalog/gels','/catalog/gels/gel-muss-prozrachnyi-15-gr','/catalog/gift-card','/about','/contacts','/delivery','/privacy','/oferta','/returns','/favorites','/cart','/account','/login','/password-reset','/business-registration'];
for (const width of [1440,390,320]) for (const path of paths) test(`Unified public interior ${path} ${width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'}),errors=[],writes=[],external=[];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes.push(url.pathname);return route.fulfill({status:405,json:{message:'Read only visual QA'}});}
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){external.push(url.origin);return route.abort();}
  if(url.pathname==='/api/v1/cart')return route.fulfill({json:{items:[],total:0}});
  if(url.pathname==='/api/v1/storefront/favorites')return route.fulfill({json:[]});
  if(url.pathname.startsWith('/api/v1/')&&!/^\/api\/v1\/(products(?:\/|$)|seo(?:\/|$)|gift-cards\/product$)/.test(url.pathname))return route.fulfill({status:403,json:{message:'Private reads blocked'}});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto('http://127.0.0.1:3001'+path,{waitUntil:'networkidle'});expect(response.status()).toBe(200);await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  if(path==='/catalog'||path==='/catalog/gels'){
   await expect(page.locator('.sb-catalog-cover img')).toHaveCount(0);await expect(page.locator('.sb-catalog-cover h1')).toBeVisible();await expect(page.getByRole('navigation',{name:'Категории коллекции'})).toBeVisible();
   if(width<800){await page.getByRole('button',{name:'Фильтры и сортировка'}).click();await expect(page.getByRole('dialog',{name:'Фильтры каталога'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Фильтры каталога'})).toHaveCount(0);}
  }
  if(path==='/catalog/gift-card')await expect(page.locator('.sb-product-variant select')).toBeVisible();
  if(path==='/contacts'){await expect(page.locator('.sb-contact-form')).toBeVisible();await expect(page.locator('.sb-page-art--contacts,.sb-content-toc')).toHaveCount(0);for(const link of await page.locator('.sb-contact-cards a').all())await expect(link).toHaveAttribute('href',/^(tel:|mailto:)/);}
  if(path==='/delivery'){await expect(page.locator('.sb-page-art--delivery .sb-page-art__route')).toBeVisible();await expect(page.locator('.is-delivery .sb-content-actions a')).toHaveAttribute('href','/catalog');await expect(page.locator('.sb-page-art__parcel,.is-delivery .sb-content-toc')).toHaveCount(0);}
  for(const art of await page.locator('.sb-page-art__sheet,.sb-page-art__seal,.sb-page-art__parcel,.sb-empty > svg').all())expect(await art.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  if(['/about','/contacts','/delivery'].includes(path))expect(await page.locator('.sb-content-help').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(21, 21, 21)');
  if(path==='/login')expect(await page.locator('.sb-auth-intro > a b').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  if(path.includes('gel-muss'))expect(await page.locator('.sb-product-info').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  if(['/privacy','/oferta','/returns'].includes(path)){await expect(page.locator('.is-legal .sb-content-toc')).toBeVisible();expect(await page.locator('.is-legal .sb-content-block').count()).toBeGreaterThan(3);}
  expect(errors).toEqual([]);expect(writes).toEqual([]);expect(external).toEqual([]);
  await info.attach('interior',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 }finally{await context.close();}
});
