const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const out=path.resolve(__dirname,'../.screenshots/studio-anatomy');fs.mkdirSync(out,{recursive:true});
const steps=['clean','remove','push','pocket','cut','polish','shape','buff','base'];
function stateFor(kind,stage='clean'){
 const progress=Object.fromEntries(steps.slice(0,steps.indexOf(stage)).map(id=>[id,[100,100,100,100,100]]));
 const tool={clean:'wipe',push:'pusher',pocket:'flame',shape:'file'}[stage];
 return {version:1,work:{serial:null,design:{kind,nails:Array.from({length:5},()=>({color:null,pattern:'plain'}))},prepared:[],stage:'prepare',accuracy:null,supply:null,preparation:{technique:'combined',tool,progress}}};
}
async function progressOf(page,step){return page.evaluate(id=>JSON.parse(localStorage.getItem('sarkisian.studio.v1')).work.preparation.progress[id]?.[0]??0,step)}
async function point(page,plate){return page.locator('.at-prep-zone-hit').evaluate((el,plate)=>{const box=el.getBBox(),point=plate?new DOMPoint(box.x+box.width/2,box.y+box.height/2):el.getPointAtLength(el.getTotalLength()*.5),p=new DOMPoint(point.x,point.y).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y}},plate)}
async function pixel(page,buffer,x,y){return page.evaluate(async({image,x,y})=>{const img=new Image();img.src='data:image/png;base64,'+image;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return Array.from(c.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3)},{image:buffer.toString('base64'),x,y})}
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const kind of (process.argv.includes('--export-only')?[]:['manicure','pedicure']))for(const stage of ['clean','push','pocket','shape']){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await ctx.addInitScript(s=>localStorage.setItem('sarkisian.studio.v1',JSON.stringify(s)),stateFor(kind,stage));await p.goto('http://localhost:3001/studio',{waitUntil:'domcontentloaded'});await p.locator('.at-nav>button').nth(1).click();await p.locator('.at-keyboard-prep:enabled').waitFor();
  const image=await p.locator('.at-photo-canvas>image').getAttribute('href');assert.ok(image.endsWith(kind==='manicure'?'hand-realistic-v1.png':'foot-realistic-v1.png'));
  const a=await point(p,stage==='clean');for(let i=0;i<3;i++){await p.mouse.click(a.x,a.y);await p.waitForTimeout(140)}await p.waitForFunction(id=>(JSON.parse(localStorage.getItem('sarkisian.studio.v1')).work.preparation.progress[id]?.[0]??0)>=54,stage);
  const before=await progressOf(p,stage);await p.mouse.click(5,5);assert.equal(await progressOf(p,stage),before);
  await p.getByRole('button',{name:'Приблизить ноготь',exact:true}).click();assert.ok(Number((await p.locator('.at-photo-canvas').getAttribute('viewBox')).split(' ')[2])<1448);const b=await point(p,stage==='clean');await p.mouse.click(b.x,b.y);await p.waitForFunction(({id,before})=>(JSON.parse(localStorage.getItem('sarkisian.studio.v1')).work.preparation.progress[id]?.[0]??0)>before,{id:stage,before});
  if(stage==='clean'){await p.locator('.at-photo-preparation').screenshot({path:path.join(out,`${kind}-closeup.png`)});await p.getByRole('button',{name:kind==='pedicure'?'Вся стопа':'Вся рука',exact:true}).click();await p.getByRole('button',{name:'Ноготь 5',exact:true}).click();assert.match(await p.locator('.at-anatomy-toolbar').textContent(),/Большой палец/);await p.locator('.at-hand-column').screenshot({path:path.join(out,`${kind}-overview.png`)});}
  assert.deepEqual(errors,[]);console.log(`PASS ${kind}/${stage}: pointer hits registered photo zone, zoom uses same coordinates, other areas do not process the nail`);await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage(),designs=['manicure','pedicure'].map((kind,i)=>({id:'photo-'+i,name:'Фотографический пример '+kind,createdAt:new Date().toISOString(),kind,shape:'almond',length:'natural',nails:Array.from({length:5},()=>({color:'emerald',pattern:'french',finish:'glossy',accentColor:'porcelain'}))}));await ctx.addInitScript(designs=>localStorage.setItem('sarkisian.studio.v1',JSON.stringify({version:1,designs})),designs);await p.goto('http://localhost:3001/studio',{waitUntil:'domcontentloaded'});await p.locator('.at-nav>button').nth(3).click();assert.equal(await p.locator('.at-design-card .nail-art').count(),2);await p.locator('.at-gallery-grid .nail-art').first().scrollIntoViewIfNeeded();await p.waitForTimeout(200);const location=await p.locator('.at-gallery-grid .nail-art').first().evaluate(el=>{const p=new DOMPoint(728,110).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y}}),live=await pixel(p,await p.screenshot(),location.x,location.y);assert.ok(live[1]>live[0]*1.25,'Photographic lighting desaturated the selected green: '+live);await p.locator('.at-gallery-grid').screenshot({path:path.join(out,'photo-portfolio.png')});await p.locator('.at-design-card').first().click();const download=p.waitForEvent('download');await p.locator('dialog[open]').getByRole('button',{name:/Скачать/}).click();await (await download).saveAs(path.join(out,'photographic-manicure.png'));const saved=await pixel(p,fs.readFileSync(path.join(out,'photographic-manicure.png')),728,110);assert.ok(Math.hypot(...live.map((v,i)=>v-saved[i]))<45,'Live/export nail colors differ: '+live+' / '+saved);await ctx.close();console.log('PASS: photographic portfolio, accurate green polish and matching PNG export');
 if(!process.argv.includes('--export-only'))for(const kind of ['manicure','pedicure']){
  const ctx=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();
  await ctx.addInitScript(s=>localStorage.setItem('sarkisian.studio.v1',JSON.stringify(s)),stateFor(kind));
  await p.goto('http://localhost:3001/studio',{waitUntil:'domcontentloaded'});await p.locator('.at-nav>button').nth(1).click();await p.locator('.at-keyboard-prep:enabled').waitFor();
  for(let i=0;i<5;i++){
   await p.locator('.at-photo-canvas').scrollIntoViewIfNeeded();
   const target=await p.locator('.at-prep-nail-hit').nth(i).evaluate(el=>{const b=el.getBBox(),p=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y}});
   await p.mouse.click(target.x,target.y);await p.waitForTimeout(150);await p.mouse.click(target.x,target.y);await p.waitForTimeout(150);
   assert.ok(await p.evaluate(i=>(JSON.parse(localStorage.getItem('sarkisian.studio.v1')).work.preparation.progress.clean?.[i]??0)>0,i),`${kind}: mobile finger ${i+1} is not reachable`);
  }
  await p.locator('.at-anatomy-toolbar button').click();
  assert.ok(Number((await p.locator('.at-photo-canvas').getAttribute('viewBox')).split(' ')[2])<1448);
  const bounds=await p.locator('.at-photo-canvas').evaluate(el=>{const canvas=el.getBoundingClientRect(),container=el.closest('.at-hand-art').getBoundingClientRect();return {top:canvas.top-container.top,bottom:container.bottom-canvas.bottom}});
  assert.ok(bounds.top>=0&&bounds.bottom>=0,`The enlarged ${kind} nail is clipped by its mobile container: ${JSON.stringify(bounds)}`);
  await p.locator('.at-photo-preparation').screenshot({path:path.join(out,`${kind}-mobile-thumb.png`)});
  const metrics=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(metrics.scroll<=metrics.width+2,JSON.stringify(metrics));
  await ctx.close();console.log(`PASS ${kind}: all five photo nails remain reachable at 390px, thumb zoom and no horizontal overflow`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
