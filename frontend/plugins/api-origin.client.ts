import { browserApiBase } from '~/shared/api-origin';

export default defineNuxtPlugin({
  name: 'api-origin',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig();
    // Keep an absolute base for existing media URL resolvers, using this tab's
    // origin rather than an IP persisted in an old local environment file.
    config.public.apiBase = browserApiBase(String(config.public.apiBase), window.location.origin, config.public.apiProxyEnabled);
  },
});
