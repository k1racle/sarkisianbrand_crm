globalThis.__timing__.logStart('Load chunks/build/useContextMenu-CQeSn2KJ');import { j as useState } from '../virtual/entry.mjs';
import { readonly } from 'vue';

// composables/useContextMenu.ts
function useContextMenu() {
	const state = useState("workspace-context-menu", () => ({
		visible: false,
		x: 0,
		y: 0,
		title: "",
		items: []
	}));
	function openContextMenu(event, title, items, subtitle) {
		event.preventDefault();
		state.value = {
			visible: true,
			x: event.clientX,
			y: event.clientY,
			title,
			subtitle,
			items: items.filter(Boolean)
		};
	}
	function closeContextMenu() {
		state.value = {
			...state.value,
			visible: false
		};
	}
	async function copyText(value, message = "Скопировано") {
		await (void 0).clipboard.writeText(value);
		(void 0).dispatchEvent(new CustomEvent("workspace-notice", { detail: message }));
	}
	return {
		contextMenuState: readonly(state),
		openContextMenu,
		closeContextMenu,
		copyText
	};
}

export { useContextMenu as u };;globalThis.__timing__.logEnd('Load chunks/build/useContextMenu-CQeSn2KJ');
//# sourceMappingURL=useContextMenu-CQeSn2KJ.mjs.map
