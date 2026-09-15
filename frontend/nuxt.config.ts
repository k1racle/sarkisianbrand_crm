export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', '~/assets/css/design-system.css'],
  routeRules: { '/admin': { redirect: '/admin-workspace' }, '/marketplaces': { redirect: '/crm-marketplaces' } },
  runtimeConfig: {
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1' },
  },
  app: {
    head: {
      title: 'SARKISIAN — материалы для мастеров',
      meta: [{ name: 'description', content: 'Профессиональные материалы SARKISIAN для мастеров маникюра' }],
    },
  },
});
