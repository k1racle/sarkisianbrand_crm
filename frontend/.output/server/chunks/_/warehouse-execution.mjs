globalThis.__timing__.logStart('Load chunks/_/warehouse-execution');const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
function warehouseExecution(order) {
  const value = order == null ? void 0 : order.warehouseExecution;
  return value && typeof value === "object" && value.owner === "ONE_C" ? value : null;
}
function warehouseQuantity(order, itemId, metric) {
  var _a;
  const rows = (_a = warehouseExecution(order)) == null ? void 0 : _a.lines;
  if (!Array.isArray(rows)) return null;
  const matches = rows.filter((row) => (row == null ? void 0 : row.orderItemId) === itemId);
  if (matches.length !== 1) return null;
  const value = matches[0][metric];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
function warehouseTotal(order, metric) {
  if (!warehouseExecution(order) || !Array.isArray(order == null ? void 0 : order.items) || !order.items.length) return null;
  const values = order.items.map((item) => warehouseQuantity(order, item.id, metric));
  return values.some((value) => value === null) ? null : values.reduce((sum, value) => sum + value, 0);
}
function warehouseNumber(value) {
  return value == null ? "\u2014" : number.format(value);
}
function warehouseFactAt(order) {
  const value = warehouseExecution(order);
  return (value == null ? void 0 : value.asOf) || (value == null ? void 0 : value.occurredAt) || (value == null ? void 0 : value.updatedAt) || (value == null ? void 0 : value.receivedAt);
}
function warehouseDocumentName(document) {
  const names = { PICKING_TASK: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u043D\u0430 \u043E\u0442\u0431\u043E\u0440", WAREHOUSE_TASK: "\u0421\u043A\u043B\u0430\u0434\u0441\u043A\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435", EXPENSE_ORDER: "\u0420\u0430\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043E\u0440\u0434\u0435\u0440", OUTBOUND_ORDER: "\u0420\u0430\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043E\u0440\u0434\u0435\u0440", SALE: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438", RETURN: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430", TRANSFER: "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u0435" };
  return document.name || (document.kind ? names[document.kind] || document.kind : "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 1\u0421");
}
function warehouseStatusLabel(status) {
  const labels = {
    RECEIVED: "\u041F\u043E\u043B\u0443\u0447\u0435\u043D \u0432 1\u0421",
    ACCEPTED: "\u041F\u0440\u0438\u043D\u044F\u0442 \u0432 1\u0421",
    RESERVED: "\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D",
    PARTIAL_RESERVE: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0437\u0435\u0440\u0432",
    READY_FOR_PICKING: "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u0442\u0431\u043E\u0440\u0430",
    PICKING: "\u0418\u0434\u0451\u0442 \u043E\u0442\u0431\u043E\u0440",
    PICKED: "\u041E\u0442\u043E\u0431\u0440\u0430\u043D",
    CHECKING: "\u0418\u0434\u0451\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430",
    CHECKED: "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D",
    PACKED: "\u0423\u043F\u0430\u043A\u043E\u0432\u0430\u043D",
    READY_TO_SHIP: "\u0413\u043E\u0442\u043E\u0432 \u043A \u043E\u0442\u0433\u0440\u0443\u0437\u043A\u0435",
    PARTIALLY_SHIPPED: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E \u043E\u0442\u0433\u0440\u0443\u0436\u0435\u043D",
    SHIPPED: "\u041E\u0442\u0433\u0440\u0443\u0436\u0435\u043D",
    DELIVERED: "\u0414\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D",
    CANCELLED: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D",
    PARTIALLY_RETURNED: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0432\u043E\u0437\u0432\u0440\u0430\u0442",
    RETURNED: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043F\u0440\u0438\u043D\u044F\u0442",
    REFUNDED: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D",
    SHORTAGE: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0442\u043E\u0432\u0430\u0440\u0430",
    REJECTED: "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D \u0432 1\u0421",
    ERROR: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438",
    NEEDS_ATTENTION: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438",
    REVIEW_REQUIRED: "\u041D\u0443\u0436\u043D\u0430 \u0441\u0432\u0435\u0440\u043A\u0430",
    STALE: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F",
    MISSING: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B",
    POSTED: "\u041F\u0440\u043E\u0432\u0435\u0434\u0451\u043D",
    UNPOSTED: "\u041D\u0435 \u043F\u0440\u043E\u0432\u0435\u0434\u0451\u043D",
    DELETED: "\u041F\u043E\u043C\u0435\u0447\u0435\u043D \u043D\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435"
  };
  return status ? labels[status] || `\u0421\u0442\u0430\u0442\u0443\u0441 1\u0421: ${String(status).slice(0, 120)}` : "\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u043A\u043B\u0430\u0434\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D";
}
function warehouseNeedsReview(order) {
  const value = warehouseExecution(order);
  return Boolean((value == null ? void 0 : value.isCurrent) === false || (value == null ? void 0 : value.error) || ["NEEDS_ATTENTION", "REVIEW_REQUIRED", "STALE", "ERROR", "REJECTED", "SHORTAGE", "PARTIAL_RESERVE"].includes((value == null ? void 0 : value.status) || ""));
}
function orderTransfer(order) {
  if (order == null ? void 0 : order.oneCSyncError) return { label: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u0432 1\u0421", detail: String(order.oneCSyncError), tone: "danger" };
  if ((order == null ? void 0 : order.isSynced1C) === true) return { label: "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0432 1\u0421 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430", detail: "1\u0421 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B\u0430 \u043F\u0440\u0438\u0451\u043C \u0437\u0430\u043A\u0430\u0437\u0430. \u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u0438 \u043E\u0442\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.", tone: "success" };
  if (order == null ? void 0 : order.oneCSyncAt) return { label: "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043D\u043E\u0432\u043E\u0433\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F 1\u0421", detail: "\u041F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u043A\u0430\u0437\u0430 \u043D\u043E\u0432\u043E\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E.", tone: "warning" };
  return { label: "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0432 1\u0421 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430", detail: "\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u0451\u043C\u0430 \u0437\u0430\u043A\u0430\u0437\u0430. \u0420\u0435\u0437\u0435\u0440\u0432 \u0438 \u0441\u043A\u043B\u0430\u0434\u0441\u043A\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B.", tone: "neutral" };
}
function orderSourceLabel(order) {
  if ((order == null ? void 0 : order.source) === "MANUAL" && (order == null ? void 0 : order.sourceChannel) === "PARTNER_GIFT") return "\u041F\u043E\u0434\u0430\u0440\u043E\u043A \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u0443";
  const names = { WEB: "\u0418\u043D\u0442\u0435\u0440\u043D\u0435\u0442-\u043C\u0430\u0433\u0430\u0437\u0438\u043D", B2B: "\u041A\u0430\u0431\u0438\u043D\u0435\u0442 B2B", MANUAL: "\u0420\u0443\u0447\u043D\u043E\u0439 \u0437\u0430\u043A\u0430\u0437", ONE_C: "1\u0421", OZON: "Ozon", WILDBERRIES: "Wildberries", YANDEX_MARKET: "\u042F\u043D\u0434\u0435\u043A\u0441 \u041C\u0430\u0440\u043A\u0435\u0442", MEGAMARKET: "\u041C\u0435\u0433\u0430\u043C\u0430\u0440\u043A\u0435\u0442" };
  return names[order == null ? void 0 : order.source] || (order == null ? void 0 : order.source) || "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D";
}

export { warehouseStatusLabel as a, warehouseFactAt as b, warehouseNeedsReview as c, warehouseTotal as d, warehouseNumber as e, orderSourceLabel as f, warehouseQuantity as g, warehouseDocumentName as h, orderTransfer as o, warehouseExecution as w };;globalThis.__timing__.logEnd('Load chunks/_/warehouse-execution');
//# sourceMappingURL=warehouse-execution.mjs.map
