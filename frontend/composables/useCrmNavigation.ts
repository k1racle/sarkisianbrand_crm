import { CRM_DESTINATIONS, crmDestination } from '~/shared/crm-workspace';

export function useCrmNavigation() {
  const route = useRoute();
  const workspace = useWorkspaceNavigation();
  const items = computed(() => CRM_DESTINATIONS.flatMap(destination => {
    const source = workspace.leaves.value.find(item => item.id === destination.id);
    if (!source) return [];
    return [{ ...source, ...destination, to: destination.path,
      label: source.id === 'crm-dashboard' ? 'Мой день' : source.id === 'loyalty-members' ? 'Участники клуба' : source.id === 'loyalty-settings' ? 'Правила клуба' : source.id.startsWith('referral-') ? `Рекомендации · ${source.label}` : source.label }];
  }));
  const groups = computed(() => [...new Set(items.value.map(item => item.group))].map(label => ({ label, items: items.value.filter(item => item.group === label) })));
  const active = computed(() => items.value.find(item => item.id === crmDestination(route.path)?.id));
  const favorites = computed(() => items.value.filter(item => workspace.favorites.value.some(favorite => favorite.id === item.id)));
  const home = computed(() => items.value[0]?.to || '/workspace');
  return { items, groups, active, favorites, home, toggleFavorite: workspace.toggleFavorite };
}
