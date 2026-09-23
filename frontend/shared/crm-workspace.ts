/** CRM destinations reuse the platform's role/permission registry and existing APIs. */
export const CRM_DESTINATIONS = [
  { id: 'crm-dashboard', path: '/crm/', group: 'Сегодня', icon: 'CalendarDays' },
  { id: 'tasks', path: '/crm/tasks', group: 'Сегодня', icon: 'ListTodo' },
  { id: 'crm-files', path: '/crm/files', group: 'Сегодня', icon: 'FolderOpen' },
  { id: 'content-plan', path: '/crm/content-plan', group: 'Маркетинг и партнёры', icon: 'Clapperboard' },
  { id: 'pipeline', path: '/crm/deals', group: 'Продажи', icon: 'Kanban' },
  { id: 'web-orders', path: '/crm/orders', group: 'Продажи', icon: 'ShoppingBag', screen: 'store', section: 'orders' },
  { id: 'b2b-orders', path: '/crm/b2b-orders', group: 'Продажи', icon: 'PackageCheck' },
  ...(['overview', 'orders', 'integrations'] as const).map(section => ({ id: `channel-${section === 'overview' ? 'dashboard' : section}`, path: `/crm/marketplaces/${section}`, group: 'Маркетплейсы', icon: { overview: 'Store', orders: 'ReceiptText', integrations: 'Cable' }[section], screen: 'channels', section })),
  { id: 'customers', path: '/crm/customers', group: 'Клиенты', icon: 'ContactRound' },
  { id: 'organizations', path: '/crm/organizations', group: 'Клиенты', icon: 'Building2' },
  { id: 'web-customers', path: '/crm/buyers', group: 'Клиенты', icon: 'UserRound', screen: 'store', section: 'customers' },
  { id: 'contact-messages', path: '/crm/messages', group: 'Общение и поддержка', icon: 'Inbox', screen: 'messages' },
  { id: 'helpdesk', path: '/crm/support/overview', group: 'Общение и поддержка', icon: 'LifeBuoy', screen: 'support', section: 'overview' },
  { id: 'tickets', path: '/crm/support/tickets', group: 'Общение и поддержка', icon: 'Headset', screen: 'support', section: 'tickets' },
  { id: 'queues', path: '/crm/support/queues', group: 'Общение и поддержка', icon: 'ListOrdered', screen: 'support', section: 'queues' },
  { id: 'knowledge', path: '/crm/support/knowledge', group: 'Общение и поддержка', icon: 'BookOpen', screen: 'support', section: 'knowledge' },
  { id: 'loyalty-members', path: '/crm/loyalty/members', group: 'Маркетинг и партнёры', icon: 'BadgeCheck', screen: 'store', section: 'loyalty-members' },
  { id: 'loyalty-settings', path: '/crm/loyalty/settings', group: 'Маркетинг и партнёры', icon: 'NotebookPen', screen: 'store', section: 'loyalty-settings' },
  { id: 'promotions', path: '/crm/promotions', group: 'Маркетинг и партнёры', icon: 'Megaphone', screen: 'store', section: 'promotions' },
  { id: 'gift-cards', path: '/crm/gift-cards', group: 'Маркетинг и партнёры', icon: 'Gift', screen: 'store', section: 'gift-cards' },
  ...(['participants', 'rewards', 'settings'] as const).map(section => ({ id: `referral-${section}`, path: `/crm/referrals/${section}`, group: 'Маркетинг и партнёры', icon: { participants: 'Network', rewards: 'Coins', settings: 'SlidersHorizontal' }[section], screen: 'partner', section, kind: 'REFERRAL' })),
  ...(['overview', 'participants', 'registrations', 'rewards', 'payouts', 'settings'] as const).map(section => ({ id: `bloggers-${section}`, path: `/crm/bloggers/${section}`, group: 'Блогеры', icon: { overview: 'Video', participants: 'UsersRound', registrations: 'Handshake', rewards: 'BadgeDollarSign', payouts: 'Wallet', settings: 'Settings2' }[section], screen: 'partner', section, kind: 'BLOGGER' })),
  { id: 'leadership', path: '/crm/reports/overview', group: 'Аналитика', icon: 'ChartNoAxesCombined', screen: 'reports', section: 'overview' },
  { id: 'sales-report', path: '/crm/reports/sales', group: 'Аналитика', icon: 'TrendingUp', screen: 'reports', section: 'sales' },
  { id: 'customers-report', path: '/crm/reports/customers', group: 'Аналитика', icon: 'ChartPie', screen: 'reports', section: 'customers' },
  ...(['overview', 'staff', 'departments', 'access', 'accounts', 'integrations', 'bot-commands', 'salon-subscription', 'audit', 'logs', 'trash'] as const).map(section => ({
    id: section === 'overview' ? 'system-overview' : section, path: `/crm/settings/${section}`, group: 'Настройки CRM',
    icon: { overview: 'MonitorCog', staff: 'Contact', departments: 'Workflow', access: 'ShieldCheck', accounts: 'UserCog', integrations: 'PlugZap', 'bot-commands': 'Bot', 'salon-subscription': 'CalendarRange', audit: 'History', logs: 'Terminal', trash: 'Trash2' }[section], screen: 'system', section,
  })),
] satisfies { id: string; path: string; group: string; icon: string; screen?: string; section?: string; kind?: string }[];

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
