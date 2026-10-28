const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../shared/salon-calendar.ts'), 'utf8')).replace(/^export /gm,'');
const context = vm.createContext({Date,Intl});
vm.runInContext(source,context);
const {salonCalendarPeriod:period,salonMonthDays:days,shiftSalonMonth:month,salonInstant:instant,salonDay:day} = context;
assert.equal(month('2026-01-31',1),'2026-02-28');
assert.equal(month('2028-01-31',1),'2028-02-29');
assert.equal(month('2026-12-31',1),'2027-01-31');
assert.equal(month('2026-01-31',-1),'2025-12-31');
assert.equal(period('2026-10-26','week').fromDay,'2026-10-26');
assert.equal(period('2026-11-01','week').toDay,'2026-11-02');
assert.equal(days('2026-10-26').length,42);
assert.equal(days('2026-10-26')[0],'2026-09-28');
assert.equal(period('2026-10-26','month').toDay,'2026-11-09');
assert.equal(period('2026-12-31','day').toDay,'2027-01-01');
for(const [date,hours] of [['2026-03-29',23],['2026-10-25',25]]){
  const p=period(date,'day'),from=instant(p.fromDay,0,'Europe/Berlin'),to=instant(p.toDay,0,'Europe/Berlin');
  assert.equal((to-from)/3600000,hours,'Local calendar day must handle DST');
}
assert.equal(day(new Date('2026-10-26T23:30:00Z'),'Pacific/Auckland'),'2026-10-27');
console.log('Salon calendar periods PASS: Monday weeks, complete42daymonthgrid, monthclamping/leapyear/yearboundary, salonzone and23/25hour DST days.');
