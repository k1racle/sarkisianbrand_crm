/** Layout preference only: independent of business data, roles and mobile navigation. */
export function useWorkspaceLayout() {
  const railCollapsed = useState<boolean>('workspace-rail-collapsed', () => false);
  const hydrated = useState<boolean>('workspace-layout-hydrated', () => false);
  const storageKey = 'sarkisian-workspace-rail-collapsed';

  onMounted(() => {
    if (hydrated.value) return;
    hydrated.value = true;
    try { railCollapsed.value = localStorage.getItem(storageKey) === 'true'; } catch { /* Storage can be disabled. */ }
  });

  function setRailCollapsed(collapsed: boolean) {
    railCollapsed.value = collapsed;
    if (import.meta.client) {
      try { localStorage.setItem(storageKey, String(collapsed)); } catch { /* In-memory layout still works. */ }
    }
  }

  return { railCollapsed, setRailCollapsed, toggleRail: () => setRailCollapsed(!railCollapsed.value) };
}
