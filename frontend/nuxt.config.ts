export default defineNuxtConfig({
  devtools: { enabled: true },
  experimental: { appManifest: false },
  css: ['~/assets/css/foundation.css', '~/assets/css/site.css', '~/assets/css/admin.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  routeRules: { '/admin': { redirect: '/admin-workspace' }, '/marketplaces': { redirect: '/crm-marketplaces' }, '/booking/**': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Referrer-Policy': 'strict-origin-when-cross-origin' } }, '/media-library': { headers: { 'X-Robots-Tag': 'noindex,nofollow' } } },
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
