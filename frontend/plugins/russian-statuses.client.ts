const labels: Record<string, string> = {
  NEW: 'Новый', CONFIRMED: 'Подтверждён', PAYMENT_WAITING: 'Ожидает оплаты', PAID: 'Оплачен', ASSEMBLING: 'Сборка', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат', RETURNED: 'Возврат',
  PENDING: 'Ожидает', SUCCEEDED: 'Успешно', FAILED: 'Ошибка', SUCCESS: 'Успешно', ERROR: 'Ошибка',
  ACCRUAL: 'Начисление', WRITE_OFF: 'Списание', START: 'Старт', PRO: 'Профи', PREMIUM: 'Премиум',
  WILDBERRIES: 'Wildberries', OZON: 'Ozon', YANDEX_MARKET: 'Яндекс Маркет', MEGAMARKET: 'Мегамаркет',
  TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнена', OVERDUE: 'Просрочена',
  CONTACTED: 'Установлен контакт', QUALIFIED: 'Квалифицирован', NEGOTIATION: 'Переговоры', WON: 'Успешно', LOST: 'Закрыт без сделки',
  ADMIN: 'Администратор', CONTENT_MANAGER: 'Контент-менеджер', MANAGER_B2B: 'Менеджер B2B', MANAGER_SALES: 'Менеджер продаж', MARKETPLACE_MANAGER: 'Менеджер маркетплейсов', SUPERVISOR: 'Руководитель направления', EXECUTIVE: 'Руководитель компании', IT_SUPPORT: 'IT-поддержка', CURATOR: 'Куратор', WAREHOUSE: 'Сотрудник склада', CUSTOMER_B2C: 'Клиент B2C', CUSTOMER_B2B: 'Клиент B2B',
};

function translate(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const text of nodes) { const value = text.nodeValue?.trim(); if (value && labels[value]) text.nodeValue = text.nodeValue!.replace(value, labels[value]); }
}

export default defineNuxtPlugin(() => {
  onNuxtReady(() => { translate(document.body); new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => translate(node)))).observe(document.body, { childList: true, subtree: true }); });
});
