globalThis.__timing__.logStart('Load chunks/_/course-types');function courseDescription(description) {
  if (typeof description === "string") return description;
  if (description && typeof description === "object" && "text" in description && typeof description.text === "string") return description.text;
  return "";
}
function coursePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(n) : "\u0426\u0435\u043D\u0430 \u0443\u0442\u043E\u0447\u043D\u044F\u0435\u0442\u0441\u044F";
}
function safeCourseLink(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

export { coursePrice as a, courseDescription as c, safeCourseLink as s };;globalThis.__timing__.logEnd('Load chunks/_/course-types');
//# sourceMappingURL=course-types.mjs.map
