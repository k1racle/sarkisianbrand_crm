/** Navigation is presentation only. Backend permissions remain authoritative. */
export type WorkspaceLeaf = {
  id: string;
  label: string;
  to: string;
  roles: readonly string[];
  keywords?: string;
  permission?: string;
};
export type WorkspaceGroup = {
  id: string;
  label: string;
  description: string;
  icon: string;
  items: readonly WorkspaceLeaf[];
};
export type WorkspaceDestination = WorkspaceLeaf & { groupId: string; groupLabel: string };
export type WorkspacePreferences = { favorites: string[]; recent: string[]; start: string | null };

/** Shared by the workspace selector and the home screen, in business order. */
export const WORKSPACE_AREAS = [
  { id: 'crm', label: 'CRM', description: 'Клиенты, сделки и задачи команды', icon: 'Users', groupIds: ['crm'] },
  { id: 'marketplaces', label: 'Маркетплейсы', description: 'Продажи и подключения торговых площадок', icon: 'Cable', groupIds: ['channels'] },
  { id: 'site', label: 'Сайт', description: 'Заказы, товары и оформление сайта', icon: 'ShoppingBag', groupIds: ['sales', 'catalog', 'site', 'marketing'] },
  { id: 'support', label: 'Поддержка', description: 'Заявки, очереди и помощь клиентам', icon: 'Headphones', groupIds: ['support'] },
  { id: 'management', label: 'Управление', description: 'Отчёты, сотрудники и настройки платформы', icon: 'Settings', groupIds: ['reports', 'media', 'settings'] },
] as const;

const INTERNAL = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'CURATOR', 'WAREHOUSE'];
const WEB = ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE'];
const CATALOG = ['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE'];
const CRM = ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'];
const MARKETING = ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR'];
const SITE = ['ADMIN', 'CONTENT_MANAGER', 'SUPERVISOR'];
const CHANNELS = ['ADMIN', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'WAREHOUSE'];
const SUPPORT = ['ADMIN', 'IT_SUPPORT', 'SUPERVISOR'];
const REPORTS = ['ADMIN', 'EXECUTIVE', 'SUPERVISOR'];
const ADMIN = ['ADMIN'];

/** One registry for rail, toolbar, command search, breadcrumbs and the workspace hub.
 * site-content is the only coordinated new section: parent wires its actual editor.
 * No hypothetical warehouse/refund routes are exposed.
 * Workspace/promotions/gift-cards stay role-only: their current endpoints
 * declare no distinct permission; never invent permission keys for these routes.
 */
export const WORKSPACE_NAVIGATION: readonly WorkspaceGroup[] = [
  { id: 'dashboard', label: 'Рабочий стол', description: 'Быстрые переходы и обзор интернет-магазина.', icon: 'LayoutDashboard', items: [
    { id: 'workspace', label: 'Мой рабочий стол', to: '/workspace', roles: INTERNAL, keywords: 'главная начало dashboard' },
    { id: 'web-dashboard', label: 'Обзор магазина', to: '/admin-workspace/dashboard', permission: 'admin.read', roles: CATALOG },
  ] },
  { id: 'sales', label: 'Продажи', description: 'Заказы интернет-магазина.', icon: 'ShoppingBag', items: [
    { id: 'web-orders', label: 'Заказы интернет-магазина', to: '/admin-workspace/orders', permission: 'web_orders.read', roles: WEB, keywords: 'web продажи оплата доставка' },
  ] },
  { id: 'catalog', label: 'Каталог', description: 'Товары, варианты и карточки интернет-магазина.', icon: 'Boxes', items: [
    { id: 'products', label: 'Товары', to: '/admin-workspace/products', permission: 'catalog.read', roles: CATALOG, keywords: 'каталог sku артикул карточки остатки' },
    { id: 'categories', label: 'Категории', to: '/admin-workspace/categories', permission: 'catalog.read', roles: CATALOG, keywords: 'дерево подкатегории фото описание порядок' },
    { id: 'product-badges', label: 'Бейджи товаров', to: '/admin-workspace/product-badges', permission: 'catalog.read', roles: CATALOG, keywords: 'новинка популярное скидка метки' },
  ] },
  { id: 'crm', label: 'CRM', description: 'Клиенты, организации, воронка и задачи команды.', icon: 'Users', items: [
    { id: 'crm-dashboard', label: 'Обзор CRM', to: '/crm', permission: 'crm.read', roles: CRM },
    { id: 'pipeline', label: 'Воронка продаж', to: '/crm-pipeline', permission: 'crm.read', roles: CRM, keywords: 'сделки лиды kanban' },
    { id: 'customers', label: 'Клиенты 360°', to: '/crm-customers', permission: 'customers.read', roles: CRM },
    { id: 'web-customers', label: 'Клиенты интернет-магазина', to: '/admin-workspace/customers', permission: 'crm.read', roles: MARKETING },
    { id: 'organizations', label: 'Организации B2B', to: '/crm-organizations', permission: 'customers.read', roles: CRM, keywords: 'компании партнеры' },
    { id: 'tasks', label: 'Задачи', to: '/crm-tasks', permission: 'crm.read', roles: CRM, keywords: 'календарь gantt команда' },
  ] },
  { id: 'marketing', label: 'Маркетинг', description: 'Бонусная программа, промокоды и подарочные карты.', icon: 'Award', items: [
    { id: 'loyalty', label: 'Бонусная программа', to: '/admin-workspace/loyalty', permission: 'loyalty.read', roles: MARKETING, keywords: 'клуб баллы sarkisian club' },
    { id: 'promotions', label: 'Промокоды', to: '/admin-workspace/promotions', roles: MARKETING, keywords: 'скидки акции' },
    { id: 'gift-cards', label: 'Подарочные карты', to: '/admin-workspace/gift-cards', roles: MARKETING, keywords: 'сертификаты номиналы' },
  ] },
  { id: 'site', label: 'Сайт', description: 'Витрина, содержание страниц и навигация магазина.', icon: 'Palette', items: [
    { id: 'appearance', label: 'Витрина и баннеры', to: '/admin-workspace/appearance', permission: 'catalog.read', roles: SITE, keywords: 'главная фото категории соцсети меню' },
    { id: 'site-content', label: 'Контент сайта', to: '/admin-workspace/site-content', permission: 'catalog.read', roles: SITE, keywords: 'главная блоки тексты' },
    { id: 'pages', label: 'Страницы сайта', to: '/admin-workspace/pages', permission: 'catalog.read', roles: SITE, keywords: 'доставка контакты оферта политика' },
    { id: 'catalog-menu', label: 'Меню каталога', to: '/admin-workspace/catalog-menu', permission: 'catalog.read', roles: SITE, keywords: 'категории навигация' },
  ] },
  { id: 'support', label: 'Поддержка', description: 'Заявки, очереди и база знаний helpdesk.', icon: 'Headphones', items: [
    { id: 'helpdesk', label: 'Обзор поддержки', to: '/helpdesk/overview', permission: 'helpdesk.read', roles: SUPPORT },
    { id: 'tickets', label: 'Все заявки', to: '/helpdesk/tickets', permission: 'helpdesk.read', roles: SUPPORT },
    { id: 'queues', label: 'Очереди', to: '/helpdesk/queues', permission: 'helpdesk.read', roles: SUPPORT },
    { id: 'knowledge', label: 'База знаний', to: '/helpdesk/knowledge', permission: 'helpdesk.read', roles: SUPPORT },
  ] },
  { id: 'channels', label: 'Маркетплейсы', description: 'Обзор маркетплейсов и настройки подключений.', icon: 'Cable', items: [
    { id: 'channel-dashboard', label: 'Обзор маркетплейсов', to: '/crm-marketplaces/overview', permission: 'marketplace.read', roles: CHANNELS },
    { id: 'channel-orders', label: 'Заказы маркетплейсов', to: '/crm-marketplaces/orders', permission: 'marketplace.read', roles: CHANNELS, keywords: 'ozon wb wildberries каналы продажи' },
    { id: 'channel-integrations', label: 'Подключения каналов', to: '/crm-marketplaces/integrations', permission: 'marketplace.read', roles: CHANNELS },
  ] },
  { id: 'reports', label: 'Отчёты', description: 'Результаты компании, продажи и клиентская аналитика.', icon: 'BarChart3', items: [
    { id: 'leadership', label: 'Результаты компании', to: '/leadership/overview', permission: 'leadership.read', roles: REPORTS },
    { id: 'sales-report', label: 'Отчёт по продажам', to: '/leadership/sales', permission: 'leadership.read', roles: REPORTS },
    { id: 'customers-report', label: 'Отчёт по клиентам', to: '/leadership/customers', permission: 'leadership.read', roles: REPORTS },
  ] },
  { id: 'settings', label: 'Настройки', description: 'Доступ, сотрудники, интеграции и журналы экосистемы.', icon: 'Settings', items: [
    { id: 'system-overview', label: 'Обзор системы', to: '/system-settings/overview', permission: 'system.manage', roles: ADMIN },
    { id: 'accounts', label: 'Учётные записи', to: '/system-settings/accounts', permission: 'system.manage', roles: ADMIN },
    { id: 'trash', label: 'Корзина данных', to: '/system-settings/trash', permission: 'system.manage', roles: ADMIN },
    { id: 'staff', label: 'Сотрудники', to: '/system-settings/staff', permission: 'system.manage', roles: ADMIN },
    { id: 'access', label: 'Роли и права', to: '/system-settings/access', permission: 'system.manage', roles: ADMIN },
    { id: 'integrations', label: 'Интеграции системы', to: '/system-settings/integrations', permission: 'system.manage', roles: ADMIN },
    { id: 'bot-commands', label: 'Команды ботов', to: '/system-settings/bot-commands', permission: 'system.manage', roles: ADMIN },
    { id: 'audit', label: 'Журнал действий', to: '/system-settings/audit', permission: 'system.manage', roles: ADMIN },
    { id: 'logs', label: 'Технические журналы', to: '/system-settings/logs', permission: 'system.manage', roles: ADMIN },
  ] },
  { id: 'media', label: 'Медиатека', description: 'Общие изображения и файлы для редакторов.', icon: 'Images', items: [
    { id: 'media-library', label: 'Медиатека', to: '/media-library', permission: 'media.read', roles: INTERNAL, keywords: 'файлы изображения фото загрузки' },
  ] },
];

export function buildWorkspaceNavigation(role?: string | null, can: (permission?: string) => boolean = () => true): WorkspaceGroup[] {
  if (!role || !INTERNAL.includes(role)) return [];
  const order = ['dashboard', 'sales', 'catalog', 'site', 'marketing', 'crm', 'support', 'channels', 'reports', 'media', 'settings'];
  return WORKSPACE_NAVIGATION.map(group => ({ ...group, items: group.items.filter(item => item.roles.includes(role) && can(item.permission)) })).filter(group => group.items.length).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
export function flattenWorkspaceNavigation(groups: readonly WorkspaceGroup[]): WorkspaceDestination[] {
  return groups.flatMap(group => group.items.map(item => ({ ...item, groupId: group.id, groupLabel: group.label })));
}
const DEFAULT_SECTIONS: Record<string, string> = { '/admin-workspace': 'dashboard', '/crm-marketplaces': 'dashboard', '/helpdesk': 'overview', '/leadership': 'overview', '/system-settings': 'overview' };
export function findWorkspaceLeaf(groups: readonly WorkspaceGroup[], path: string, section?: unknown): WorkspaceDestination | null {
  if (Array.isArray(section)) return null;
  const current = String(section || DEFAULT_SECTIONS[path] || '');
  const destination = DEFAULT_SECTIONS[path] ? `${path}/${path === '/crm-marketplaces' && ['dashboard', 'settings'].includes(current) ? current === 'settings' ? 'integrations' : 'overview' : current}` : path;
  return flattenWorkspaceNavigation(groups).find(item => {
    const [itemPath, query] = item.to.split('?');
    return itemPath === destination && (!query || (new URLSearchParams(query).get('section') || '') === current);
  }) || null;
}
export function searchWorkspaceLeaves(groups: readonly WorkspaceGroup[], query: string): WorkspaceDestination[] {
  const terms = query.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').split(/\s+/).filter(Boolean);
  return flattenWorkspaceNavigation(groups).filter(item => {
    const text = `${item.label} ${item.groupLabel} ${item.keywords || ''}`.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
    return terms.every(term => text.includes(term));
  });
}
export function sanitizeWorkspacePreferences(value: unknown, groups: readonly WorkspaceGroup[]): WorkspacePreferences {
  const allowed = new Set(flattenWorkspaceNavigation(groups).map(item => item.id));
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const ids = (data: unknown, limit: number) => Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === 'string' && allowed.has(id)))].slice(0, limit) : [];
  return { favorites: ids(source.favorites, 12), recent: ids(source.recent, 8), start: typeof source.start === 'string' && allowed.has(source.start) ? source.start : null };
}

export function useWorkspaceNavigation() {
  const route = useRoute();
  const { user } = useWorkspaceSession();
  const access = useWorkspaceAccess();
  const groups = computed(() => buildWorkspaceNavigation(user.value?.role, access.can));
  const leaves = computed(() => flattenWorkspaceNavigation(groups.value));
  const active = computed(() => findWorkspaceLeaf(groups.value, route.path, route.query.section));
  const preferences = useState<WorkspacePreferences>('workspace-navigation-preferences', () => ({ favorites: [], recent: [], start: null }));
  const owner = useState<string>('workspace-navigation-preferences-owner', () => '');
  const paletteOpen = useState<boolean>('workspace-navigation-palette-open', () => false);
  const storageKey = () => user.value?.id ? `sarkisian-workspace-navigation:v1:${encodeURIComponent(user.value.id)}` : null;
  const resolved = computed(() => sanitizeWorkspacePreferences(preferences.value, groups.value));
  const favorites = computed(() => resolved.value.favorites.flatMap(id => leaves.value.filter(item => item.id === id)));
  const recent = computed(() => resolved.value.recent.flatMap(id => leaves.value.filter(item => item.id === id)));
  const start = computed(() => leaves.value.find(item => item.id === resolved.value.start) || null);
  const breadcrumbs = computed(() => active.value && active.value.id !== 'workspace' ? [
    { label: 'Рабочий стол', to: '/workspace' },
    { label: active.value.groupLabel, to: groups.value.find(group => group.id === active.value!.groupId)?.items[0]?.to || '/workspace' },
    { label: active.value.label, to: active.value.to },
  ] : [{ label: 'Рабочий стол', to: '/workspace' }]);
  function hydratePreferences() {
    if (!import.meta.client) return;
    const key = storageKey();
    if (owner.value === key) return;
    owner.value = key || '';
    let data: unknown = null;
    try { data = key ? JSON.parse(localStorage.getItem(key) || 'null') : null; } catch { /* Private browsing/storage failures are non-fatal. */ }
    preferences.value = sanitizeWorkspacePreferences(data, groups.value);
  }
  function persistPreferences() {
    if (!import.meta.client || !storageKey()) return;
    preferences.value = sanitizeWorkspacePreferences(preferences.value, groups.value);
    try { localStorage.setItem(storageKey()!, JSON.stringify(preferences.value)); } catch { /* No API fallback or personal-data writes. */ }
  }
  function toggleFavorite(id: string) {
    hydratePreferences();
    if (!leaves.value.some(item => item.id === id)) return;
    const ids = resolved.value.favorites;
    preferences.value = { ...resolved.value, favorites: ids.includes(id) ? ids.filter(value => value !== id) : [...ids.slice(0, 11), id] };
    persistPreferences();
  }
  function setStart(id: string | null) {
    hydratePreferences();
    if (id !== null && !leaves.value.some(item => item.id === id)) return;
    preferences.value = { ...resolved.value, start: id };
    persistPreferences();
  }
  function rememberCurrent() {
    hydratePreferences();
    if (!active.value || active.value.id === 'workspace') return;
    preferences.value = { ...resolved.value, recent: [active.value.id, ...resolved.value.recent.filter(id => id !== active.value!.id)].slice(0, 8) };
    persistPreferences();
  }
  onMounted(rememberCurrent);
  watch(() => `${user.value?.id || ''}:${user.value?.role || ''}:${route.fullPath}`, rememberCurrent);
  return { groups, leaves, active, breadcrumbs, favorites, recent, start, paletteOpen, toggleFavorite, setStart, search: (query: string) => searchWorkspaceLeaves(groups.value, query) };
}
