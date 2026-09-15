export default defineNuxtPlugin(async () => {
  const session = useWorkspaceSession();
  session.hydrate();
  if (session.token.value) await session.restoreUser();
});
