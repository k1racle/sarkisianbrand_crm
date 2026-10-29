globalThis.__timing__.logStart('Load chunks/build/useCrmNavigation-DNjlvJcr');import { c as useRoute, g as useWorkspaceNavigation, h as crmNavigationItems, i as crmNavigationGroups, e as crmDestination, s as searchCrmNavigation } from '../virtual/entry.mjs';
import { computed } from 'vue';

// composables/useCrmNavigation.ts
function useCrmNavigation() {
	const route = useRoute();
	const workspace = useWorkspaceNavigation();
	const items = computed(() => crmNavigationItems(workspace.leaves.value));
	const groups = computed(() => crmNavigationGroups(items.value));
	const active = computed(() => items.value.find((item) => item.id === crmDestination(route.path)?.id));
	return {
		items,
		groups,
		active,
		favorites: computed(() => items.value.filter((item) => workspace.favorites.value.some((favorite) => favorite.id === item.id))),
		home: computed(() => items.value.find((item) => item.id === "crm-dashboard")?.to || items.value.find((item) => item.id !== "crm-chat")?.to || "/crm/"),
		moduleItems: computed(() => active.value?.parent ? items.value.filter((item) => item.parent === active.value.parent) : []),
		legacyAlternative: computed(() => items.value.find((item) => item.id === active.value?.sidebarFallbackFor)),
		search: (query) => searchCrmNavigation(items.value, query),
		toggleFavorite: workspace.toggleFavorite
	};
}

export { useCrmNavigation as u };;globalThis.__timing__.logEnd('Load chunks/build/useCrmNavigation-DNjlvJcr');
//# sourceMappingURL=useCrmNavigation-DNjlvJcr.mjs.map
