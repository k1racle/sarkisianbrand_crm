// Real built local UI, isolated API fixtures validated with compiled backend DTO/policy.
require('../../backend/node_modules/reflect-metadata');
const { chromium } = require('playwright-core'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs'), { fixtures } = require('./crm-rich-fixtures.cjs'), { assertWidth, assertTypography } = require('./crm-workspace-smoke.cjs');
const { plainToInstance } = require('../../backend/node_modules/class-transformer'), { validate } = require('../../backend/node_modules/class-validator');
const { CreateScheduleDto, UpdateScheduleDto, ScheduleTransitionDto } = require('../../backend/dist/src/work-schedule/work-schedule.dto');
const { scheduleFields } = require('../../backend/dist/src/work-schedule/work-schedule.policy');
async function main() {
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), output = path.resolve(__dirname, '../.screenshots/crm-work-schedule'); fs.mkdirSync(output, { recursive:true });
  try { for (const width of [390,1440]) {
    const person = { id:'51000000-0000-4000-8000-000000000001', firstName:'Анна', lastName:'Волкова', departmentId:'51000000-0000-4000-8000-000000000002', canAssign:true };
    const seed = { id:'51000000-0000-4000-8000-000000000003', employee:person, employeeId:person.id, departmentName:'Продажи', kind:'SHIFT', startLocal:'2026-09-24T22:00', endLocal:'2026-09-25T06:00', timezone:'Europe/Moscow', breakMinutes:30, plannedMinutes:450, note:'Ночная смена', status:'PUBLISHED', version:1, events:[{version:1,action:'PUBLISHED',actorName:'Руководитель',reason:'Согласовано',createdAt:'2026-09-24T10:00:00Z'}] };
    const records = [{...seed}], writes = []; let failList = false, conflict = false, readonly = false, acceptDialog = false;
    const f = await isolatedContext(browser,width,false,false,{fixtures:new Map(fixtures),allowFixtureForms:true}), p = f.page;
    p.removeAllListeners('dialog'); p.on('dialog',async dialog => {if(acceptDialog){acceptDialog=false;await dialog.accept();}else await dialog.dismiss();});
    const view = row => ({...row,canEdit:!readonly&&row.status==='DRAFT',canPublish:!readonly&&row.status==='DRAFT',canCancel:!readonly&&row.status!=='CANCELLED'});
    await p.route('**/api/v1/crm/work-schedule**',async route => {
      const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/work-schedule','');
      const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3001','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});const send=(value,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
      if(req.method()==='GET') {
        if(endpoint==='/options')return send({people:[{...person,canAssign:!readonly}],departments:[{id:person.departmentId,name:'Продажи'}]});
        if(endpoint){const row=records.find(row=>'/'+row.id===endpoint);assert.ok(row);return send(view(row));}
        if(failList)return send({message:'Не удалось загрузить графики.'},503);
        assert.equal(url.searchParams.get('month'),'2026-09');const state=url.searchParams.get('status');
        const items=records.filter(row=>state?row.status===state:row.status!=='CANCELLED');
        return send({items:items.map(view),totals:{entries:items.length,draftMinutes:items.filter(row=>row.status==='DRAFT').reduce((sum,row)=>sum+row.plannedMinutes,0),publishedMinutes:items.filter(row=>row.status==='PUBLISHED').reduce((sum,row)=>sum+row.plannedMinutes,0)},canCreate:!readonly});
      }
      assert.equal(readonly,false);const body=req.postDataJSON(),dto=endpoint.endsWith('/status')?ScheduleTransitionDto:req.method()==='PATCH'?UpdateScheduleDto:CreateScheduleDto;
      assert.deepEqual(await validate(plainToInstance(dto,body),{whitelist:true,forbidNonWhitelisted:true}),[],'Real backend DTO');writes.push({endpoint,body});
      if(conflict){conflict=false;return send({message:'График изменён. Обновите карточку.'},409);}
      if(!endpoint){const row={...seed,...body,...scheduleFields(body),id:'51000000-0000-4000-8000-000000000004',status:'DRAFT',version:1,events:[]};records.push(row);return send(view(row),201);}
      const row=records.find(row=>endpoint.startsWith('/'+row.id));assert.ok(row);assert.equal(row.version,body.version);
      if(endpoint.endsWith('/status'))row.status=body.status;else Object.assign(row,body,scheduleFields(body));
      row.version++;row.events.unshift({version:row.version,action:body.status||'UPDATE',actorName:'Руководитель',reason:body.reason,createdAt:'2026-09-24T11:00:00Z'});
      return send(view(row),endpoint.endsWith('/status')?201:200);
    });
    try {
      const style=el=>{const css=getComputedStyle(el);return [css.fontFamily,css.fontSize,css.fontWeight,css.color];};
      await p.goto('http://127.0.0.1:3001/crm/',{waitUntil:'networkidle'});const heading=await p.locator('h1').evaluate(style);
      await p.goto('http://127.0.0.1:3001/crm/work-schedule',{waitUntil:'networkidle'});await p.getByRole('button',{name:/Открыть график Анна/}).waitFor();
      await assertWidth(p);await assertTypography(p);assert.deepEqual(await p.locator('h1').evaluate(style),heading);assert.equal(await p.locator('.crm-month-day').count(),30);
      assert.equal(await p.getByRole('button',{name:'Обновить',exact:true}).evaluate(el=>getComputedStyle(el).fontWeight),'600');
      assert.ok(await p.getByRole('tab',{name:'График',exact:true}).getAttribute('aria-selected') === 'true');
      assert.equal(await p.getByRole('heading',{name:'Повторяющиеся графики',exact:true}).isVisible(),false);
      assert.equal(await p.locator('.crm-month-grid').getByText(/шт\./).count(),0);
      await p.getByRole('button',{name:'25 сентября: 1 сотрудник',exact:true}).click();assert.equal(await p.getByRole('button',{name:/Открыть график Анна/}).count(),1);await p.getByRole('button',{name:'Все даты',exact:true}).click();
      records.push({...seed,id:'rest',kind:'DAY_OFF',startLocal:'2026-09-26T00:00',endLocal:'2026-09-27T00:00',plannedMinutes:0},
        {...seed,id:'absent',kind:'ABSENCE',employeeId:'away',startLocal:'2026-09-26T00:00',endLocal:'2026-09-27T00:00',plannedMinutes:0},
        {...seed,id:'split',startLocal:'2026-09-25T14:00',endLocal:'2026-09-25T18:00',breakMinutes:0,plannedMinutes:240},
        {...seed,id:'second-person',employeeId:'ivan',employee:{...person,id:'ivan',firstName:'Иван',lastName:'Петров'}},
        {...seed,id:'draft-person',employeeId:'draft',employee:{...person,id:'draft',firstName:'Мария',lastName:'Чернова'},status:'DRAFT'});
      await p.getByRole('button',{name:'Обновить',exact:true}).click();
      const restDay=p.getByRole('button',{name:'26 сентября: 0 сотрудников',exact:true});await restDay.waitFor();assert.equal(await restDay.locator('small').count(),0);await restDay.click();
      await p.getByRole('heading',{name:'Рабочих смен по этим условиям нет',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:/Открыть график/}).count(),0);
      const restToggle=p.getByRole('checkbox',{name:'Показывать выходные и отсутствия в списке',exact:true});await restToggle.check();assert.equal(await p.getByRole('button',{name:/Открыть график/}).count(),2);assert.equal(await restDay.locator('small').count(),0);await restToggle.uncheck();
      await p.getByRole('button',{name:'25 сентября: 3 сотрудника',exact:true}).click();
      await p.getByRole('tab',{name:'Кто на смене',exact:true}).click();await p.getByLabel('Дата смены',{exact:true}).fill('2026-09-25');await p.getByLabel('Дата смены',{exact:true}).blur();
      await p.getByRole('heading',{name:'25 сентября · 2 сотрудника',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:/Открыть график Анна/}).count(),2);assert.equal(await p.getByRole('button',{name:/Открыть график Иван/}).count(),1);assert.equal(await p.getByRole('button',{name:/Открыть график Мария/}).count(),0);assert.equal(await p.locator('.crm-month-grid').count(),0);
      await assertWidth(p);await p.screenshot({path:path.join(output,`on-shift-${width}.png`),fullPage:true});
      await p.getByLabel('Дата смены',{exact:true}).fill('2026-09-26');await p.getByLabel('Дата смены',{exact:true}).blur();await p.getByRole('heading',{name:'На эту дату смены не назначены',exact:true}).waitFor();
      await p.getByRole('tab',{name:'Шаблоны',exact:true}).click();await p.getByRole('heading',{name:'Повторяющиеся графики',exact:true}).waitFor();assert.equal(await p.locator('.crm-month-grid').count(),0);assert.equal(await p.getByRole('heading',{name:'Доступные графики',exact:true}).count(),0);assert.equal(await p.getByLabel('Месяц',{exact:true}).count(),0);await assertWidth(p);
      await p.screenshot({path:path.join(output,`patterns-tab-${width}.png`),fullPage:true});
      await p.getByRole('tab',{name:'График',exact:true}).click();await p.getByRole('button',{name:'25 сентября: 3 сотрудника',exact:true}).waitFor();
      records.push(...Array.from({length:108},(_,index)=>({...seed,id:'bulk-'+index,employeeId:'bulk-'+index,employee:{...person,id:'bulk-'+index}})));
      await p.getByRole('button',{name:'Обновить',exact:true}).click();const manyPeople=p.getByRole('button',{name:'25 сентября: 111 сотрудников',exact:true});await manyPeople.waitFor();
      assert.ok(await manyPeople.evaluate(el=>{const count=el.querySelector('.crm-month-count');return count.scrollWidth<=el.clientWidth&&count.getBoundingClientRect().right<=el.getBoundingClientRect().right;}),'People count stays inside the calendar cell');
      records.splice(1);await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('button',{name:'25 сентября: 1 сотрудник',exact:true}).waitFor();
      if(width===1440){const y=await p.getByRole('form',{name:'Фильтры графика'}).locator('input,select,button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));assert.ok(Math.max(...y)-Math.min(...y)<2);}
      await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await p.screenshot({path:path.join(output,`calendar-${width}.png`),fullPage:true});
      await p.getByRole('button',{name:'Новая запись',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.waitFor();
      const box=await dialog.boundingBox();assert.ok(Math.abs(box.x+box.width-width)<2);assert.ok(box.width<=722);
      await dialog.getByLabel('Начало смены').fill('2026-09-27T09:00');await dialog.getByLabel('Окончание смены').fill('2026-09-27T18:00');
      for(const button of await dialog.locator('.crm-detail-footer button').all())assert.ok(Math.abs((await button.boundingBox()).height-44)<1);
      await p.screenshot({path:path.join(output,`drawer-${width}.png`)});
      await dialog.getByRole('button',{name:'Сохранить черновик',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(records[1].plannedMinutes,480);
      const openNew=()=>p.getByRole('button',{name:'Открыть график Анна Волкова, 2026-09-27T09:00',exact:true}).click();
      await openNew();await dialog.getByLabel('Примечание').fill('Обновление смены');await dialog.getByLabel('Причина изменения').fill('Уточнение условий');conflict=true;
      await dialog.getByRole('button',{name:'Сохранить черновик',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('Примечание').inputValue(),'Обновление смены');
      await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.ok(await dialog.isVisible());await dialog.getByRole('button',{name:'Сохранить черновик',exact:true}).click();await dialog.waitFor({state:'hidden'});
      await openNew();await dialog.getByRole('button',{name:'Опубликовать',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(writes.at(-1).body.status,undefined);
      await dialog.getByLabel('Причина изменения').fill('Утверждён график');acceptDialog=true;await dialog.getByRole('button',{name:'Опубликовать',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(records[1].status,'PUBLISHED');
      await openNew();assert.ok(await dialog.getByLabel('Начало смены').isDisabled());await dialog.getByRole('tab',{name:'История изменений',exact:true}).click();await dialog.getByRole('heading',{name:'История изменений'}).waitFor();assert.ok(await dialog.getByText('Утверждён график',{exact:true}).isVisible());
      await dialog.getByRole('tab',{name:'Общее',exact:true}).click();await dialog.getByLabel('Причина изменения').fill('Перенос на другую дату');acceptDialog=true;await dialog.getByRole('button',{name:'Отменить запись',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(records[1].status,'CANCELLED');
      await p.getByRole('button',{name:'Отменённые',exact:true}).click();await p.getByRole('button',{name:/Открыть график Анна/}).waitFor();assert.equal(await p.getByRole('button',{name:/Открыть график Анна/}).count(),1);
      readonly=true;await p.getByRole('button',{name:'Обновить',exact:true}).click();await openNew();assert.equal(await dialog.getByRole('button',{name:'Отменить запись',exact:true}).count(),0);assert.equal(await dialog.getByRole('button',{name:'Сохранить черновик',exact:true}).count(),0);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      failList=true;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('alert').waitFor();assert.equal(await p.getByRole('button',{name:/Открыть график Анна/}).count(),0);failList=false;await p.getByRole('button',{name:'Обновить',exact:true}).click();await p.getByRole('button',{name:/Открыть график Анна/}).waitFor();
      for(const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks'])assert.deepEqual(f.traffic[key],[],key);
      assert.deepEqual(f.errors.filter(e=>!/^console: Failed to load resource: the server responded with a status of (409|503)/.test(e)),[]);
      console.log(`${width}px work schedule PASS: three isolated tabs, unique working people/no rest counts, rest toggle, published day roster, My Day typography, overnight calendar, filters, drawer/44px, drafts/409/publish/history/cancel, readonly/error recovery; zero real API writes.`);
    } catch(error) {console.error({traffic:f.traffic,errors:f.errors,alerts:await p.locator('[role=alert]').allTextContents()});throw error;} finally {await f.context.close();}
  }} finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
