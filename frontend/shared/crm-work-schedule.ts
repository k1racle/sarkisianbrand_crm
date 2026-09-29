export type ScheduleCalendarEntry = {
  employeeId: string;
  kind: string;
  status: string;
  startLocal: string;
  endLocal: string;
};

// Use the schedule's local dates, including overnight shifts but excluding midnight boundaries.
export function intersectsScheduleDay(row: ScheduleCalendarEntry, day: string) {
  const next = new Date(Date.parse(day + 'T00:00Z') + 86400000).toISOString().slice(0, 10);
  return row.startLocal < next + 'T00:00' && row.endLocal > day + 'T00:00';
}

export function workingEmployeeCount(rows: ScheduleCalendarEntry[], day: string) {
  return new Set(rows.filter(row => row.kind === 'SHIFT' && row.status !== 'CANCELLED' && intersectsScheduleDay(row, day)).map(row => row.employeeId)).size;
}

const employeePlural = new Intl.PluralRules('ru');
export function employeeCountLabel(count: number) {
  const form = employeePlural.select(count);
  return `${count} ${form === 'one' ? 'сотрудник' : form === 'few' ? 'сотрудника' : 'сотрудников'}`;
}
