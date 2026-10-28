const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const out=path.resolve(__dirname,'../.screenshots/studio-expanded');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('studio-assets'))missing.push(r.url())});
  await page.goto('http://localhost:3001/studio',{waitUntil:'domcontentloaded'});await page.locator('.at-loading').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Начать приём',exact:true}).first().click();await page.locator('.at-preparation-board').waitFor();
  assert.equal(await page.locator('.at-treatment-steps li').count(),9);
  await page.getByRole('button',{name:'К выбору дизайна',exact:true}).isDisabled().then(v=>assert.ok(v));
  if(width>=900){await page.getByRole('button',{name:'Фреза «Кукуруза»',exact:true}).click();await page.locator('.at-keyboard-prep').isDisabled().then(v=>assert.ok(v));}
  await page.screenshot({path:path.join(out,`${width}-preparation.png`),fullPage:true});
  for(const tool of ['Салфетка','Фреза «Кукуруза»','Пушер','Фреза «Пламя»','Ножницы','Фреза «Шар»','Пилка','Баф','База']){
   await page.getByRole('button',{name:tool,exact:true}).click();
   for(let n=0;n<30;n++)await page.locator('.at-keyboard-prep').click();
  }
  assert.equal(await page.locator('.at-treatment-steps .complete').count(),9);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.at-loading').waitFor({state:'hidden'});await page.getByRole('button',{name:'Продолжить',exact:true}).first().click();
  assert.equal(await page.locator('.at-treatment-steps .complete').count(),9);
  await page.getByRole('button',{name:'К выбору дизайна',exact:true}).click();assert.equal(await page.locator('.at-pattern-grid button').count(),18);
  assert.equal(await page.locator('.at-expanded-palette button').count(),38);
  await page.getByRole('button',{name:'Пудровый нюд',exact:true}).click();await page.getByRole('button',{name:'Френч',exact:true}).click();
  await page.getByRole('button',{name:'Нанести на все пять ногтей',exact:true}).click();
  await page.screenshot({path:path.join(out,`${width}-palette.png`),fullPage:true});
  await page.getByRole('button',{name:'К финальному штриху',exact:true}).click();
  for(const name of ['Закрепить топ','Завершить полимеризацию','Нанести масло'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByTestId('complete-order').click();await page.locator('.at-dialog[open]').waitFor();
  await page.screenshot({path:path.join(out,`${width}-result.png`),fullPage:true});await page.locator('.at-dialog .at-close').click();
  await page.getByRole('button',{name:'Мой образ',exact:true}).click();await page.locator('.kw-options').waitFor();
  await page.getByRole('button',{name:'Макияж',exact:true}).click();await page.getByRole('button',{name:'Помада: Красный',exact:true}).click();
  await page.getByRole('button',{name:'Детали',exact:true}).click();await page.getByRole('button',{name:'Кошачьи',exact:true}).click();
  await page.getByRole('button',{name:'Волосы',exact:true}).click();assert.equal(await page.locator('.kw-hair-grid .kw-choice').count(),8);await page.getByRole('button',{name:'Два пучка',exact:true}).click();
  await page.getByRole('button',{name:'Одежда',exact:true}).click();await page.getByRole('button',{name:'Фартук мастера',exact:true}).click();
  await page.screenshot({path:path.join(out,`${width}-wardrobe.png`),fullPage:true});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать PNG',exact:true}).click();await (await download).saveAs(path.join(out,`${width}-look.png`));
  await page.getByRole('button',{name:'Сохранить образ',exact:true}).click();
  await page.getByRole('button',{name:'Награды',exact:true}).click();await page.locator('.at-reward-offers article').first().waitFor();assert.equal(await page.locator('.at-reward-offers article').count(),3);
  await page.screenshot({path:path.join(out,`${width}-rewards.png`),fullPage:true});
  const metrics=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(metrics.scroll<=metrics.w+2,JSON.stringify(metrics));assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(`PASS ${width}: preparation, reload, design, finish, wardrobe PNG, rewards, no overflow or asset errors`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
