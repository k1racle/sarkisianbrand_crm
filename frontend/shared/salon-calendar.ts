export function salonDay(date: Date, timeZone = 'Europe/Moscow') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  return ['year','month','day'].map(key => parts.find(p => p.type === key)?.value).join('-');
}
export function shiftSalonDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0,10);
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
