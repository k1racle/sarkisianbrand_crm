import { crmLegacyPath } from '~/shared/crm-workspace';
export default defineNuxtRouteMiddleware(to => {
  const path = to.path === '/crm' ? '/crm/' : crmLegacyPath(to.path, to.query.section);
  if (path) return navigateTo({ path, query: to.query, hash: to.hash }, { replace: true, redirectCode: 302 });
});
