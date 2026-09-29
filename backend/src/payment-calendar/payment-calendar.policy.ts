import { BadRequestException } from '@nestjs/common';

export const dateKey=(date:Date)=>date.toISOString().slice(0,10);
export function calendarDate(value:string):Date {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException('Дата должна быть в формате ГГГГ-ММ-ДД');
  const date=new Date(value+'T00:00:00.000Z');
  if(!Number.isFinite(+date)||dateKey(date)!==value||value<'2000-01-01'||value>'2100-12-31')throw new BadRequestException('Укажите существующую дату с 2000 по 2100 год');
  return date;
}
export function companyToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(key:string)=>parts.find(part=>part.type===key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
type Schedule={startDate:Date;endDate:Date|null;frequency:string;interval:number};
export function dueDates(plan:Schedule,from:Date,to:Date):string[]{
  const start=plan.startDate,limit=plan.endDate&&plan.endDate<to?plan.endDate:to;
  if(start>limit||from>limit)return [];
  if(plan.frequency==='ONCE')return start>=from&&start<=limit?[dateKey(start)]:[];
  const months=plan.frequency==='YEAR'?plan.interval*12:plan.interval;
  const monthDiff=(from.getUTCFullYear()-start.getUTCFullYear())*12+from.getUTCMonth()-start.getUTCMonth();
  let index=Math.max(0,Math.floor(plan.frequency==='WEEK'?(+from-+start)/(plan.interval*7*86400000):monthDiff/months)-1);
  const result:string[]=[];
  for(;index<10000;index++){
    let date:Date;
    if(plan.frequency==='WEEK')date=new Date(+start+index*plan.interval*7*86400000);
    else{
      const first=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+index*months,1));
      const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
      date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(start.getUTCDate(),lastDay)));
    }
    if(date>limit)break;
    if(date>=from)result.push(dateKey(date));
  }
  return result;
}
