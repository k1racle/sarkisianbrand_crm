import { scheduleInstant, scheduleMonth } from '../work-schedule/work-schedule.policy';
import { addDays } from '../work-schedule/work-pattern.policy';
import { TimeSession, timeTotals } from './work-time.policy';
import { calculateWorkTimePlan, plannedOverlap } from './work-time-plan';
export type SheetDay = { date: string; start: Date; end: Date };
export type SheetSession = TimeSession & { id: string; timezone: string; version: number };
export type PendingCorrection = { id: string; startedAt: Date; endedAt: Date; original: unknown };
export function sheetDays(month: string, timezone: string): SheetDay[] {
  const period = scheduleMonth(month), end = period.end.slice(0,10), result: SheetDay[] = [];
  for (let date = period.start.slice(0,10); date < end; date = addDays(date,1)) result.push({ date, start: scheduleInstant(date+'T00:00',timezone), end: scheduleInstant(addDays(date,1)+'T00:00',timezone,true) });
  return result;
}
export function intersects(start: Date, end: Date, from: Date, to: Date) { return +start < +to && +end > +from; }
export function correctionTouches(row: PendingCorrection, from: Date, to: Date, now: Date) {
  if (intersects(row.startedAt,row.endedAt,from,to)) return true;
  const original = row.original as { startedAt?: string; endedAt?: string | null } | null;
  return Boolean(original?.startedAt && intersects(new Date(original.startedAt),original.endedAt ? new Date(original.endedAt) : now,from,to));
}
export function sheetEmployee(sessions: SheetSession[], plan: ReturnType<typeof calculateWorkTimePlan>, corrections: PendingCorrection[], days: SheetDay[], now: Date) {
  const ordered = sessions.filter(row => +row.startedAt < +now).slice().sort((a,b) => +a.startedAt - +b.startedAt);
  const rows = days.map(day => {
    const present = ordered.filter(row => intersects(row.startedAt,row.endedAt || now,day.start,day.end));
    const overlap = present.some((row,i) => i > 0 && +row.startedAt < Math.min(+(present[i-1].endedAt || now),+now));
    const totals = present.reduce((sum,row) => { const t=timeTotals(row,now,day.start,day.end); return {workedMs:sum.workedMs+t.workedMs,breakMs:sum.breakMs+t.breakMs,elapsedMs:sum.elapsedMs+t.elapsedMs}; },{workedMs:0,breakMs:0,elapsedMs:0});
    const plannedMs = plan.available ? plan.intervals.reduce((sum,row) => sum+plannedOverlap(row,day.start,day.end),0) : null;
    const pending = corrections.filter(row => correctionTouches(row,day.start,day.end,now));
    const open = present.filter(row => !row.endedAt), long = open.filter(row => +now - +row.startedAt >= 86400000 || +days[days.length-1].end <= +now);
    return { date:day.date,plannedMs,workedMs:overlap?null:totals.workedMs,breakMs:overlap?null:totals.breakMs,
      sessionIds:present.map(row=>row.id),pendingIds:pending.map(row=>row.id),openSessions:open.length,
      issues:{overlap,unclosed:long.length,pending:pending.length,missing:plannedMs!==null && plannedMs>0 && +day.end<=+now && totals.elapsedMs===0,planUnavailable:!plan.available} };
  });
  const overlap = rows.some(row=>row.issues.overlap), from=days[0].start,to=days[days.length-1].end;
  const active=sessions.filter(row=>intersects(row.startedAt,row.endedAt || now,from,to));
  const issues={overlap,unclosed:active.filter(row=>!row.endedAt && (+now - +row.startedAt>=86400000 || +to<=+now)).length,pending:corrections.filter(row=>correctionTouches(row,from,to,now)).length,missing:rows.filter(row=>row.issues.missing).length,planUnavailable:!plan.available};
  return {plannedMs:plan.plannedMs,workedMs:overlap?null:rows.reduce((sum,row)=>sum+(row.workedMs||0),0),breakMs:overlap?null:rows.reduce((sum,row)=>sum+(row.breakMs||0),0),
    openSessions:active.filter(row=>!row.endedAt).length,issues,needsAttention:issues.overlap||issues.unclosed>0||issues.pending>0||issues.missing>0||issues.planUnavailable,
    planWarning:plan.warning,days:rows};
}
export function sheetSummary(rows: ReturnType<typeof sheetEmployee>[]) {
  const sum=(key:'plannedMs'|'workedMs'|'breakMs')=>rows.some(row=>row[key]===null)?null:rows.reduce((n,row)=>n+(row[key]||0),0);
  return {employees:rows.length,plannedMs:sum('plannedMs'),workedMs:sum('workedMs'),breakMs:sum('breakMs'),attention:rows.filter(row=>row.needsAttention).length,
    unavailablePlan:rows.filter(row=>row.plannedMs===null).length,unavailableActual:rows.filter(row=>row.workedMs===null).length};
}
