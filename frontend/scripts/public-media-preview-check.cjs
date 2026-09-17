/* Real local public image GETs; all private lists use fixtures. No uploads or writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
async function main(){
  const url=new URL(process.env.MEDIA_PREVIEW_TEST_URL);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:','Local public image only');
  assert.match(url.pathname,/^\/api\/v1\/media\/files\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/);
  assert.ok(!url.username&&!url.password&&!url.search&&!url.hash);
  const response=await fetch(url);
  assert.equal(response.status,200);
  const mime=response.headers.get('content-type');assert.match(mime,/^image\/(jpeg|png|webp|avif)$/);
  const asset={id:'preview-check',url:url.pathname,originalName:'preview-check-image',mime,size:(await response.arrayBuffer()).byteLength,createdAt:'2026-09-17T10:00:00Z'};
  const product={id:'preview-product',nameRu:'Проверка превью',productType:'PHYSICAL',isActive:true,price:100,stock:1,categoryIds:[],purposes:[],features:[],images:[{url:asset.url,alt:'Проверка превью'}],variants:[{price:100,stock:1}]};
  const fixtures=new Map([['/media',{items:[asset],total:1,page:1,limit:24}],['/admin/products',[product]],['/admin/products/list',{items:[product],total:1,page:1,limit:24}]]);
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  let requests=0;
  try{for(const width of [1440,390]){
    const f=await isolatedContext(browser,width,false,false,{fixtures});
    try{
      // Bypass only the generated PUBLIC image fixture, keeping its actual HTTP headers.
      await f.context.route(url.href,route=>{
        assert.equal(route.request().method(),'GET');assert.equal(route.request().headers().authorization,undefined);requests++;return route.continue();
      });
      const loaded=async selector=>{
        const image=f.page.locator(selector).first();await image.waitFor();
        await image.evaluate(el=>el.decode());
        assert.ok(await image.evaluate(el=>el.complete&&el.naturalWidth>0&&el.naturalHeight>0));
      };
      await f.page.goto('http://127.0.0.1:3001/media-library',{waitUntil:'domcontentloaded'});
      await loaded('.aml-grid img');
      await f.page.goto('http://127.0.0.1:3001/admin-workspace/products',{waitUntil:'domcontentloaded'});
      await loaded('.cs-product-identity img');
      await f.page.locator('.product-open').first().click();
      await f.page.getByRole('tab',{name:/Изображения/}).click();
      await loaded('.editor-drawer .image-card img');
      await f.page.getByRole('button',{name:'Выбрать из библиотеки',exact:true}).first().click();
      await loaded('.aml-panel .aml-grid img');
      for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
      assert.deepEqual(f.errors,[]);
      console.log(width+': real image decoded in media library, products, gallery and picker PASS');
    }finally{await f.context.close();}
  }}finally{await browser.close();}
  assert.equal(response.headers.get('cross-origin-resource-policy'),'cross-origin');
  assert.ok(requests>=4,'Actual public image requests were exercised');
  console.log('Actual public image headers/browser decoding PASS. Private reads mocked; writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
