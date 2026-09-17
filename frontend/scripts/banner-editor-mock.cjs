/* Real compiled UI; private reads mocked; uploads/saves/deletes forbidden. */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{auditTypography}=require('./workspace-typography-audit.cjs');
const banners=[{id:'banner-a',title:'Первый баннер',subtitle:'',imageUrl:'/storefront/hero.jpg',mobileImageUrl:'',buttonLabel:'Перейти в каталог',linkUrl:'/catalog',isActive:true,sortOrder:0},{id:'banner-b',title:'Второй баннер',subtitle:'',imageUrl:'/storefront/brand-strip.jpg',mobileImageUrl:'',buttonLabel:'Подробнее',linkUrl:'/about',isActive:false,sortOrder:1}];
const fixtures=new Map([['/admin/storefront',{settings:{announcementText:'Проверка оформления'},banners,menuItems:[],socialLinks:[],categories:[]}]]);
async function main(){
 const output=path.resolve(__dirname,'../.screenshots/banner-editor');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const width of [1440,900,390,320]){
  const f=await isolatedContext(browser,width,false,false,{fixtures});
  try{
   await f.page.goto('http://127.0.0.1:3001/admin-workspace/appearance',{waitUntil:'domcontentloaded'});
   const rows=f.page.locator('.banner-admin-card');await rows.first().waitFor();assert.equal(await rows.count(),2);
   assert.equal(await rows.locator('input,textarea,select,.admin-media-picker').count(),0);
   const rowSizes=await rows.evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,width:el.clientWidth,scroll:el.scrollWidth,columns:getComputedStyle(el).gridTemplateColumns,children:[...el.children].map(child=>({class:child.className,width:child.getBoundingClientRect().width,right:child.getBoundingClientRect().right}))})));
   assert.ok(rowSizes.every(el=>el.height<=170&&el.scroll<=el.width+2),'Compact rows without clipping: '+JSON.stringify(rowSizes));
   await auditTypography(f.page);
   await f.page.screenshot({path:path.join(output,width+'-list.png')});
   if(width>=800)await rows.first().getByRole('button',{name:'Перетащить баннер',exact:true}).dragTo(rows.nth(1));
   else { await rows.nth(1).scrollIntoViewIfNeeded(); await f.page.evaluate(()=>{
    const rows=[...document.querySelectorAll('.banner-admin-card')],handle=rows[0].querySelector('button[draggable="true"]'),a=handle.getBoundingClientRect(),b=rows[1].getBoundingClientRect();
    handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:59,pointerType:'touch',clientX:a.left+20,clientY:a.top+20}));
    const options={bubbles:true,cancelable:true,pointerId:59,pointerType:'touch',clientX:b.left+b.width/2,clientY:b.top+b.height/2};document.dispatchEvent(new PointerEvent('pointermove',options));document.dispatchEvent(new PointerEvent('pointerup',options));
   }); }
   assert.equal(await rows.first().getAttribute('data-banner-id'),'banner-b');
   assert.equal(await f.page.locator('.workspace-sort-ghost').count(),0);
   assert.ok(await f.page.getByRole('button',{name:'Сохранить порядок',exact:true}).isVisible());
   await rows.first().getByRole('button',{name:'Настройки баннера 1',exact:true}).click();
   const dialog=f.page.getByRole('dialog',{name:'Настройки баннера',exact:true});await dialog.waitFor();
   assert.ok(await dialog.locator('.admin-dialog-body').evaluate(el=>el.clientHeight>100&&getComputedStyle(el).overflowY==='auto'));
   assert.ok(await dialog.locator('footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+2));
   await dialog.getByLabel('Описание изображения',{exact:true}).fill('Черновик без сохранения');
   assert.equal(await rows.first().locator('.banner-admin-summary strong').textContent(),'Второй баннер');
   await dialog.getByRole('button',{name:'Закрыть настройки баннера',exact:true}).click();assert.ok(await dialog.isVisible(),'Declined discard retains draft');
   await dialog.getByRole('button',{name:'Выбрать из библиотеки',exact:true}).first().click();
   const media=f.page.getByRole('dialog',{name:'Выбрать изображение',exact:true});await media.waitFor();
   assert.ok(await media.evaluate(el=>getComputedStyle(el.closest('.aml-backdrop')).zIndex>getComputedStyle(document.querySelector('.banner-editor-backdrop')).zIndex));
   await media.getByRole('button',{name:'Закрыть медиабиблиотеку',exact:true}).click();
   assert.equal(await dialog.getByLabel('Описание изображения',{exact:true}).inputValue(),'Черновик без сохранения');
   await auditTypography(f.page);
   await f.page.screenshot({path:path.join(output,width+'-settings.png')});
   f.page.removeAllListeners('dialog');f.page.once('dialog',event=>event.accept());
   await dialog.getByRole('button',{name:'Закрыть настройки баннера',exact:true}).click();await dialog.waitFor({state:'hidden'});
   await f.page.getByRole('button',{name:'Новый баннер',exact:true}).click();
   const fresh=f.page.getByRole('dialog',{name:'Новый баннер',exact:true});await fresh.waitFor();assert.equal(await rows.count(),2,'Empty new draft does not add a blocking list row');
   await fresh.getByRole('button',{name:'Закрыть настройки баннера',exact:true}).click();await fresh.waitFor({state:'hidden'});
   assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   for(const key of ['unknownReads','externalRequests','prohibitedWrites','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors,[]);
   console.log(width+': compact banner rows, '+(width<800?'touch':'mouse')+' reorder, isolated settings, media picker and discard guard PASS');
  }catch(error){await f.page.screenshot({path:path.join(output,width+'-failure.png')});throw error;}finally{await f.context.close();}
 }}finally{await browser.close();}
 console.log('4 rendered banner scenarios PASS. Actual API/DB writes: 0.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
