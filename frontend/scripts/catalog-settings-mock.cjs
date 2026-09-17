/* Real rendered editor interactions; all reads mocked, no saves/API writes. */
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const assert=require('node:assert/strict');
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{for(const width of [1440,900,390]){
    const f=await isolatedContext(browser,width,false);
    try{
      await f.page.goto('http://127.0.0.1:3001/admin-workspace/categories',{waitUntil:'domcontentloaded'});
      const rows=f.page.locator('.cs-category-row');await rows.first().waitFor();
      const first=await rows.first().getAttribute('data-category-id'),second=await rows.nth(1).getAttribute('data-category-id');
      if(width>=800)await rows.first().locator('.cs-grip').dragTo(rows.nth(1));
      else await f.page.evaluate(()=>{
        const rows=[...document.querySelectorAll('.cs-category-row')],handle=rows[0].querySelector('.cs-grip'),a=handle.getBoundingClientRect(),b=rows[1].getBoundingClientRect();
        handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:42,pointerType:'touch',clientX:a.left+20,clientY:a.top+20}));
        const options={bubbles:true,cancelable:true,pointerId:42,pointerType:'touch',clientX:b.left+b.width/2,clientY:b.top+b.height/2};document.dispatchEvent(new PointerEvent('pointermove',options));document.dispatchEvent(new PointerEvent('pointerup',options));
      });
      assert.equal(await rows.first().getAttribute('data-category-id'),second);assert.equal(await rows.nth(1).getAttribute('data-category-id'),first);
      await f.page.getByRole('button',{name:'Отменить порядок',exact:true}).click();assert.equal(await rows.first().getAttribute('data-category-id'),first);
      await f.page.getByRole('button',{name:'Добавить категорию',exact:true}).click();
      const dialog=f.page.getByRole('dialog',{name:'Новая категория'});await dialog.waitFor();
      assert.equal(await dialog.getByRole('button',{name:'Сохранить категорию',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(32, 33, 39)');
      assert.equal(await dialog.getByLabel('Родительская категория').locator('option').count(),5);
      assert.ok(await dialog.getByLabel('Описание',{exact:true}).isVisible());
      assert.ok(await dialog.getByRole('button',{name:'Выбрать из библиотеки'}).isVisible());
      await dialog.getByLabel('Название',{exact:true}).fill('Подкатегория');await dialog.getByLabel('Описание',{exact:true}).fill('Черновик');
      await f.page.getByRole('button',{name:'Закрыть категорию'}).click();assert.ok(await dialog.isVisible(),'Declined confirmation must retain the category draft');
      await f.page.screenshot({path:'.screenshots/workspace-audit/'+width+'-category-editor.png',fullPage:false});
      assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      assert.deepEqual(f.errors,[]);for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
      console.log(`${width}: category drag, hierarchy choices, media picker, retained draft PASS`);
    }finally{await f.context.close();}
    const b=await isolatedContext(browser,width,false);
    try{
      await b.page.goto('http://127.0.0.1:3001/admin-workspace/product-badges',{waitUntil:'domcontentloaded'});
      const row=b.page.locator('.cs-badge-row').first();await row.waitFor();
      await row.getByLabel('Текст бейджа').fill('Новинка клуба');
      await row.getByLabel('Цвет фона').fill('#554477');
      assert.equal(await row.locator('.cs-badge-preview').textContent(),'Новинка клуба');
      assert.equal(await row.locator('.cs-badge-preview').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(85, 68, 119)');
      await row.getByLabel('Условие показа').selectOption('manual');assert.equal(await row.getByLabel('Возраст товара, дней').count(),0);
      assert.ok(await b.page.getByRole('button',{name:'Сохранить бейджи'}).isEnabled());
      assert.equal(await b.page.getByRole('button',{name:'Сохранить бейджи'}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(32, 33, 39)');
      await b.page.screenshot({path:'.screenshots/workspace-audit/'+width+'-badge-editor.png',fullPage:false});
      assert.ok(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      assert.deepEqual(b.errors,[]);for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(b.traffic[key],[],key);
      console.log(`${width}: badge labels/colors/conditions preview and dirty-save state PASS`);
    }finally{await b.context.close();}
  }}finally{await browser.close();}
  console.log('6 mock-only browser cases PASS. Actual API writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
