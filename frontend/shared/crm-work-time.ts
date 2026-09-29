export type WorkTimeAction = 'START' | 'PAUSE' | 'RESUME' | 'FINISH';
export type TimeTotals = { workedMs: number; breakMs: number };
export type WorkTimeSession = { id: string; version: number; status: 'WORKING' | 'BREAK' | 'FINISHED'; timezone: string; startedAt: string; endedAt: string | null; longRunning: boolean; totals: TimeTotals; periodTotals?: TimeTotals; breaks: { startedAt: string; endedAt: string | null }[] };
export type WorkTimeCurrent = { serverTime: string; timezone: string; date: string; todayEndsAt: string; today: TimeTotals; active: WorkTimeSession | null; canTrack: boolean };
export type WorkTimeHistory = { month: string; timezone: string; serverTime: string; totals: TimeTotals; items: WorkTimeSession[]; canRequestCorrection?: boolean; plan?: { available: boolean; plannedMs: number | null; shifts: number | null; warning: string | null } };
export type TimeCorrection = { id: string; sessionId: string | null; baseVersion: number | null; version: number; status: string; reason: string; createdAt: string; employee: { id: string; firstName?: string; lastName?: string }; proposal: Pick<WorkTimeSession,'startedAt'|'endedAt'|'timezone'|'breaks'|'totals'>; original: Pick<WorkTimeSession,'startedAt'|'endedAt'|'timezone'|'breaks'> | null; reviewerName: string | null; reviewNote: string | null; reviewedAt: string | null; stale: boolean; canApprove: boolean; canReject: boolean; canCancel: boolean };
export function workTimeLocal(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function workTimeDuration(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}
export function workTimeCounter(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}
