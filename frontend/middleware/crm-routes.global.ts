import { CRM_LEGACY_ROUTES } from '~/shared/crm-workspace';
export default defineNuxtRouteMiddleware(to => {
  const path = to.path === '/crm' ? '/crm/' : CRM_LEGACY_ROUTES[to.path];
  if (path) return navigateTo({ path, query: to.query, hash: to.hash }, { replace: true, redirectCode: 302 });
});
