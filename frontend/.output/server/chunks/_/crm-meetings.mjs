globalThis.__timing__.logStart('Load chunks/_/crm-meetings');const meetingKind = (kind) => ({ TEAM: "\u041F\u043B\u0430\u043D\u0451\u0440\u043A\u0430", MEETING: "\u0421\u043E\u0432\u0435\u0449\u0430\u043D\u0438\u0435", EVENT: "\u041C\u0435\u0440\u043E\u043F\u0440\u0438\u044F\u0442\u0438\u0435", INTERVIEW: "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435", OTHER: "\u0414\u0440\u0443\u0433\u0430\u044F \u0432\u0441\u0442\u0440\u0435\u0447\u0430" })[kind] || kind;
const meetingResponse = (response) => ({ ACCEPTED: "\u0423\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442", DECLINED: "\u041D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442", PENDING: "\u0416\u0434\u0451\u043C \u043E\u0442\u0432\u0435\u0442\u0430" })[response || "PENDING"] || "\u0416\u0434\u0451\u043C \u043E\u0442\u0432\u0435\u0442\u0430";
const calendarDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function meetingMonthDays(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [year, m] = month.split("-").map(Number), first = new Date(year, m - 1, 1), start = new Date(year, m - 1, 1 - (first.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export { meetingKind as a, meetingResponse as b, calendarDay as c, meetingMonthDays as m };;globalThis.__timing__.logEnd('Load chunks/_/crm-meetings');
//# sourceMappingURL=crm-meetings.mjs.map
