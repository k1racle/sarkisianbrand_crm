// Isolated UI/DTO/recurrence acceptance. No real API writes, people or schedules.
require('../../backend/node_modules/reflect-metadata');
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {isolatedContext}=require('./admin-design-mock.cjs'),{fixtures}=require('./crm-rich-fixtures.cjs'),{assertWidth,assertTypography}=require('./crm-workspace-smoke.cjs');
const {plainToInstance}=require('../../backend/node_modules/class-transformer'),{validate}=require('../../backend/node_modules/class-validator');
const {CreateWorkPatternDto,WorkPatternActionDto}=require('../../backend/dist/src/work-schedule/work-schedule.dto');
const {patternDays,addDays,patternLabels,workPatternFields}=require('../../backend/dist/src/work-schedule/work-pattern.policy');
async function main(){
  const browser=await chromium.launch(require('./crm-test-browser.cjs')),output=path.resolve(__dirname,'../.screenshots/crm-work-patterns');fs.mkdirSync(output,{recursive:true});
  try{for(const width of [390,1440]){
    const person={id:'51000000-0000-4000-8000-000000000001',firstName:'Анна',lastName:'Волкова',canAssign:true},patterns=[],writes=[];
    let readonly=false,conflict=false,acceptDialog=false;
    const f=await isolatedContext(browser,width,false,false,{fixtures:new Map(fixtures),allowFixtureForms:true}),p=f.page;
    p.removeAllListeners('dialog');p.on('dialog',async d=>{if(acceptDialog){acceptDialog=false;await d.accept();}else await d.dismiss();});
    const view=row=>({...row,label:patternLabels[row.pattern],today:'2026-09-24',canPublish:!readonly&&row.status==='DRAFT',canEnd:!readonly&&row.status==='PUBLISHED',canCancel:!readonly&&row.status==='DRAFT'});
    await p.route('**/api/v1/crm/work-schedule**',async route=>{
      const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/work-schedule','');
      const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});const send=(value,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
      if(req.method()==='GET'){
        if(endpoint==='/options')return send({people:[{...person,canAssign:!readonly}],departments:[]});
        if(endpoint.startsWith('/patterns/')){const row=patterns.find(row=>'/patterns/'+row.id===endpoint);assert.ok(row);return send(view(row));}
        assert.equal(endpoint,'','Virtual rows must open their pattern, not a UUID-only manual route');
        const month=url.searchParams.get('month'),start=month+'-01',[year,m]=month.split('-').map(Number),end=new Date(Date.UTC(year,m+0,1)).toISOString().slice(0,10);
        const items=patterns.filter(row=>row.status!=='CANCELLED').flatMap(row=>patternDays(row,addDays(start,-1),addDays(end,-1)).items.filter(item=>item.startLocal<end+'T00:00'&&item.endLocal>start+'T00:00').map(item=>({...item,id:'pattern:'+row.id+':'+item.occurrenceDate,patternId:row.id,patternLabel:patternLabels[row.pattern],employee:person,employeeId:person.id,departmentName:'Продажи',status:row.status,version:row.version})));
        return send({items,patterns:patterns.map(view),warnings:[],totals:{entries:items.length,draftMinutes:0,publishedMinutes:items.reduce((sum,row)=>sum+row.plannedMinutes,0)},canCreate:!readonly,canPublishPatterns:!readonly});
      }
      assert.equal(readonly,false);const body=req.postDataJSON(),action=endpoint.endsWith('/action');assert.deepEqual(await validate(plainToInstance(action?WorkPatternActionDto:CreateWorkPatternDto,body),{whitelist:true,forbidNonWhitelisted:true}),[],'Real backend DTO');writes.push({endpoint,body});
      if(endpoint==='/patterns/preview'){const fields=workPatternFields(body),to=addDays(fields.startDate,34),result=patternDays(fields,fields.startDate,to);return send({...result,items:result.items.map(row=>({...row,overridden:false})),from:fields.startDate,to,permanent:!fields.endDate,label:patternLabels[fields.pattern]},201);}
      if(conflict){conflict=false;return send({message:'График изменён другим сотрудником. Обновите данные.'},409);}
      if(endpoint==='/patterns'){const row={...body,...workPatternFields(body),id:'51000000-0000-4000-8000-000000000002',employee:person,departmentName:'Продажи',version:1,events:[{version:1,action:'PUBLISH',actorName:'Руководитель',reason:'Назначен постоянный график',createdAt:'2026-09-24T10:00:00Z'}]};patterns.push(row);return send(view(row),201);}
      assert.ok(action);const row=patterns.find(row=>endpoint==='/patterns/'+row.id+'/action');assert.ok(row);assert.equal(body.version,row.version);assert.equal(body.action,'END');row.endDate=body.endDate;row.version++;row.events.unshift({version:row.version,action:'END',actorName:'Руководитель',reason:body.reason,createdAt:'2026-09-24T11:00:00Z'});return send(view(row),201);
    });
    try{
      const style=el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.color];};
      await p.goto('http://127.0.0.1:3001/crm/',{waitUntil:'networkidle'});const heading=await p.locator('h1').evaluate(style);
      await p.goto('http://127.0.0.1:3001/crm/work-schedule',{waitUntil:'networkidle'});await p.getByRole('tab',{name:'Шаблоны',exact:true}).click();await p.getByRole('button',{name:'Применить шаблон',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.waitFor();
      const box=await dialog.boundingBox();assert.ok(Math.abs(box.x+box.width-width)<2);assert.ok(box.width<=722);
      assert.ok(await dialog.getByRole('button',{name:'Применить график',exact:true}).isDisabled());
      await dialog.getByLabel('Дата начала',{exact:true}).fill('2026-09-24');await dialog.getByLabel('Последний день (необязательно)',{exact:true}).fill('');
      for(const pattern of ['WEEKDAYS','CYCLE_5_2','CYCLE_2_2','CYCLE_3_3']){
        await dialog.getByLabel('Шаблон графика').selectOption(pattern);assert.ok(await dialog.getByRole('button',{name:'Применить график',exact:true}).isDisabled());await dialog.getByRole('button',{name:'Предпросмотр',exact:true}).click();await dialog.getByRole('region',{name:'Предпросмотр шаблона'}).waitFor();assert.equal(writes.at(-1).body.pattern,pattern);assert.equal(writes.at(-1).body.endDate,null);
      }
      await dialog.getByLabel('Шаблон графика').selectOption('CYCLE_2_2');await dialog.getByLabel('Начало смены',{exact:true}).fill('22:00');await dialog.getByLabel('Окончание смены',{exact:true}).fill('06:00');await dialog.getByLabel('Перерыв, минут').fill('30');await dialog.getByRole('button',{name:'Предпросмотр',exact:true}).click();await dialog.getByRole('region',{name:'Предпросмотр шаблона'}).waitFor();
      for(const button of await dialog.locator('.crm-detail-footer button').all())assert.ok(Math.abs((await button.boundingBox()).height-44)<1);
      await p.screenshot({path:path.join(output,`preview-${width}.png`)});
      conflict=true;acceptDialog=true;await dialog.getByRole('button',{name:'Применить график',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Шаблон графика').inputValue(),'CYCLE_2_2');
      await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.ok(await dialog.isVisible());acceptDialog=true;await dialog.getByRole('button',{name:'Применить график',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(patterns.length,1);assert.equal(patterns[0].endDate,null);
      await p.getByRole('button',{name:'Открыть шаблон Анна Волкова, 2026-09-24',exact:true}).waitFor();assert.deepEqual(await p.locator('h1').evaluate(style),heading);await assertWidth(p);await assertTypography(p);
      await p.getByRole('tab',{name:'График',exact:true}).click();await p.getByRole('button',{name:'27 сентября: 0 сотрудников',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'27 сентября: 0 сотрудников',exact:true}).locator('small').count(),0);
      await p.getByRole('button',{name:'26 сентября: 1 сотрудник',exact:true}).waitFor(); // End of the preceding night shift, not the rest record.
      await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await p.screenshot({path:path.join(output,`calendar-${width}.png`),fullPage:true});
      await p.getByLabel('Месяц',{exact:true}).fill('2050-06');await p.getByLabel('Месяц',{exact:true}).blur();await p.getByRole('button',{name:/Открыть график.*2050-06/}).first().waitFor();assert.ok(await p.getByRole('button',{name:/Открыть график/}).count()>10);
      await p.getByRole('button',{name:/Открыть график/}).first().click();await dialog.waitFor();assert.ok(await dialog.getByLabel('Дата начала',{exact:true}).isDisabled());
      await dialog.getByRole('tab',{name:'История изменений',exact:true}).click();await dialog.getByRole('heading',{name:'История изменений',exact:true}).waitFor();assert.ok(await dialog.getByText('Назначен постоянный график',{exact:true}).isVisible());await dialog.getByRole('tab',{name:'Общее',exact:true}).click();
      await dialog.getByLabel('Последний день этого графика').fill('2026-09-30');await dialog.getByRole('button',{name:'Завершить график',exact:true}).click();await dialog.getByRole('alert').waitFor();await dialog.getByLabel('Причина изменения').fill('Меняем режим работы');acceptDialog=true;await dialog.getByRole('button',{name:'Завершить график',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(patterns[0].endDate,'2026-09-30');assert.equal(await p.getByRole('button',{name:/Открыть график/}).count(),0);
      readonly=true;await p.getByRole('tab',{name:'Шаблоны',exact:true}).click();await p.getByRole('button',{name:'Открыть шаблон Анна Волкова, 2026-09-24',exact:true}).click();await dialog.waitFor();assert.equal(await dialog.getByRole('button',{name:'Завершить график',exact:true}).count(),0);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await p.getByRole('button',{name:'Применить шаблон',exact:true}).count(),0);
      for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);assert.deepEqual(f.errors.filter(e=>!/^console: Failed to load resource: the server responded with a status of 409/.test(e)),[]);
      console.log(`${width}px permanent patterns PASS: all four modes/preview invalidation, night shift, right drawer/44px, apply/409/draft, future month, virtual-to-pattern card/history, termination, readonly; no real writes.`);
    }catch(error){console.error({traffic:f.traffic,errors:f.errors,alerts:await p.locator('[role=alert]').allTextContents()});throw error;}finally{await f.context.close();}
  }}finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
