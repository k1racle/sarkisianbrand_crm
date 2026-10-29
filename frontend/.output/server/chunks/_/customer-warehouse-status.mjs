globalThis.__timing__.logStart('Load chunks/_/customer-warehouse-status');const labels = {
  RECEIVED: "\u0417\u0430\u043A\u0430\u0437 \u043F\u043E\u043B\u0443\u0447\u0435\u043D \u0441\u043A\u043B\u0430\u0434\u043E\u043C",
  RESERVING: "\u0420\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u0443\u0435\u043C \u0442\u043E\u0432\u0430\u0440\u044B",
  RESERVED: "\u0422\u043E\u0432\u0430\u0440\u044B \u0437\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u044B",
  PARTIAL_RESERVE: "\u0427\u0430\u0441\u0442\u044C \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0437\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
  READY_FOR_PICKING: "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u0441\u0431\u043E\u0440\u043A\u0438",
  PICKING: "\u0421\u043E\u0431\u0438\u0440\u0430\u0435\u043C \u0437\u0430\u043A\u0430\u0437",
  PICKED: "\u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0431\u0440\u0430\u043D",
  CHECKING: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044E",
  CHECKED: "\u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u0430",
  PACKED: "\u0417\u0430\u043A\u0430\u0437 \u0443\u043F\u0430\u043A\u043E\u0432\u0430\u043D",
  READY_TO_SHIP: "\u0413\u043E\u0442\u043E\u0432 \u043A \u043E\u0442\u0433\u0440\u0443\u0437\u043A\u0435",
  PARTIALLY_SHIPPED: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E \u043E\u0442\u0433\u0440\u0443\u0436\u0435\u043D",
  SHIPPED: "\u041E\u0442\u0433\u0440\u0443\u0436\u0435\u043D",
  PARTIALLY_RETURNED: "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0432\u043E\u0437\u0432\u0440\u0430\u0442",
  RETURNED: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043F\u0440\u0438\u043D\u044F\u0442",
  CANCELLED: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D",
  NEEDS_ATTENTION: "\u0423\u0442\u043E\u0447\u043D\u044F\u0435\u043C \u0437\u0430\u043A\u0430\u0437"
};
function customerWarehouseLabel(value) {
  return (value == null ? void 0 : value.isCurrent) === true && value.stage && labels[value.stage] ? labels[value.stage] : "\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u043A\u043B\u0430\u0434\u0430 \u0443\u0442\u043E\u0447\u043D\u044F\u0435\u0442\u0441\u044F";
}
function customerWarehouseAsOf(value) {
  return (value == null ? void 0 : value.isCurrent) === true && value.stage && labels[value.stage] && value.asOf && Number.isFinite(Date.parse(value.asOf)) ? new Date(value.asOf).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
}
function customerWarehouseApplies(order) {
  var _a;
  if (typeof (order == null ? void 0 : order.requiresWarehouse) === "boolean") return order.requiresWarehouse;
  if (((_a = order == null ? void 0 : order.priceSnapshot) == null ? void 0 : _a.digitalDelivery) === true || (order == null ? void 0 : order.reservationState) === "DIGITAL") return false;
  return !Array.isArray(order == null ? void 0 : order.items) || !order.items.length || !order.items.every((item) => item.productType === "GIFT_CARD");
}

export { customerWarehouseLabel as a, customerWarehouseAsOf as b, customerWarehouseApplies as c };;globalThis.__timing__.logEnd('Load chunks/_/customer-warehouse-status');
//# sourceMappingURL=customer-warehouse-status.mjs.map
