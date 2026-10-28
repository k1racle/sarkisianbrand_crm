/* Employee widget preferences, real Vue UI and isolated read-only API fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin=new URL(process.env.ADMIN_DESIGN_URL||process.env.WORKSPACE_DESIGN_URL||'http://127.0.0.1:3001').origin;
process.env.ADMIN_DESIGN_URL=origin; process.env.WORKSPACE_DESIGN_URL=origin;
const {chromium}=require('playwright-core');
const {isolatedContext}=require('./admin-design-mock.cjs');
const {fixtures:rich}=require('./crm-rich-fixtures.cjs');
const {measures}=require('./workspace-design-review.cjs');
const output=path.resolve(__dirname,'../.screenshots/crm-day-widgets');
fs.mkdirSync(output,{recursive:true});
const actorA={id:'widget-employee-a',firstName:'Анна',lastName:'Соколова',role:'ADMIN',email:'employee-a@example.invalid'};
const actorB={id:'widget-employee-b',firstName:'Борис',lastName:'Иванов',role:'ADMIN',email:'employee-b@example.invalid'};
const ids=['queue','calendar','results','clock','funnel','interactions','shortcuts'];
const widths=[8,4,12,12,6,6,12];
const defaults=()=>ids.map((id,index)=>({id,width:widths[index],visible:true}));
const key=actor=>`sarkisian-crm-day-widgets:v1:${encodeURIComponent(actor.id)}`;
const envelope=widgets=>JSON.stringify({version:1,widgets});
const order=page=>page.locator('.crm-day-widgets>[data-day-widget]').evaluateAll(nodes=>nodes.map(node=>node.dataset.dayWidget));
const widget=(page,id)=>page.locator(`.crm-day-widgets>[data-day-widget="${id}"]`);
const edit=async page=>{await page.getByRole('button',{name:'Настроить вид',exact:true}).click();await page.locator('.crm-day-editor').waitFor();};
const action=(page,label)=>page.locator('.crm-day-editor').getByRole('button',{name:label,exact:true}).click();
async function ready(page){await page.locator('.crm-day-page h1').waitFor();await page.waitForFunction(()=>!document.querySelector('.crm-day-page [aria-busy="true"]'));await page.evaluate(()=>document.fonts.ready);}
async function open(browser,width=1440,options={}){const f=await isolatedContext(browser,width,false,false,{fixtures:new Map(rich),actor:actorA,preserveDayWidgets:true,...options});if(options.theme)await f.context.addCookies([{name:'sarkisian-crm-theme',value:options.theme,url:origin}]);await f.page.goto(origin+'/crm/',{waitUntil:'networkidle'});await ready(f.page);return f;}
async function layoutChecks(page){
  const result=await page.evaluate(()=>({target:parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--crm-control-height")),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.crm-day-widget-tools button,.crm-day-widget-tools select')].map(node=>{const r=node.getBoundingClientRect();return{label:node.getAttribute('aria-label'),width:r.width,height:r.height};}),clipped:[...document.querySelectorAll('[data-day-widget] button,[data-day-widget] select,[data-day-widget] a')].filter(node=>{const r=node.getBoundingClientRect(),frame=node.closest('[data-day-widget]').getBoundingClientRect();return r.width>0&&(r.right>frame.right+2||r.left<frame.left-2);}).map(node=>({text:node.textContent?.trim(),class:node.className}))}));
  assert.ok(result.scrollWidth<=result.width+2,'Widget editor must not overflow page');
  assert.ok(result.controls.every(control=>control.width>=result.target-.5&&control.height>=result.target-.5),'Widget controls follow selected density; touch targets remain44px');
  assert.deepEqual(result.clipped,[],'Narrow widget widths do not clip controls');
  const measured=await measures(page);assert.deepEqual(measured.contrast.filter(item=>!item.hasImage),[],'Widget editor text remains readable');
  return result;
}
const results=[];
(async()=>{
  const browser=await chromium.launch(require('./crm-test-browser.cjs'));
  try{
    for(const width of [1440,390]){
      const f=await open(browser,width),p=f.page;
      try{
        assert.deepEqual(await order(p),ids);
        await edit(p);
        const calendarGrip=widget(p,'calendar').locator('.crm-day-widget-grip');
        await calendarGrip.focus();await p.keyboard.press('Alt+ArrowUp');
        assert.equal((await order(p))[0],'calendar','Keyboard move changes actual DOM order');
        await widget(p,'queue').getByRole('combobox').selectOption('12');
        if(width===1440){await widget(p,'clock').getByRole('combobox').selectOption('6');await widget(p,'results').getByRole('combobox').selectOption('6');await widget(p,'funnel').getByRole('combobox').selectOption('4');}
        await widget(p,'interactions').getByRole('button',{name:'Скрыть: Последние контакты',exact:true}).click();
        assert.equal(await widget(p,'interactions').count(),0);
        await layoutChecks(p);
        await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(output,`${width}-editor.png`),fullPage:true});
        await action(p,'Сохранить');await ready(p);
        const savedOrder=await order(p);
        assert.equal(await widget(p,'queue').getAttribute('data-width'),'12');
        assert.match(await p.locator('.crm-day-layout-notice').innerText(),/в этом браузере/);
        const stored=await p.evaluate(key=>localStorage.getItem(key),key(actorA));
        assert.equal(JSON.parse(stored).version,1);
        await p.reload({waitUntil:'networkidle'});await ready(p);
        assert.deepEqual(await order(p),savedOrder,'Saved employee layout survives reload');
        assert.equal(await widget(p,'queue').getAttribute('data-width'),'12');
        await edit(p);await widget(p,'queue').getByRole('combobox').selectOption('6');
        await widget(p,'calendar').getByRole('button',{name:'Скрыть: Календарь на сегодня',exact:true}).click();
        await action(p,'Отмена');
        assert.deepEqual(await order(p),savedOrder,'Cancel restores visibility and order');
        assert.equal(await widget(p,'queue').getAttribute('data-width'),'12','Cancel restores width');
        await edit(p);await action(p,'Стандартный вид');assert.deepEqual(await order(p),ids);await action(p,'Отмена');
        assert.deepEqual(await order(p),savedOrder,'Reset remains a cancellable draft');
        await edit(p);await action(p,'Стандартный вид');await action(p,'Сохранить');await p.reload({waitUntil:'networkidle'});await ready(p);assert.deepEqual(await order(p),ids);
        await edit(p);
        if(width===1440){await p.evaluate(()=>scrollTo(0,0));await widget(p,'calendar').locator('.crm-day-widget-grip').dragTo(widget(p,'queue').locator('.crm-day-widget-grip'));assert.equal((await order(p))[0],'calendar','Native drag/drop changes actual order');}
        else{await widget(p,'calendar').getByRole('button',{name:'Выше: Календарь на сегодня',exact:true}).click();assert.equal((await order(p))[0],'calendar','Touch alternative moves a widget');}
        await layoutChecks(p);await action(p,'Отмена');
        assert.deepEqual(f.traffic.prohibitedWrites,[]);
        assert.deepEqual(f.traffic.unknownReads,[]);
        results.push({name:`${width}-edit-save-reload-cancel-reset-reorder`,traffic:f.traffic,errors:f.errors});
      }finally{await f.context.close();}
    }
    {
      const f=await open(browser,390,{theme:'dark'}),p=f.page;
      try{await edit(p);await layoutChecks(p);await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(output,'390-dark-editor.png'),fullPage:true});await action(p,'Отмена');results.push({name:'dark-mobile-editor-contrast-and-controls',traffic:f.traffic,errors:f.errors});}
      finally{await f.context.close();}
    }
    for(const width of [320,1440]){
      const fixtures=new Map(rich);fixtures.set('/crm/dashboard',{...fixtures.get('/crm/dashboard'),forecast:999999999999,wonMonth:{amount:9999999999,count:6}});
      const f=await open(browser,width,{fixtures}),p=f.page;
      try{
        if(width===1440){await edit(p);await widget(p,'results').getByRole('combobox').selectOption('6');await action(p,'Сохранить');await ready(p);}
        const overflow=await p.locator('.crm-day-result-grid article>strong').evaluateAll(nodes=>nodes.filter(node=>{const range=document.createRange();range.selectNodeContents(node);const text=range.getBoundingClientRect(),card=node.parentElement.getBoundingClientRect();return text.left<card.left-1||text.right>card.right+1;}).map(node=>node.textContent));
        assert.deepEqual(overflow,[],'Large monetary values stay fully inside their widget metric');await layoutChecks(p);
        results.push({name:`${width}-large-money-narrow-widget`,traffic:f.traffic,errors:f.errors});
      }finally{await f.context.close();}
    }
    {
      const f=await open(browser),p=f.page;
      try{
        const layout=defaults();layout.find(widget=>widget.id==='calendar').visible=false;
        await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:key(actorA),raw:envelope(layout)});
        await f.context.route('**/api/v1/crm/meetings*',route=>route.fulfill({status:503,json:{message:'Проверка недоступного календаря'}}));
        await p.reload({waitUntil:'networkidle'});await ready(p);
        assert.equal(await widget(p,'calendar').count(),0);assert.ok(await p.locator('.crm-day-action').count()>0);
        assert.match(await p.locator('.crm-day-queue [role=alert]').innerText(),/приглашения/);
        assert.equal(await p.locator('.crm-day-queue [role=alert]').getByRole('button',{name:'Повторить',exact:true}).count(),1);
        results.push({name:'hidden-calendar-invitation-failure-remains-visible-in-queue',traffic:f.traffic,errors:f.errors.filter(error=>!error.includes('503 (Service Unavailable)'))});
      }finally{await f.context.close();}
    }
    {
      const f=await open(browser),p=f.page;
      try{
        await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:key(actorA),raw:envelope(defaults().map(widget=>({...widget,visible:false})))});
        const offset=f.traffic.mockedReads.length;
        await p.reload({waitUntil:'networkidle'});await ready(p);
        assert.equal(await p.locator('[data-day-widget]').count(),0);await p.getByRole('heading',{name:'Рабочий стол свободен'}).waitFor();
        const hiddenReads=f.traffic.mockedReads.slice(offset);
        for(const endpoint of ['/crm/dashboard','/crm/tasks','/crm/meetings','/crm/work-time/current'])assert.ok(!hiddenReads.includes(endpoint),`Hidden widgets do not fetch ${endpoint}`);
        await edit(p);await p.locator('.crm-day-widget-catalog').getByLabel('Результаты продаж',{exact:true}).check();
        assert.equal(await widget(p,'results').locator('.crm-day-widget-pending').count(),1,'Newly shown draft widget waits for save');
        assert.ok(!f.traffic.mockedReads.slice(offset).includes('/crm/dashboard'),'Draft does not fetch hidden business data');
        await action(p,'Сохранить');await ready(p);assert.equal(await p.locator('.crm-day-result-grid article').count(),4);
        results.push({name:'hidden-widgets-skip-api-and-load-after-save',hiddenReads,traffic:f.traffic,errors:f.errors});
      }finally{await f.context.close();}
    }
    {
      const f=await open(browser),p=f.page;
      try{
        await p.evaluate(key=>localStorage.setItem(key,'{broken'),key(actorA));await p.reload({waitUntil:'networkidle'});await ready(p);
        assert.deepEqual(await order(p),ids);assert.match(await p.locator('.crm-day-layout-warning').innerText(),/восстановленный вид/);
        await edit(p);await action(p,'Сохранить');assert.equal(await p.locator('.crm-day-layout-warning').count(),0);
        assert.equal(JSON.parse(await p.evaluate(key=>localStorage.getItem(key),key(actorA))).widgets.length,7);
        await p.evaluate(key=>{const originalGet=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key.startsWith('sarkisian-crm-day-widgets:v1:'))throw new DOMException('Blocked fixture preference storage','SecurityError');return originalGet.call(this,key);};window.dispatchEvent(new StorageEvent('storage',{key,storageArea:localStorage}));},key(actorA));
        await p.waitForFunction(()=>document.querySelector('.crm-day-layout-warning')?.textContent.includes('прочитать'));
        await p.evaluate(()=>{const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('sarkisian-crm-day-widgets:v1:'))throw new DOMException('Blocked fixture preference storage','QuotaExceededError');return originalSet.call(this,key,value);};});
        await edit(p);await widget(p,'calendar').getByRole('button',{name:'Скрыть: Календарь на сегодня',exact:true}).click();await action(p,'Сохранить');
        assert.equal(await p.locator('.crm-day-editor').count(),0);assert.equal(await widget(p,'calendar').count(),0);
        assert.match(await p.locator('.crm-day-layout-warning').innerText(),/не разрешил сохранить/);
        results.push({name:'malformed-recovery-and-blocked-storage',traffic:f.traffic,errors:f.errors});
      }finally{await f.context.close();}
    }
    {
      const f=await open(browser),p=f.page;let currentActor=actorA;
      try{
        const layoutA=defaults();layoutA[0].width=12;layoutA[4].visible=false;
        const layoutB=defaults();layoutB.unshift(...layoutB.splice(3,1));layoutB.find(widget=>widget.id==='calendar').visible=false;
        await p.evaluate(({a,b,keyA,keyB})=>{localStorage.setItem(keyA,a);localStorage.setItem(keyB,b);},{a:envelope(layoutA),b:envelope(layoutB),keyA:key(actorA),keyB:key(actorB)});
        await f.context.route('**/api/v1/auth/me',route=>route.fulfill({json:currentActor}));
        await p.reload({waitUntil:'networkidle'});await ready(p);assert.equal(await widget(p,'queue').getAttribute('data-width'),'12');
        await edit(p);await widget(p,'queue').getByRole('combobox').selectOption('6');
        // networkidle may already be reached before the asynchronous online
        // handler starts its request. Gate this exact permission response so
        // we inspect the protected pending state and then the confirmed grant.
        let releaseAccess;
        const accessGate=new Promise(resolve=>{releaseAccess=resolve;});
        await f.context.route('**/api/v1/auth/access',async route=>{await accessGate;await route.fulfill({json:rich.get('/auth/access')});});
        const accessRequest=p.waitForRequest(request=>new URL(request.url()).pathname.endsWith('/api/v1/auth/access')&&request.method()==='GET');
        const accessResponse=p.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/api/v1/auth/access')&&response.request().method()==='GET');
        await p.evaluate(()=>{window.__widgetPermissionRecheckPage=document.querySelector('.crm-day-page');window.dispatchEvent(new Event('online'));});
        try{
          await accessRequest;
          await p.waitForFunction(()=>{const page=window.__widgetPermissionRecheckPage;return page?.isConnected&&page===document.querySelector('.crm-day-page')&&page.closest('[inert]')&&page.closest('[style*=none]')&&!document.querySelector('.crm-day-editor');});
          assert.equal(await p.evaluate(()=>window.__widgetPermissionRecheckPage===document.querySelector('.crm-day-page')),true,'Pending access recheck retains the checked page instance while hiding its UI');
        }finally{releaseAccess();}
        await accessResponse;await p.locator('.crm-day-editor').waitFor();
        assert.equal(await p.evaluate(()=>window.__widgetPermissionRecheckPage?.isConnected&&window.__widgetPermissionRecheckPage===document.querySelector('.crm-day-page')),true,'A confirmed grant does not remount the employee page');
        assert.equal(await p.locator('.crm-day-editor').count(),1,'A routine access recheck preserves the same employee draft');
        assert.equal(await widget(p,'queue').getByRole('combobox').inputValue(),'6');
        const switchUser=async actor=>{currentActor=actor;await p.evaluate(actor=>{const name='sarkisian-workspace-session',current=JSON.parse(localStorage.getItem(name)||'null'),value=JSON.stringify({version:1,revision:crypto.randomUUID(),token:current?.token||localStorage.getItem('sarkisian-workspace-token')||'',refreshToken:current?.refreshToken||'',user:actor});localStorage.setItem(name,value);localStorage.setItem('sarkisian-workspace-user',JSON.stringify(actor));window.dispatchEvent(new StorageEvent('storage',{key:name,newValue:value,storageArea:localStorage}));},actor);await p.waitForFunction(()=>!document.querySelector('.crm-day-editor'));await ready(p);};
        await switchUser(actorB);await p.waitForFunction(()=>document.querySelector('.crm-day-widgets>[data-day-widget]')?.getAttribute('data-day-widget')==='clock');
        assert.equal(await widget(p,'calendar').count(),0,'B has its own visibility preferences');
        await switchUser(actorA);await p.waitForFunction(()=>document.querySelector('[data-day-widget=queue]')?.getAttribute('data-width')==='12');
        assert.equal(await widget(p,'funnel').count(),0,'A saved state returns; B and unsaved drafts do not leak');
        assert.equal(await p.evaluate(key=>localStorage.getItem(key),key(actorA)),envelope(layoutA));
        assert.equal(await p.evaluate(key=>localStorage.getItem(key),key(actorB)),envelope(layoutB));
        let restricted=true;const permissions=rich.get('/auth/access').permissions;
        await f.context.route('**/api/v1/auth/access',route=>route.fulfill({json:{permissions:restricted?permissions.filter(permission=>!permission.startsWith('meetings.')&&!permission.startsWith('work_time.')):permissions}}));
        const offset=f.traffic.mockedReads.length;await p.reload({waitUntil:'networkidle'});await ready(p);
        assert.equal(await widget(p,'calendar').count(),0);assert.equal(await widget(p,'clock').count(),0);
        assert.ok(!f.traffic.mockedReads.slice(offset).includes('/crm/meetings'));assert.ok(!f.traffic.mockedReads.slice(offset).includes('/crm/work-time/current'));
        restricted=false;await p.reload({waitUntil:'networkidle'});await ready(p);assert.equal(await widget(p,'calendar').count(),1,'Restored permissions retain saved layout');
        assert.equal(await p.evaluate(key=>localStorage.getItem(key),key(actorA)),envelope(layoutA),'Role changes do not overwrite hidden preferences');
        results.push({name:'same-browser-employee-session-and-role-isolation',traffic:f.traffic,errors:f.errors});
      }finally{await f.context.close();}
    }
  }finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));}
  for(const result of results){assert.deepEqual(result.traffic.prohibitedWrites,[]);assert.deepEqual(result.traffic.unknownReads,[]);assert.deepEqual(result.errors,[]);}
  console.log(JSON.stringify({output,cases:results.map(result=>result.name),passed:results.length,actualApiWrites:0},null,2));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
