globalThis.__timing__.logStart('Load chunks/build/useWorkspaceOperation-DZ4fBozi');import { ref } from 'vue';

// composables/useWorkspaceOperation.ts
/** Shared single-flight mutation boundary. Failed actions keep the caller's draft intact. */
function useWorkspaceOperation(error) {
	const actionBusy = ref(false);
	async function runOperation(action) {
		if (actionBusy.value) return false;
		actionBusy.value = true;
		error.value = "";
		try {
			await action();
			return true;
		} catch (exception) {
			const message = exception?.data?.message;
			error.value = Array.isArray(message) ? message.join(", ") : typeof message === "string" ? message : "Действие не выполнено. Повторите попытку.";
			return false;
		} finally {
			actionBusy.value = false;
		}
	}
	return {
		actionBusy,
		runOperation
	};
}

export { useWorkspaceOperation as u };;globalThis.__timing__.logEnd('Load chunks/build/useWorkspaceOperation-DZ4fBozi');
//# sourceMappingURL=useWorkspaceOperation-DZ4fBozi.mjs.map
