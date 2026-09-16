export default defineNuxtRouteMiddleware(to => {
  // Old drawer links used a name search for the new-arrivals collection.
  if (typeof to.query.search === 'string' && to.query.search.trim().toLowerCase() === 'нов') {
    const { search, page, ...query } = to.query;
    return navigateTo({ path: '/catalog', query: { ...query, sort: 'new' } }, { redirectCode: 302, replace: true });
  }
});
