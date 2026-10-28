// Isolated browser with synthetic API reads. Never uses a live CRM session.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin = new URL(process.env.ADMIN_DESIGN_URL || process.env.WORKSPACE_DESIGN_URL || 'http://127.0.0.1:3001').origin;
process.env.ADMIN_DESIGN_URL = origin;
process.env.WORKSPACE_DESIGN_URL = origin;
const { chromium } = require('playwright-core');
const browserOptions = require('./crm-test-browser.cjs');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: rich } = require('./crm-rich-fixtures.cjs');
const { measures } = require('./workspace-design-review.cjs');
const output = path.resolve(__dirname, '../.screenshots/crm-day-workspace');
fs.mkdirSync(output, { recursive: true });
const start=new Date();start.setHours(10,30,0,0);
const end=new Date(+start+30*60000);
const meeting={id:'40000000-0000-4000-8000-000000000001',title:'Планирование поставки',kind:'MEETING',startsAt:start.toISOString(),endsAt:end.toISOString(),location:'Офис · переговорная',meetingUrl:'',organizerId:'mock-admin',organizer:{id:'mock-admin',firstName:'Анна',lastName:'Соколова',isActive:true},members:[{id:'qa-colleague',isActive:true,response:'PENDING'}],canManage:false,canRespond:true,myResponse:'PENDING',responses:{accepted:0,pending:1,declined:0},status:'SCHEDULED',timezone:'Europe/Moscow',version:1};
const cases=[];
(async()=>{
  const browser=await chromium.launch(browserOptions);
  try{
    for(const scenario of [{width:1440,theme:'light'},{width:1440,theme:'dark'},{width:390,theme:'light'},{width:390,theme:'dark'},{width:1440,theme:'light',fail:'/crm/dashboard'},{width:1440,theme:'light',fail:'/crm/tasks'},{width:1440,theme:'light',fail:'/crm/meetings'},{width:1440,theme:'light',restricted:true}]){
      const fixtures=new Map(rich);
      fixtures.set('/crm/dashboard',{...fixtures.get('/crm/dashboard'),overdueTasks:1,dueToday:0});
      fixtures.set('/crm/meetings',{items:[meeting],total:1,pages:1,page:1,canCreate:true});
      if(scenario.restricted){const current=fixtures.get('/auth/access');fixtures.set('/auth/access',{...current,permissions:current.permissions.filter(p=>!p.startsWith('meetings.')&&!p.startsWith('work_time.'))});}
      const f=await isolatedContext(browser,scenario.width,false,false,{fixtures});
      if(scenario.fail)await f.context.route('**/api/v1'+scenario.fail+'*',route=>route.fulfill({status:503,json:{message:'Проверка отдельного отказа раздела'}}));
      await f.context.addCookies([{name:'sarkisian-crm-theme',value:scenario.theme,url:process.env.ADMIN_DESIGN_URL}]);
      try{
        const p=f.page;await p.goto(process.env.ADMIN_DESIGN_URL+'/crm/',{waitUntil:'networkidle'});
        await p.locator('.crm-day-page h1').waitFor();
        await p.waitForFunction(()=>!document.querySelector('.crm-day-page [aria-busy="true"]'));
        await p.evaluate(()=>document.fonts.ready);
        await p.addStyleTag({content:'#nuxt-devtools-container{display:none!important}'});
        assert.equal(await p.locator('.crm-day-page h1').innerText(),'Мой день');
        if(scenario.fail==='/crm/dashboard'){
          assert.ok(await p.locator('.crm-day-action').count()>0,'Dashboard failure must not hide task queue');
          assert.ok(await p.locator('.crm-day-meeting').count()>0,'Dashboard failure must not hide calendar');
          assert.ok(await p.locator('.crm-day-results [role=alert]').count()>0);
        }else if(scenario.fail==='/crm/tasks'){
          assert.ok(await p.locator('.crm-day-meeting').count()>0,'Tasks failure must not hide calendar');
          assert.equal(await p.locator('.crm-day-result-grid article').count(),4,'Tasks failure must not hide sales metrics');
          assert.ok(await p.locator('.crm-day-queue [role=alert]').count()>0);
        }else if(scenario.fail==='/crm/meetings'){
          assert.ok(await p.locator('.crm-day-action').count()>0,'Calendar failure must not hide task queue');
          assert.equal(await p.locator('.crm-day-result-grid article').count(),4,'Calendar failure must not hide sales metrics');
          assert.ok(await p.locator('.crm-day-agenda [role=alert]').count()>0);
        }else{
          assert.ok(await p.locator('.crm-day-action').count()>0,'Real fixture tasks rendered');
          assert.equal(await p.locator('.crm-day-result-grid article').count(),4);
        }
        if(scenario.restricted){assert.equal(await p.locator('.crm-day-agenda').count(),0);assert.ok(!f.traffic.mockedReads.includes('/crm/meetings'),'No calendar read without permission');assert.ok(!f.traffic.mockedReads.includes('/crm/work-time/current'),'No work-time read without permission');}
        else{if(scenario.fail!=='/crm/meetings')assert.equal(await p.locator('.crm-day-meeting').count(),1);assert.equal(await p.locator('.crm-day-week button').count(),0,'Read-only week does not imply fake date filtering');}
        const taskLink=p.locator('.crm-day-action-target a[href*="task="]').first();
        if(await taskLink.count())assert.match(await taskLink.getAttribute('href'),/\/crm\/tasks\?task=/);
        const first=p.locator('.crm-day-action').first();const bounds=await first.boundingBox();assert.ok(bounds.y<420,'First task must appear early');
        const summary=p.locator('.crm-day-create summary');if(await summary.count()){await summary.click();await p.getByRole('navigation',{name:'Создание в CRM'}).waitFor();await p.keyboard.press('Tab');assert.ok(await p.locator('.crm-day-create nav a').count()>0);await summary.click();}
        const measured=await measures(p);
        assert.ok(measured.scrollWidth<=scenario.width+2,'No page horizontal overflow');
        assert.deepEqual(measured.contrast.filter(item=>!item.hasImage),[],'Readable text on solid surfaces');
        assert.deepEqual(f.errors.filter(error=>!(scenario.fail&&error.includes('503 (Service Unavailable)'))),[],'No unexpected browser errors');
        assert.deepEqual(f.traffic.unknownReads,[],'Every API read uses a known isolated fixture');
        assert.deepEqual(f.traffic.prohibitedWrites,[],'No API mutations');
        const name=`${scenario.width}-${scenario.theme}-${scenario.fail?.split('/').pop()|| (scenario.restricted?'restricted':'day')}`;
        await p.screenshot({path:path.join(output,name+'.png'),fullPage:true});
        cases.push({...scenario,name,...measured,traffic:f.traffic,errors:f.errors});
        console.log(name+' PASS');
      }finally{await f.context.close();}
    }
  }finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(cases,null,2));}
  console.log(JSON.stringify({output,cases:cases.length,contrast:cases.flatMap(c=>c.contrast.filter(x=>!x.hasImage)),unexpectedErrors:cases.flatMap(c=>c.errors.filter(e=>!(c.fail&&e.includes('503 (Service Unavailable)')))),unknownReads:[...new Set(cases.flatMap(c=>c.traffic.unknownReads))]},null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
