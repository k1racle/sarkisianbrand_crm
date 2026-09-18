const sections: Record<string, readonly string[]> = {
  '/admin-workspace': ["dashboard","appearance","site-content","catalog-menu","pages","orders","products","categories","product-badges","customers","loyalty-settings","loyalty-members","promotions","gift-cards","referral-settings","referral-participants","referral-rewards","bloggers-overview","bloggers-participants","bloggers-registrations","bloggers-rewards","bloggers-payouts","bloggers-settings"],
  '/crm-marketplaces': ["overview","orders","integrations"],
  '/helpdesk': ["overview","tickets","queues","knowledge"],
  '/system-settings': ["overview","salon-subscription","accounts","trash","staff","access","integrations","bot-commands","audit","logs"],
  '/leadership': ["overview","sales","customers"],
};
export default defineNuxtRouteMiddleware(to => {
  const choices = sections[to.path];
  if (!choices) {
    if (Object.keys(sections).some(base => to.path.startsWith(base + '/')) && 'section' in to.query) {
      const query = { ...to.query }; delete query.section;
      return navigateTo({ path: to.path, query, hash: to.hash }, { replace: true });
    }
    return;
  }
  let section = typeof to.query.section === 'string' ? to.query.section : choices[0];
  if (to.path === '/crm-marketplaces') section = section === 'settings' ? 'integrations' : section === 'dashboard' ? 'overview' : section;
  if (!choices.includes(section)) section = choices[0];
  const query = { ...to.query }; delete query.section;
  return navigateTo({ path: to.path + '/' + section, query, hash: to.hash }, { replace: true });
});
