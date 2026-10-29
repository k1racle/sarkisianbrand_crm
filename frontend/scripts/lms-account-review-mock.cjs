/* Account review state: all data is synthetic, every API request is intercepted. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const origin = new URL(process.env.STOREFRONT_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const orders = [
  {id:'review',orderNumber:'SB-MOCK-REVIEW',sourceChannel:'COURSE',status:'PAYMENT_WAITING',paymentStatus:'SUCCEEDED',coursePaymentReview:true},
  {id:'legacy',orderNumber:'SB-MOCK-LEGACY',sourceChannel:'COURSE',status:'CANCELLED',paymentStatus:'SUCCEEDED'},
  {id:'ready',orderNumber:'SB-MOCK-READY',sourceChannel:'COURSE',status:'DELIVERED',paymentStatus:'SUCCEEDED'},
  {id:'blocked',orderNumber:'SB-MOCK-BLOCKED',sourceChannel:'COURSE',status:'NEW',paymentStatus:'UNPAID',coursePaymentBlocked:true},
].map(order => ({...order,createdAt:'2026-10-29T10:00:00.000Z',finalAmount:4500,items:[{id:'item',productName:'Курс',productType:'COURSE',quantity:1,price:4500,total:4500}]}));
async function main() {
  const browser = await chromium.launch();
  try {
    for (const width of [1440,390]) {
      const context = await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}), page = await context.newPage(), bad=[];
      await context.addCookies([{name:'sb-customer-token',value:'account-fixture-token',url:origin}]);
      page.on('pageerror', error => bad.push(error.message));
      await context.route('**/*', async route => {
        const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace(/^\/api\/v1/,'');
        if (url.pathname.startsWith('/api/v1/')) {
          const reply=json=>route.fulfill({json});
          if(endpoint==='/products/storefront-content')return reply({settings:{},categories:[],banners:[],socialLinks:[],menuItems:[]});
          if(endpoint==='/cart'||endpoint==='/storefront/cart/bind')return reply({items:[],total:0});
          if(endpoint==='/storefront/favorites')return reply([]);
          if(endpoint==='/auth/me'||endpoint==='/auth/profile')return reply({id:'fixture',role:'CUSTOMER_B2C',firstName:'Тест',email:'fixture@example.invalid'});
          if(endpoint==='/storefront/dashboard')return reply({summary:{orders:4,spent:0,favoriteCount:0},orders:orders.map(({coursePaymentBlocked,...row})=>row),loyalty:{isEligible:false},addresses:[],giftCards:[]});
          if(endpoint.startsWith('/storefront/orders/')) { const number=endpoint.split('/').at(-1),order=orders.find(row=>row.orderNumber===number); if(req.method()!=='GET'||!order){bad.push(`Unexpected order request ${req.method()} ${endpoint}`);return route.fulfill({status:403,json:{}});} return reply({...order,priceSnapshot:{coursePaymentReview:order.coursePaymentReview===true},history:[],payments:order.coursePaymentBlocked?[]:[{id:'payment',status:'SUCCEEDED',amount:4500}]}); }
          bad.push(`Unexpected ${req.method()} ${endpoint}`);return route.fulfill({status:403,json:{}});
        }
        if(url.origin!==origin || !['GET','HEAD'].includes(req.method())){bad.push(`Blocked external or write ${req.method()}`);return route.abort();}
        return route.continue();
      });
      try {
        await page.goto(`${origin}/account?tab=orders`,{waitUntil:'domcontentloaded'});
        const review=page.locator('.sa-order').filter({hasText:'SB-MOCK-REVIEW'}), legacy=page.locator('.sa-order').filter({hasText:'SB-MOCK-LEGACY'}), ready=page.locator('.sa-order').filter({hasText:'SB-MOCK-READY'});
        await review.waitFor();assert.match(await review.innerText(),/проверяем доступ/);assert.doesNotMatch(await review.innerText(),/Доступ открыт/);
        assert.match(await legacy.innerText(),/проверяем доступ/);assert.match(await ready.innerText(),/Доступ открыт/);
        await review.click();await page.getByText('Оплата подтверждена. Проверяем данные заказа перед открытием доступа',{exact:false}).waitFor();
        assert.equal(await page.getByRole('link',{name:'Проверить статус'}).getAttribute('href'),'/orders/SB-MOCK-REVIEW');
        assert.equal(await page.getByRole('button',{name:'Отменить заказ'}).count(),0);assert.equal(await page.getByRole('link',{name:'Перейти к оплате'}).count(),0);
        await page.getByRole('dialog').getByRole('button',{name:'Закрыть'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
        await page.locator('.sa-order').filter({hasText:'SB-MOCK-BLOCKED'}).click();await page.getByText('Оплата курса временно недоступна: требуется сверка данных.',{exact:false}).waitFor();
        assert.equal(await page.getByRole('link',{name:'Проверить статус'}).getAttribute('href'),'/orders/SB-MOCK-BLOCKED');assert.equal(await page.getByRole('button',{name:'Отменить заказ'}).count(),0);assert.equal(await page.getByRole('link',{name:'Перейти к оплате'}).count(),0);
        assert.deepEqual(bad,[]);console.log(`${width}px account: review/legacy/ready course order and drawer PASS`);
      } finally {await context.close();}
    }
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
