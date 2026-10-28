export default defineNuxtPlugin(nuxtApp => {
  const session = useB2BSession();
  const sync = () => { if (session.hydrated.value) session.syncStoredSession(); };
  const storage = (event: StorageEvent) => { if (event.key === session.storageKey || event.key === null) sync(); };
  window.addEventListener('storage', storage); window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', sync);
  nuxtApp.vueApp.onUnmount(() => { window.removeEventListener('storage', storage); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); });
});
