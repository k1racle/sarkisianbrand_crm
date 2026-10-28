import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  // Keep the existing application paths and reactive data while upgrading Nuxt.
  srcDir: '.',
  dir: { app: 'app' },
  future: { compatibilityVersion: 4 },
  nitro: { publicAssets: [
    { dir: fileURLToPath(new URL('./node_modules/pdfjs-dist/cmaps/', import.meta.url)), baseURL: '/crm/pdf/cmaps' },
    { dir: fileURLToPath(new URL('./node_modules/pdfjs-dist/standard_fonts/', import.meta.url)), baseURL: '/crm/pdf/fonts' },
  ] },
  devtools: { enabled: true },
  experimental: { appManifest: false, defaults: { useAsyncData: { deep: true } } },
  css: ['~/assets/css/foundation.css', '~/assets/css/site.css', '~/assets/css/admin.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  routeRules: {
    '/admin': { redirect: '/admin-workspace' }, '/marketplaces': { redirect: '/crm-marketplaces' },
    '/booking/**': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Referrer-Policy': 'strict-origin-when-cross-origin' } },
    '/booking-manage/**': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    '/media-library': { headers: { 'X-Robots-Tag': 'noindex,nofollow' } },
    '/meeting-guest': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    '/meeting-guest/**': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    '/crm/**': { headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin' } },
    '/crm/sw.js': { headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'text/javascript; charset=utf-8' } },
    '/crm/manifest.webmanifest': { headers: { 'Content-Type': 'application/manifest+json' } },
  },
  runtimeConfig: {
    apiProxyBase: process.env.NUXT_API_PROXY_BASE || '',
    seoApiBase: process.env.NUXT_SEO_API_BASE || process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1',
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1', apiProxyEnabled: process.env.NUXT_PUBLIC_API_PROXY_ENABLED || 'false', apiRealtimePort: process.env.NUXT_PUBLIC_API_REALTIME_PORT || '', siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001', seoIndexingEnabled: process.env.NUXT_PUBLIC_SEO_INDEXING_ENABLED || 'false' },
  },
  app: {
    head: {
      title: 'SARKISIAN — материалы для мастеров',
      // Register cascade order before deferred CSS arrives. This also keeps
      // Chromium's first-render cascade cache consistent during hydration/HMR.
      style: [{ key: 'workspace-layer-order', tagPriority: 'critical', innerHTML: '@layer crm-workspace, heading-typography, business-theme, crm-theme, crm-elements, crm-shell, workspace-dialog-fields, workspace-banner-layout, workspace-layout, workspace-typography, workspace-shared, workspace-partner-controls;' }],
      meta: [
        { name: 'description', content: 'Профессиональные материалы SARKISIAN для мастеров маникюра' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
});
