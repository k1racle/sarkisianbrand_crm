/* Actual local public catalog/page reads only. No auth/private API/provider calls.
 * SSR public reads are performed by the already-running frontend, not intercepted.
 */
const {test,expect}=require('@playwright/test');
for(const width of [1440,390])for(const route of ['/','/catalog/gift-card','/catalog/gels']){
 test(`Public storefront ${route} ${width}`,async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'});
  const writes=[],external=[],errors=[];
  await context.route('**/*',async interception=>{
   const request=interception.request(),url=new URL(request.url());
   if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes.push(url.pathname);return interception.fulfill({status:405,json:{message:'Read-only visual QA'}});}
   const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
   if(!loopback){external.push(url.origin);return interception.abort('blockedbyclient');}
   if(url.pathname==='/api/v1/cart')return interception.fulfill({json:{items:[],total:0}});
   if(url.pathname==='/api/v1/storefront/favorites')return interception.fulfill({json:[]});
   if(url.pathname.startsWith('/api/v1/')&&!/^\/api\/v1\/(products(?:\/|$)|gift-cards\/product$|seo(?:\/|$))/.test(url.pathname))return interception.fulfill({status:403,json:{message:'Private API blocked'}});
   return interception.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await page.goto('http://localhost:3001'+route,{waitUntil:'networkidle'});expect(response.status()).toBe(200);
   await page.evaluate(()=>document.fonts.ready);
   await expect(page.locator('.sb-storefront h1').first()).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
   // Employee 20px heading scale must not leak into the public page.
   expect(await page.locator('.sb-storefront h1').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(20);
   if(route==='/catalog/gift-card')await expect(page.locator('.sb-product-variant select')).toBeVisible();
   expect(errors).toEqual([]);expect(writes).toEqual([]);expect(external).toEqual([]);
   await testInfo.attach('visual',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  }finally{await context.close();}
 });
}
