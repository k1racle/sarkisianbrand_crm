globalThis.__timing__.logStart('Load chunks/_/salon-calendar');function salonDay(date, timeZone = "Europe/Moscow") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map((key) => {
    var _a;
    return (_a = parts.find((p) => p.type === key)) == null ? void 0 : _a.value;
  }).join("-");
}
function shiftSalonDay(day, days) {
  const date = /* @__PURE__ */ new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function salonInstant(day, minute, timeZone = "Europe/Moscow") {
  const target = Date.parse(`${day}T00:00:00Z`) + minute * 6e4;
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const value = (key) => {
      var _a;
      return Number((_a = p.find((part) => part.type === key)) == null ? void 0 : _a.value);
    };
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
    if (represented === target) return new Date(instant);
    instant += target - represented;
  }
  return null;
}
function salonMinute(date, timeZone) {
  var _a, _b;
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(date));
  return Number((_a = p.find((x) => x.type === "hour")) == null ? void 0 : _a.value) * 60 + Number((_b = p.find((x) => x.type === "minute")) == null ? void 0 : _b.value);
}

export { shiftSalonDay as a, salonInstant as b, salonMinute as c, salonDay as s };;globalThis.__timing__.logEnd('Load chunks/_/salon-calendar');
//# sourceMappingURL=salon-calendar.mjs.map
