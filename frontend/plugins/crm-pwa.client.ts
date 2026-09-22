import { isCrmPath } from '~/shared/crm-workspace';
import type { CrmInstallPrompt } from '~/composables/useCrmPwa';

export default defineNuxtPlugin(app => {
  const pwa = useCrmPwa();
  const display = window.matchMedia('(display-mode: standalone)');
  const syncOnline = () => { pwa.online.value = navigator.onLine; };
  const syncDisplay = () => { pwa.installed.value = display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone); };
  const prompt = (event: Event) => {
    if (!isCrmPath(app.$router.currentRoute.value.path)) return;
    event.preventDefault();
    pwa.installPrompt.value = event as CrmInstallPrompt;
  };
  const installed = () => { pwa.installed.value = true; pwa.installPrompt.value = null; pwa.installHelp.value = false; };
  pwa.ios.value = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  syncOnline(); syncDisplay();
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  window.addEventListener('beforeinstallprompt', prompt);
  window.addEventListener('appinstalled', installed);
  display.addEventListener('change', syncDisplay);
  let registered = false;
  async function register() {
    if (registered || !isCrmPath(app.$router.currentRoute.value.path) || !window.isSecureContext || !('serviceWorker' in navigator)) return;
    registered = true;
    try { await navigator.serviceWorker.register('/crm/sw.js', { scope: '/crm/', updateViaCache: 'none' }); }
    catch { registered = false; /* CRM remains available if installation is blocked by the browser. */ }
  }
  app.hook('app:mounted', register);
  const removeRouteHook = app.$router.afterEach(() => { void register(); });
  app.vueApp.onUnmount(() => {
    removeRouteHook();
    window.removeEventListener('online', syncOnline);
    window.removeEventListener('offline', syncOnline);
    window.removeEventListener('beforeinstallprompt', prompt);
    window.removeEventListener('appinstalled', installed);
    display.removeEventListener('change', syncDisplay);
  });
});
