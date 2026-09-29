export default defineNuxtPlugin(async () => {
  // Opening a guest link must not restore an existing CRM login in this browser.
  if (/^\/meeting-guest\/?$/.test(window.location.pathname)) return;
  const session = useWorkspaceSession();
  session.hydrate();
  if (session.token.value) await session.restoreUser();
});
