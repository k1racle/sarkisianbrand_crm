export type CrmDensity = 'compact' | 'comfortable';

function preferences(value: unknown): Record<string, CrmDensity> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, mode]) => id.length <= 180 && (mode === 'compact' || mode === 'comfortable')).slice(-24));
}

/** Non-sensitive display preferences only. No reload, record changes or API calls. */
export function useCrmDensity() {
  const { user } = useWorkspaceSession();
  const cookie = useCookie<Record<string, CrmDensity>>('sarkisian-crm-density-v1', { default: () => ({}), sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  const saved = useState<Record<string, CrmDensity>>('crm-density-preferences', () => preferences(cookie.value));
  const density = computed<CrmDensity>(() => user.value?.id && Object.hasOwn(saved.value, user.value.id) ? saved.value[user.value.id] : 'compact');
  function setDensity(value: CrmDensity) {
    if (!user.value?.id || !['compact', 'comfortable'].includes(value)) return;
    const next = preferences({ ...saved.value, [user.value.id]: value });
    saved.value = next; cookie.value = next;
  }
  return { density, setDensity, toggleDensity: () => setDensity(density.value === 'compact' ? 'comfortable' : 'compact') };
}
