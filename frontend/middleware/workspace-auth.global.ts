const workspaceRoutes = ['/workspace', '/admin-workspace', '/crm', '/crm-pipeline', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-chat', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;
  if (to.path === '/b2b' || to.path.startsWith('/b2b/')) {
    const b2b = useB2BSession(); b2b.hydrate();
    if (!b2b.token.value) return navigateTo({ path: '/b2b-login', query: { redirect: to.fullPath } });
    return;
  }
  if (to.path === '/b2b-login') {
    const b2b = useB2BSession(); b2b.hydrate();
    if (b2b.token.value) return navigateTo('/b2b');
    return;
  }
  const session = useWorkspaceSession();
  session.hydrate();
  const protectedRoute = workspaceRoutes.some(path => to.path === path || to.path.startsWith(`${path}/`));
  if (protectedRoute && !session.token.value) return navigateTo({ path: '/workspace-login', query: { redirect: to.fullPath } });
  if (to.path === '/workspace-login' && session.token.value) return navigateTo('/workspace');
  if (!session.user.value || session.user.value.role === 'ADMIN') return;
  const access: Record<string, string[]> = {
    '/admin-workspace': ['CONTENT_MANAGER', 'MANAGER_SALES', 'WAREHOUSE'],
    '/crm': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-pipeline': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-customers': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-organizations': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-tasks': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-chat': ['MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR'],
    '/crm-marketplaces': ['MARKETPLACE_MANAGER', 'SUPERVISOR', 'WAREHOUSE'],
    '/leadership': ['EXECUTIVE', 'SUPERVISOR'],
    '/helpdesk': ['IT_SUPPORT', 'SUPERVISOR'],
    '/system-settings': [],
  };
  const allowed = access[to.path];
  if (allowed && !allowed.includes(session.user.value.role)) return navigateTo('/workspace');
});
