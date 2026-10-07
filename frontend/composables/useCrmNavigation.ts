import { crmDestination, crmNavigationItems, crmNavigationGroups, searchCrmNavigation } from '~/shared/crm-workspace';

export function useCrmNavigation() {
  const route = useRoute();
  const workspace = useWorkspaceNavigation();
  const items = computed(() => crmNavigationItems(workspace.leaves.value));
  const groups = computed(() => crmNavigationGroups(items.value));
  const active = computed(() => items.value.find(item => item.id === crmDestination(route.path)?.id));
  const favorites = computed(() => items.value.filter(item => workspace.favorites.value.some(favorite => favorite.id === item.id)));
  // /crm/chat is an existing shortcut which returns home and opens the shared chat drawer.
  const home = computed(() => items.value.find(item => item.id !== 'crm-chat')?.to || '/crm/');
  const moduleItems = computed(() => active.value?.parent ? items.value.filter(item => item.parent === active.value!.parent) : []);
  const legacyAlternative = computed(() => items.value.find(item => item.id === active.value?.sidebarFallbackFor));
  return { items, groups, active, favorites, home, moduleItems, legacyAlternative, search: (query: string) => searchCrmNavigation(items.value, query), toggleFavorite: workspace.toggleFavorite };
}
