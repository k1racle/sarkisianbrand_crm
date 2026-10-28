export function salonDay(date: Date, timeZone = 'Europe/Moscow') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  return ['year','month','day'].map(key => parts.find(p => p.type === key)?.value).join('-');
}
export function shiftSalonDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0,10);
}
export function shiftSalonMonth(day: string, months: number) {
  const date = new Date(`${day}T12:00:00Z`), originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}
export function salonMonthDays(day: string) {
  const first = `${day.slice(0, 7)}-01`;
  const mondayOffset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = shiftSalonDay(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => shiftSalonDay(start, index));
}
export function salonCalendarPeriod(day: string, mode: string) {
  if (mode === 'month') {
    const days = salonMonthDays(day);
    return { fromDay: days[0], toDay: shiftSalonDay(days[41], 1) };
  }
  if (mode === 'week') {
    const mondayOffset = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
    const fromDay = shiftSalonDay(day, -mondayOffset);
    return { fromDay, toDay: shiftSalonDay(fromDay, 7) };
  }
  return { fromDay: day, toDay: shiftSalonDay(day, mode === 'day' ? 1 : 30) };
}
export function salonInstant(day: string, minute: number, timeZone = 'Europe/Moscow') {
  const target = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  let instant = target;
  for (let i=0;i<4;i++) {
    const p = new Intl.DateTimeFormat('en-CA',{ timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date(instant));
    const value = (key:string) => Number(p.find(part => part.type === key)?.value);
    const represented = Date.UTC(value('year'),value('month')-1,value('day'),value('hour'),value('minute'));
    if (represented === target) return new Date(instant);
    instant += target - represented;
  }
  return null;
}
export function salonMinute(date: string, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date));
  return Number(p.find(x=>x.type==='hour')?.value)*60 + Number(p.find(x=>x.type==='minute')?.value);
}
