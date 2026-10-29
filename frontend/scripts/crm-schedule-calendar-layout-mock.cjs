/* Isolated work-schedule calendar layout and accessible-label checks; no real API writes. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: richFixtures } = require('./crm-rich-fixtures.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3019').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const month = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Moscow',year:'numeric',month:'2-digit'}).format(new Date());
const makeRows = (day,count) => Array.from({length:count},(_,i)=>({id:`row-${day}-${i}`,employeeId:`employee-${day}-${i}`,employee:{id:`employee-${day}-${i}`,firstName:'Тест'},kind:'SHIFT',startLocal:`${month}-${day}T09:00`,endLocal:`${month}-${day}T18:00`,status:'PUBLISHED',departmentName:'',timezone:'Europe/Moscow',plannedMinutes:480}));
const rows=[...makeRows('01',12),...makeRows('02',123)];
rows.push({...rows[0],id:'duplicate-shift'});
rows.push({...rows[0],id:'cancelled-shift',employeeId:'cancelled',status:'CANCELLED'});
const calendar={items:rows,patterns:[],warnings:[],totals:{entries:rows.length,draftMinutes:0,publishedMinutes:0},canCreate:false,canPublishPatterns:false};
const output=path.resolve(__dirname,'../.screenshots/crm-schedule-calendar'); fs.mkdirSync(output,{recursive:true});
async function main(){
  const browser=await chromium.launch();
  try {
    for(const width of [320,390,768,1440]) for(const dark of [false,true]) {
      const f=await isolatedContext(browser,width,false,false,{fixtures:new Map([['/auth/access',richFixtures.get('/auth/access')],['/crm/work-schedule',calendar],['/crm/work-schedule/options',{people:[],departments:[]}]])});
      try {
        await f.context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
        await f.page.goto(origin+'/crm/work-schedule');
        await f.page.getByRole('tab',{name:'График',exact:true}).click();
        const first=f.page.locator('.crm-month-day').filter({has:f.page.locator('strong', {hasText:/^1$/})});
        const second=f.page.locator('.crm-month-day').filter({has:f.page.locator('strong', {hasText:/^2$/})});
        await first.waitFor();
        assert.match(await first.getAttribute('aria-label'), /12 сотрудников/); assert.match(await second.getAttribute('aria-label'), /123 сотрудника/);
        for(const cell of [first,second]) {
          const geometry=await cell.evaluate(el=>{
            const date=el.querySelector('strong').getBoundingClientRect(), count=el.querySelector('.crm-month-count').getBoundingClientRect(), outer=el.getBoundingClientRect();
            const range=document.createRange();range.selectNodeContents(el.querySelector('.crm-month-count--compact').getClientRects().length ? el.querySelector('.crm-month-count--compact') : el.querySelector('.crm-month-count--full'));
            const text=[...range.getClientRects()];
            return {separated:date.bottom<=count.top+1,inside:count.left>=outer.left-1&&count.right<=outer.right+1&&count.bottom<=outer.bottom+1,textInside:text.every(r=>r.left>=outer.left-1&&r.right<=outer.right+1&&r.bottom<=outer.bottom+1),height:outer.height};
          });
          assert.ok(geometry.separated && geometry.inside && geometry.textInside && geometry.height>=44,JSON.stringify({width,dark,geometry}));
        }
        await first.click(); assert.equal(await first.getAttribute('aria-pressed'),'true'); await first.click(); assert.equal(await first.getAttribute('aria-pressed'),'false');
        assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true);
        await f.page.locator('.crm-month-grid').screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}.png`)});
        assert.deepEqual(f.traffic.prohibitedWrites,[]); assert.deepEqual(f.traffic.externalRequests,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.errors,[]);
        console.log(`${width} ${dark?'dark':'light'}: distinct date/count, large count, selection and labels PASS`);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
