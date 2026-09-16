export default defineNuxtConfig({
  devtools: { enabled: true },
  experimental: { appManifest: false },
  css: ['~/assets/css/main.css', '~/assets/css/design-system.css', '~/assets/css/storefront.css', '~/assets/css/storefront-glass.css', '~/assets/css/ecosystem-glass.css', '~/assets/css/typography.css', '~/assets/css/storefront-menu-admin.css', '~/assets/css/storefront-pages.css', '~/assets/css/storefront-system.css', '~/assets/css/storefront-checkout.css', '~/assets/css/storefront-filters.css', '~/assets/css/storefront-account.css', '~/assets/css/storefront-promotions-admin.css', '~/assets/css/storefront-gift-cards-admin.css', '~/assets/css/storefront-gift-products.css', '~/assets/css/storefront-catalog-menu-admin.css', '~/assets/css/admin-design-system.css', '~/assets/css/admin-media-library.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  routeRules: { '/admin': { redirect: '/admin-workspace' }, '/marketplaces': { redirect: '/crm-marketplaces' }, '/media-library': { headers: { 'X-Robots-Tag': 'noindex,nofollow' } } },
  runtimeConfig: {
    seoApiBase: process.env.NUXT_SEO_API_BASE || process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1',
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1', siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001', seoIndexingEnabled: process.env.NUXT_PUBLIC_SEO_INDEXING_ENABLED || 'false' },
  },
  app: {
    head: {
      title: 'SARKISIAN — материалы для мастеров',
      meta: [
        { name: 'description', content: 'Профессиональные материалы SARKISIAN для мастеров маникюра' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
});
