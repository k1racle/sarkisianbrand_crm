/** Presentation only: every destination still uses the platform's existing roles and permissions. */
export const CRM_GROUPS = ['Мой день', 'Клиенты и продажи', 'Заказы и исполнение', 'Финансы', 'Команда', 'Маркетинг и партнёры', 'Поддержка', 'Аналитика', 'Настройки CRM'] as const;
export const CRM_MODULES = [
  { id: 'marketplaces', label: 'Маркетплейсы', group: 'Заказы и исполнение', icon: 'Store' },
  { id: 'loyalty', label: 'Клуб покупателей', group: 'Маркетинг и партнёры', icon: 'BadgeCheck' },
  { id: 'referrals', label: 'Рекомендации', group: 'Маркетинг и партнёры', icon: 'Network' },
  { id: 'bloggers', label: 'Блогеры', group: 'Маркетинг и партнёры', icon: 'Video' },
  { id: 'connections', label: 'Интеграции', group: 'Настройки CRM', icon: 'PlugZap' },
] as const;
export type CrmDestination = {
  id: string; path: string; label: string; group: typeof CRM_GROUPS[number]; icon: string;
  parent?: typeof CRM_MODULES[number]['id']; sidebarFallbackFor?: string;
  screen?: string; section?: string; kind?: string;
};
export const CRM_DESTINATIONS: CrmDestination[] = [
  { id: 'crm-dashboard', path: '/crm/', label: 'Мой день', group: 'Мой день', icon: 'CalendarDays' },
  { id: 'pipeline', path: '/crm/deals', label: 'Воронка продаж', group: 'Клиенты и продажи', icon: 'Kanban' },
  { id: 'customers', path: '/crm/customers', label: 'Клиенты', group: 'Клиенты и продажи', icon: 'ContactRound' },
  { id: 'organizations', path: '/crm/organizations', label: 'Организации', group: 'Клиенты и продажи', icon: 'Building2' },
  // Keep this legacy screen addressable without promising a storefront-only filter it does not implement.
  { id: 'web-customers', path: '/crm/buyers', label: 'Клиенты — прежний экран', group: 'Клиенты и продажи', icon: 'UserRound', sidebarFallbackFor: 'customers', screen: 'store', section: 'customers' },
  { id: 'web-orders', path: '/crm/orders', label: 'Заказы сайта', group: 'Заказы и исполнение', icon: 'ShoppingBag', screen: 'store', section: 'orders' },
  { id: 'b2b-orders', path: '/crm/b2b-orders', label: 'Заказы B2B', group: 'Заказы и исполнение', icon: 'PackageCheck' },
  { id: 'channel-dashboard', path: '/crm/marketplaces/overview', label: 'Обзор маркетплейсов', group: 'Заказы и исполнение', parent: 'marketplaces', icon: 'Store', screen: 'channels', section: 'overview' },
  { id: 'channel-orders', path: '/crm/marketplaces/orders', label: 'Заказы маркетплейсов', group: 'Заказы и исполнение', parent: 'marketplaces', icon: 'ReceiptText', screen: 'channels', section: 'orders' },
  { id: 'payment-calendar', path: '/crm/payment-calendar', label: 'Календарь платежей', group: 'Финансы', icon: 'CalendarCheck2' },
  { id: 'tasks', path: '/crm/tasks', label: 'Задачи', group: 'Команда', icon: 'ListTodo' },
  { id: 'crm-files', path: '/crm/files', label: 'Файлы', group: 'Команда', icon: 'FolderOpen' },
  { id: 'work-schedule', path: '/crm/work-schedule', label: 'Графики работы', group: 'Команда', icon: 'CalendarFold' },
  { id: 'work-time', path: '/crm/work-time', label: 'Рабочее время', group: 'Команда', icon: 'Clock3' },
  { id: 'crm-meetings', path: '/crm/meetings', label: 'Встречи', group: 'Команда', icon: 'CalendarClock' },
  { id: 'crm-chat', path: '/crm/chat', label: 'Чат команды', group: 'Команда', icon: 'MessageSquareText' },
  { id: 'content-plan', path: '/crm/content-plan', label: 'Контент-план', group: 'Маркетинг и партнёры', icon: 'Clapperboard' },
  { id: 'loyalty-members', path: '/crm/loyalty/members', label: 'Участники клуба', group: 'Маркетинг и партнёры', parent: 'loyalty', icon: 'BadgeCheck', screen: 'store', section: 'loyalty-members' },
  { id: 'loyalty-settings', path: '/crm/loyalty/settings', label: 'Правила клуба', group: 'Маркетинг и партнёры', parent: 'loyalty', icon: 'NotebookPen', screen: 'store', section: 'loyalty-settings' },
  ...(['participants', 'rewards', 'settings'] as const).map(section => ({ id: `referral-${section}`, path: `/crm/referrals/${section}`, label: { participants: 'Участники рекомендаций', rewards: 'Начисления за рекомендации', settings: 'Настройки рекомендаций' }[section], group: 'Маркетинг и партнёры' as const, parent: 'referrals' as const, icon: { participants: 'Network', rewards: 'Coins', settings: 'SlidersHorizontal' }[section], screen: 'partner', section, kind: 'REFERRAL' })),
  ...(['overview', 'participants', 'registrations', 'rewards', 'payouts', 'settings'] as const).map(section => ({ id: `bloggers-${section}`, path: `/crm/bloggers/${section}`, label: { overview: 'Обзор блогеров', participants: 'Заявки и партнёры', registrations: 'Привлечённые организации', rewards: 'Начисления блогерам', payouts: 'Выплаты блогерам', settings: 'Настройки блогеров' }[section], group: 'Маркетинг и партнёры' as const, parent: 'bloggers' as const, icon: { overview: 'Video', participants: 'UsersRound', registrations: 'Handshake', rewards: 'BadgeDollarSign', payouts: 'Wallet', settings: 'Settings2' }[section], screen: 'partner', section, kind: 'BLOGGER' })),
  { id: 'promotions', path: '/crm/promotions', label: 'Промокоды', group: 'Маркетинг и партнёры', icon: 'Megaphone', screen: 'store', section: 'promotions' },
  { id: 'gift-cards', path: '/crm/gift-cards', label: 'Подарочные карты', group: 'Маркетинг и партнёры', icon: 'Gift', screen: 'store', section: 'gift-cards' },
  { id: 'contact-messages', path: '/crm/messages', label: 'Сообщения с сайта', group: 'Поддержка', icon: 'Inbox', screen: 'messages' },
  { id: 'helpdesk', path: '/crm/support/overview', label: 'Центр поддержки', group: 'Поддержка', icon: 'LifeBuoy', screen: 'support', section: 'overview' },
  { id: 'tickets', path: '/crm/support/tickets', label: 'Все заявки', group: 'Поддержка', icon: 'Headset', screen: 'support', section: 'tickets' },
  { id: 'queues', path: '/crm/support/queues', label: 'Очереди поддержки', group: 'Поддержка', icon: 'ListOrdered', screen: 'support', section: 'queues' },
  { id: 'knowledge', path: '/crm/support/knowledge', label: 'База знаний', group: 'Поддержка', icon: 'BookOpen', screen: 'support', section: 'knowledge' },
  { id: 'leadership', path: '/crm/reports/overview', label: 'Результаты компании', group: 'Аналитика', icon: 'ChartNoAxesCombined', screen: 'reports', section: 'overview' },
  { id: 'sales-report', path: '/crm/reports/sales', label: 'Отчёт по продажам', group: 'Аналитика', icon: 'TrendingUp', screen: 'reports', section: 'sales' },
  { id: 'customers-report', path: '/crm/reports/customers', label: 'Отчёт по клиентам', group: 'Аналитика', icon: 'ChartPie', screen: 'reports', section: 'customers' },
  ...(['overview', 'staff', 'departments', 'access', 'accounts'] as const).map(section => ({
    id: section === 'overview' ? 'system-overview' : section, path: `/crm/settings/${section}`, group: 'Настройки CRM' as const,
    label: { overview: 'Обзор системы', staff: 'Сотрудники', departments: 'Отделы', access: 'Роли и права', accounts: 'Учётные записи' }[section],
    icon: { overview: 'MonitorCog', staff: 'Contact', departments: 'Workflow', access: 'ShieldCheck', accounts: 'UserCog' }[section], screen: 'system', section,
  })),
  { id: 'integrations', path: '/crm/settings/integrations', label: 'Интеграции системы', group: 'Настройки CRM', parent: 'connections', icon: 'PlugZap', screen: 'system', section: 'integrations' },
  { id: 'channel-integrations', path: '/crm/marketplaces/integrations', label: 'Подключения маркетплейсов', group: 'Настройки CRM', parent: 'connections', icon: 'Cable', screen: 'channels', section: 'integrations' },
  ...(['bot-commands', 'salon-subscription', 'audit', 'logs', 'trash'] as const).map(section => ({
    id: section, path: `/crm/settings/${section}`, group: 'Настройки CRM' as const,
    label: { 'bot-commands': 'Команды ботов', 'salon-subscription': 'Подписка салонов', audit: 'Журнал действий', logs: 'Технические журналы', trash: 'Корзина данных' }[section],
    icon: { 'bot-commands': 'Bot', 'salon-subscription': 'CalendarRange', audit: 'History', logs: 'Terminal', trash: 'Trash2' }[section], screen: 'system', section,
  })),
];

export type CrmNavigationItem = CrmDestination & { to: string; keywords: string; parentLabel?: string };
export function crmNavigationItems(leaves: readonly { id: string; label: string; keywords?: string }[]): CrmNavigationItem[] {
  return CRM_DESTINATIONS.flatMap(destination => {
    const source = leaves.find(item => item.id === destination.id);
    if (!source) return [];
    const parentLabel = CRM_MODULES.find(module => module.id === destination.parent)?.label;
    return [{ ...destination, to: destination.path, parentLabel, keywords: `${source.label} ${source.keywords || ''} ${parentLabel || ''}` }];
  });
}
export function crmPrimaryItems(items: readonly CrmNavigationItem[]) {
  return items.filter(item => !item.sidebarFallbackFor || !items.some(other => other.id === item.sidebarFallbackFor));
}
export function crmNavigationGroups(items: readonly CrmNavigationItem[]) {
  const visible = crmPrimaryItems(items);
  return CRM_GROUPS.map(label => {
    const groupItems = visible.filter(item => item.group === label);
    const entries: { id: string; label: string; icon: string; item?: CrmNavigationItem; children?: CrmNavigationItem[] }[] = [];
    for (const item of groupItems) {
      const module = CRM_MODULES.find(module => module.id === item.parent);
      if (!module) entries.push({ id: item.id, label: item.label, icon: item.icon, item });
      else if (!entries.some(entry => entry.id === module.id)) entries.push({ id: module.id, label: module.label, icon: module.icon, children: groupItems.filter(child => child.parent === module.id) });
    }
    return { label, entries };
  }).filter(group => group.entries.length);
}
export function searchCrmNavigation(items: readonly CrmNavigationItem[], query: string) {
  const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return crmPrimaryItems(items).filter(item => terms.every(term => normalize(`${item.label} ${item.group} ${item.keywords}`).includes(term)));
}

export const CRM_LEGACY_ROUTES: Record<string, string> = {
  '/crm-pipeline': '/crm/deals', '/crm-customers': '/crm/customers',
  '/crm-organizations': '/crm/organizations', '/crm-tasks': '/crm/tasks', '/crm-chat': '/crm/chat',
};
export const isCrmPath = (path: string) => path === '/crm' || path.startsWith('/crm/');
export const crmDestination = (path: string) => CRM_DESTINATIONS.find(item => item.path.replace(/\/$/, '') === path.replace(/\/$/, ''));

/** Preserve bookmarks and queries. Customer /b2b and storefront editors are not moved. */
export function crmLegacyPath(path: string, section?: unknown): string | undefined {
  const clean = path.replace(/\/$/, '');
  if (CRM_LEGACY_ROUTES[clean]) return CRM_LEGACY_ROUTES[clean];
  const roots: Record<string, string> = { '/crm-marketplaces': '/crm/marketplaces', '/system-settings': '/crm/settings', '/helpdesk': '/crm/support', '/leadership': '/crm/reports' };
  for (const [old, target] of Object.entries(roots)) {
    if (clean !== old && !clean.startsWith(old + '/')) continue;
    let leaf = clean === old ? (typeof section === 'string' ? section : 'overview') : clean.slice(old.length + 1);
    if (old === '/crm-marketplaces') leaf = leaf === 'settings' ? 'integrations' : leaf === 'dashboard' ? 'overview' : leaf;
    const next = `${target}/${leaf}`;
    return crmDestination(next) ? next : undefined;
  }
  const legacyStore: Record<string, string> = { orders: '/crm/orders', customers: '/crm/buyers', 'contact-messages': '/crm/messages', promotions: '/crm/promotions', 'gift-cards': '/crm/gift-cards', 'loyalty-settings': '/crm/loyalty/settings', 'loyalty-members': '/crm/loyalty/members' };
  if (clean === '/admin-workspace' || clean.startsWith('/admin-workspace/')) {
    const leaf = clean === '/admin-workspace' ? section : clean.slice('/admin-workspace/'.length);
    if (typeof leaf !== 'string') return;
    if (legacyStore[leaf]) return legacyStore[leaf];
    const partner = /^(bloggers|referral)-(.+)$/.exec(leaf);
    const next = partner && `/crm/${partner[1] === 'referral' ? 'referrals' : 'bloggers'}/${partner[2]}`;
    return next && crmDestination(next) ? next : undefined;
  }
}
