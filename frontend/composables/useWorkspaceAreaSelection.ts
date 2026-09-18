import { WORKSPACE_AREAS } from '~/composables/useWorkspaceNavigation';

/** Shared selection: toolbar controls it, rail follows it; access filters both. */
export function useWorkspaceAreaSelection() {
  const router = useRouter();
  const { user } = useWorkspaceSession();
  const { groups, active } = useWorkspaceNavigation();
  const areas = computed(() => WORKSPACE_AREAS.filter(area => groups.value.some(group => (area.groupIds as readonly string[]).includes(group.id))));
  const selection = useState('workspace-studio-area', () => ({ owner: '', id: '' }));
  const selectedArea = computed(() => areas.value.find(area => area.id === selection.value.id && selection.value.owner === user.value?.id) || areas.value[0]);
  const visibleGroups = computed(() => groups.value.filter(group => (selectedArea.value?.groupIds as readonly string[] | undefined)?.includes(group.id)));
  const shopOverview = computed(() => groups.value.find(group => group.id === 'dashboard')?.items.find(item => item.id === 'web-dashboard'));
  watch(() => `${user.value?.id || ''}:${active.value?.id || ''}:${areas.value.map(area => area.id).join(',')}`, () => {
    const area = active.value?.id === 'web-dashboard' ? areas.value.find(item => item.id === 'site') : areas.value.find(item => (item.groupIds as readonly string[]).includes(active.value?.groupId || ''));
    if (selection.value.owner !== user.value?.id || area) selection.value = { owner: user.value?.id || '', id: area?.id || areas.value[0]?.id || '' };
  }, { immediate: true });
  async function switchArea(event: Event) {
    const select = event.target as HTMLSelectElement;
    const area = areas.value.find(item => item.id === select.value);
    if (!area) return;
    const destination = area.id === 'site' && shopOverview.value ? shopOverview.value : groups.value.find(group => (area.groupIds as readonly string[]).includes(group.id))?.items[0];
    if (!destination) { select.value = selectedArea.value?.id || ''; return; }
    const failure = await router.push(destination.to);
    if (!failure) selection.value = { owner: user.value?.id || '', id: area.id };
    else select.value = selectedArea.value?.id || '';
  }
  return { areas, selectedArea, visibleGroups, shopOverview, switchArea };
}
