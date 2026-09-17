/** Shared single-flight mutation boundary. Failed actions keep the caller's draft intact. */
export function useWorkspaceOperation(error: Ref<string>) {
  const actionBusy = ref(false);
  async function runOperation(action: () => Promise<unknown>): Promise<boolean> {
    if (actionBusy.value) return false;
    actionBusy.value = true;
    error.value = '';
    try { await action(); return true; }
    catch (exception: any) {
      const message = exception?.data?.message;
      error.value = Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : 'Действие не выполнено. Повторите попытку.';
      return false;
    }
    finally { actionBusy.value = false; }
  }
  return { actionBusy, runOperation };
}
