/* Saved legacy photo addresses in the actual compiled UI. Private reads mocked. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {auditTypography}=require('./workspace-typography-audit.cjs');
const slugs=['gel-muss-prozrachnyi-15-gr','freza-almaznaya-shar-40-mm','gel-muss-kamufliruyushchiy-23','gel-skorostnoy-002-30-ml','nozhnitsy-pro-levsha'];
const products=slugs.map((slug,i)=>({id:'legacy-preview-'+i,slug,sku:'PREVIEW-'+i,nameRu:'Проверка фотографии '+i,productType:'PHYSICAL',isActive:true,basePrice:100,images:[{id:'photo-'+i,url:'/catalog/'+slug+'.jpg',sortOrder:0}],variants:[{id:'variant-'+i,price:100,stock:1,reserved:0,isActive:true}],categories:[]}));
const fixtures=new Map([['/admin/products',products],['/admin/products/list',{items:products,total:products.length,page:1,limit:24}]]);
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const width of [1440,390]){
  const f=await isolatedContext(browser,width,false,false,{fixtures});
  try{
   await f.page.goto('http://127.0.0.1:3001/admin-workspace/products',{waitUntil:'domcontentloaded'});
   const rows=f.page.locator('.products-table .row:not(.head)');await rows.first().waitFor();
   assert.equal(await rows.count(),5);
   const images=f.page.locator('.cs-product-identity>img');assert.equal(await images.count(),4);
   for(const image of await images.all())await image.evaluate(el=>el.decode());
   assert.ok(await images.evaluateAll(els=>els.every(el=>el.naturalWidth>0&&el.naturalHeight>0)));
   assert.equal(await rows.last().locator('[aria-label="Нет фотографии товара"]').count(),1);
   assert.equal(await f.page.locator('img[src^="/catalog/"]').count(),0);
   await rows.first().locator('.product-open').click();await f.page.getByRole('tab',{name:/Изображения/}).click();
   const preview=f.page.locator('.editor-drawer .image-preview img');await preview.evaluate(el=>el.decode());
   assert.ok(await preview.evaluate(el=>el.naturalWidth>0));
   assert.equal(await f.page.getByRole('button',{name:'Сохранить',exact:true}).isEnabled(),true);
   assert.equal(await f.page.locator('.editor-subtitle').textContent(),'Проверка фотографии 0','Preview must not dirty the draft');
   await auditTypography(f.page);
   for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[]);
   assert.deepEqual(f.errors,[]);
   console.log(width+': four existing legacy photos decoded; missing photo placeholder and unchanged editor draft PASS');
  }finally{await f.context.close();}
 }}finally{await browser.close();}
 console.log('Legacy product previews PASS. Actual API/DB writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
