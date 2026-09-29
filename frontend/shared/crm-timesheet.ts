export type SheetIssues = { overlap: boolean; unclosed: number; pending: number; missing: boolean | number; planUnavailable: boolean };
export type SheetPerson = { id: string; firstName: string | null; lastName: string | null; isActive: boolean; department: { name: string; archivedAt: string | null } | null };
export type SheetAction = 'REVIEW'|'APPROVE'|'CLOSE'|'REOPEN';
export type SheetWorkflow = {status:string;revision:number;edition:number;stale:boolean;archived?:boolean;actions?:SheetAction[];blockers?:string[];events?:{revision:number;edition:number;action:SheetAction;actorName:string;reason:string;createdAt:string}[]};
export const sheetStatus:Record<string,string>={DRAFT:'Рабочий отчёт',REVIEWED:'Проверен',APPROVED:'Утверждён',CLOSED:'Закрыт'};
export const sheetAction:Record<SheetAction,string>={REVIEW:'Подтвердить проверку',APPROVE:'Утвердить табель',CLOSE:'Закрыть месяц',REOPEN:'Переоткрыть месяц'};
export const sheetEvent:Record<SheetAction,string>={REVIEW:'Проверка подтверждена',APPROVE:'Табель утверждён',CLOSE:'Месяц закрыт',REOPEN:'Месяц переоткрыт'};
export type SheetRow = { employee: SheetPerson; timezone?:string; workflow?:SheetWorkflow; plannedMs: number | null; workedMs: number | null; breakMs: number | null; openSessions: number; needsAttention: boolean; planWarning: string | null; issues: SheetIssues };
export type SheetList = { month: string; timezone: string; serverTime: string; scope: string; page: number; pages: number; total: number; items: SheetRow[]; summary: { employees: number; attention: number; plannedMs: number | null; workedMs: number | null; breakMs: number | null; unavailablePlan: number; unavailableActual: number } };
export type SheetDetail = SheetRow & { month: string; timezone: string; serverTime: string; days: { date: string; plannedMs: number | null; workedMs: number | null; breakMs: number | null; sessionIds: string[]; pendingIds: string[]; openSessions: number; issues: SheetIssues }[]; intervals: { id: string; startedAt: string; endedAt: string | null; timezone: string; breaks: { startedAt: string; endedAt: string | null }[] }[]; corrections: { id: string; stale: boolean }[] };
export const sheetPerson = (person: SheetPerson) => [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Сотрудник';
export function sheetIssueLabels(issues: SheetIssues) {
  return [issues.overlap ? 'Пересечение отметок' : '', issues.unclosed ? `Незакрытых интервалов: ${issues.unclosed}` : '', issues.pending ? `Исправлений на проверке: ${issues.pending}` : '', issues.missing ? typeof issues.missing === 'number' ? `Дней по плану без отметок: ${issues.missing}` : 'Есть план, нет отметок' : '', issues.planUnavailable ? 'План не рассчитан' : ''].filter(Boolean);
}
