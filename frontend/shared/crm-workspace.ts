/** CRM destinations reuse the platform's role/permission registry and existing APIs. */
export const CRM_DESTINATIONS = [
  { id: 'crm-dashboard', path: '/crm/', group: 'Сегодня', icon: 'CalendarDays' },
  { id: 'tasks', path: '/crm/tasks', group: 'Сегодня', icon: 'ListTodo' },
  { id: 'crm-files', path: '/crm/files', group: 'Сегодня', icon: 'FolderOpen' },
  { id: 'content-plan', path: '/crm/content-plan', group: 'Маркетинг и партнёры', icon: 'Clapperboard' },
  { id: 'pipeline', path: '/crm/deals', group: 'Продажи', icon: 'Kanban' },
  { id: 'web-orders', path: '/crm/orders', group: 'Продажи', icon: 'ShoppingBag', screen: 'store', section: 'orders' },
  { id: 'customers', path: '/crm/customers', group: 'Клиенты', icon: 'ContactRound' },
  { id: 'organizations', path: '/crm/organizations', group: 'Клиенты', icon: 'Building2' },
  { id: 'web-customers', path: '/crm/buyers', group: 'Клиенты', icon: 'UserRound', screen: 'store', section: 'customers' },
  { id: 'contact-messages', path: '/crm/messages', group: 'Общение и поддержка', icon: 'Inbox', screen: 'messages' },
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
] satisfies { id: string; path: string; group: string; icon: string; screen?: string; section?: string; kind?: string }[];

export const CRM_LEGACY_ROUTES: Record<string, string> = {
  '/crm-pipeline': '/crm/deals', '/crm-customers': '/crm/customers',
  '/crm-organizations': '/crm/organizations', '/crm-tasks': '/crm/tasks', '/crm-chat': '/crm/chat',
};
export const isCrmPath = (path: string) => path === '/crm' || path.startsWith('/crm/');
export const crmDestination = (path: string) => CRM_DESTINATIONS.find(item => item.path.replace(/\/$/, '') === path.replace(/\/$/, ''));
