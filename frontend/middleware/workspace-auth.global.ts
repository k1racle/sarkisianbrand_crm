const workspaceRoutes = ['/workspace', '/admin-workspace', '/media-library', '/crm', '/crm-pipeline', '/crm-customers', '/crm-organizations', '/crm-tasks', '/crm-chat', '/crm-marketplaces', '/leadership', '/helpdesk', '/system-settings'];

import { CRM_DESTINATIONS, crmDestination, isCrmPath } from '~/shared/crm-workspace';
import { buildWorkspaceNavigation, flattenWorkspaceNavigation } from '~/composables/useWorkspaceNavigation';
import { safeInternalRedirect } from '~/shared/internal-redirect';

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
  if (isCrmPath(to.path)) {
    const signingOut = useState<boolean>('workspace-signing-out', () => false).value;
    if (to.path === '/crm/login') {
      if (session.token.value && !signingOut) {
        const redirect = safeInternalRedirect(to.query.redirect, '/crm/');
        return navigateTo(isCrmPath(redirect.split('?')[0].split('#')[0]) && !redirect.startsWith('/crm/login') ? redirect : '/crm/');
      }
      return;
    }
    if (!session.token.value) return navigateTo({ path: '/crm/login', query: { redirect: to.fullPath } });
    const access = useWorkspaceAccess();
    const allowed = flattenWorkspaceNavigation(buildWorkspaceNavigation(session.user.value?.role, access.can));
    const destination = crmDestination(to.path);
    if (destination && !allowed.some(item => item.id === destination.id)) {
      const first = CRM_DESTINATIONS.find(item => allowed.some(leaf => leaf.id === item.id));
      return navigateTo(first?.path || '/workspace');
    }
    if (!allowed.length) return navigateTo('/workspace');
    return;
  }
  const protectedRoute = workspaceRoutes.some(path => to.path === path || to.path.startsWith(`${path}/`));
  if (protectedRoute && !session.token.value) return navigateTo({ path: '/workspace-login', query: { redirect: to.fullPath } });
  if (to.path === '/workspace-login' && session.token.value && !useState<boolean>('workspace-signing-out', () => false).value) return navigateTo('/workspace');
  if (!session.user.value || session.user.value.role === 'ADMIN') return;
  const access: Record<string, string[]> = {
    '/admin-workspace': ['CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE'],
    '/media-library': ['CONTENT_MANAGER', 'MANAGER_SALES', 'MANAGER_B2B', 'MARKETPLACE_MANAGER', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT', 'WAREHOUSE', 'CURATOR'],
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
  const family = Object.keys(access).find(path => to.path === path || to.path.startsWith(`${path}/`));
  const allowed = family ? access[family] : undefined;
  if (allowed && !allowed.includes(session.user.value.role)) return navigateTo('/workspace');
});
