/* Local drafts only. Every private read is mocked and all writes are forbidden. */
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const assert=require('node:assert/strict');
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{for(const width of [1440,390]){
    const f=await isolatedContext(browser,width,false);
    try{
      await f.page.goto('http://127.0.0.1:3001/admin-workspace/catalog-menu',{waitUntil:'domcontentloaded'});
      const rows=f.page.locator('.sb-cma-list[aria-label="Порядок категорий"]>.sb-cma-row');
      await rows.first().waitFor();
      const before=await rows.first().getAttribute('data-category-id');
      const target=await rows.nth(1).getAttribute('data-category-id');
      assert.equal(await f.page.getByRole('button',{name:/^(Выше|Ниже)$/}).count(),0);
      assert.equal(await rows.first().locator(':scope>:first-child').getAttribute('class'),'sb-cma-order');
      if(width>=800)await rows.first().locator('.sb-cma-drag-handle').dragTo(rows.nth(1));
      else{
        await rows.nth(1).scrollIntoViewIfNeeded();
        await f.page.evaluate(()=>{
          const rows=[...document.querySelectorAll('.sb-cma-list[aria-label="Порядок категорий"]>.sb-cma-row')];
          const handle=rows[0].querySelector('.sb-cma-drag-handle'),a=handle.getBoundingClientRect(),b=rows[1].getBoundingClientRect();
          handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:27,pointerType:'touch',clientX:a.left+20,clientY:a.top+20}));
          const options={bubbles:true,cancelable:true,pointerId:27,pointerType:'touch',clientX:b.left+b.width/2,clientY:b.top+b.height/2};
          document.dispatchEvent(new PointerEvent('pointermove',options));
          document.dispatchEvent(new PointerEvent('pointerup',options));
        });
      }
      await f.page.waitForTimeout(100);
      assert.equal(await rows.first().getAttribute('data-category-id'),target,'Drag commits only the local category order');
      assert.equal(await rows.nth(1).getAttribute('data-category-id'),before);
      assert.equal(await f.page.locator('.workspace-sort-ghost').count(),0);
      assert.deepEqual(f.errors,[]);
      for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
      console.log(`${width}: first drag column, no up/down buttons, ${width<800?'touch':'native desktop'} local reorder PASS`);
    }finally{await f.context.close();}
    const appearance=await isolatedContext(browser,width,false);
    try{
      await appearance.page.goto('http://127.0.0.1:3001/admin-workspace/appearance',{waitUntil:'domcontentloaded'});
      const card=appearance.page.locator('.banner-admin-card').first();await card.waitFor();
      assert.equal(await card.locator(':scope>:first-child').getAttribute('class'),'appearance-order-tools');
      assert.equal(await appearance.page.getByRole('button',{name:/^(Выше|Ниже)$/}).count(),0);
      assert.equal(await card.locator('input,textarea,select,.admin-media-picker').count(),0,'Settings do not occupy the sortable list');
      const handle=await card.locator('.appearance-order-tools').boundingBox(),summary=await card.locator('.banner-admin-summary').boundingBox();
      assert.ok(handle.x+handle.width<=summary.x,'Handle lives in a separate first column');
      assert.ok(await appearance.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      assert.deepEqual(appearance.errors,[]);assert.deepEqual(appearance.traffic.prohibitedWrites,[]);
      console.log(`${width}: banner handle outside image/form, separate first column PASS`);
    }finally{await appearance.context.close();}
  }}finally{await browser.close();}
  console.log('4 mock-only browser cases PASS. Real API writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
