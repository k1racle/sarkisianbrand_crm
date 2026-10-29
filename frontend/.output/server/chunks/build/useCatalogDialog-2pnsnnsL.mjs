globalThis.__timing__.logStart('Load chunks/build/useCatalogDialog-2pnsnnsL');import { ref, watch } from 'vue';

// composables/useCatalogDialog.ts
function useCatalogDialog(open, close) {
	const panel = ref(null);
	watch(open, async (value) => {});
	function keyboard(event) {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}
		if (event.key !== "Tab" || !panel.value) return;
		const controls = [...panel.value.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex=\"0\"]")].filter((el) => el.getClientRects().length);
		const first = controls[0], last = controls.at(-1);
		if (!first) {
			event.preventDefault();
			panel.value.focus();
			return;
		}
		if (event.shiftKey && ((void 0).activeElement === first || (void 0).activeElement === panel.value)) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && ((void 0).activeElement === last || (void 0).activeElement === panel.value)) {
			event.preventDefault();
			first.focus();
		}
	}
	return {
		panel,
		keyboard
	};
}

export { useCatalogDialog as u };;globalThis.__timing__.logEnd('Load chunks/build/useCatalogDialog-2pnsnnsL');
//# sourceMappingURL=useCatalogDialog-2pnsnnsL.mjs.map
