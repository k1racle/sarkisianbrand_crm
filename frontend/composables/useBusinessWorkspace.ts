const purchasingSections = new Set(['purchases', 'catalog', 'orders']);

export function useBusinessWorkspace() {
  const route = useRoute();
  const canUseSalon = useState<boolean>('business-can-use-salon', () => true);
  const section = computed(() => String(route.query.section || 'dashboard'));
  const area = computed(() => !canUseSalon.value ? 'purchases' : purchasingSections.has(section.value) ? 'purchases' : ['dashboard', 'calendar', 'clients', 'services', 'online-booking'].includes(section.value) ? 'salon' : route.query.area === 'purchases' ? 'purchases' : 'salon');
  const label = computed(() => area.value === 'salon' ? 'Мой салон' : 'Закупки SARKISIAN');
  const path = (id: string) => id === 'dashboard' ? '/b2b' : `/b2b?section=${id}${['team', 'support','settings'].includes(id) ? `&area=${area.value}` : ''}`;
  async function switchArea(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    await navigateTo(value === 'purchases' ? '/b2b?section=purchases' : '/b2b');
    // Restore the displayed value if a dirty-form route guard rejects navigation.
    (event.target as HTMLSelectElement).value = area.value;
  }
  return { area, section, label, path, switchArea, canUseSalon };
}
