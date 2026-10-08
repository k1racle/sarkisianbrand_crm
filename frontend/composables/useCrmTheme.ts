export type CrmTheme = 'light' | 'dark';

export function useCrmTheme() {
  // SSR reads the saved palette before the first paint; shared state also reaches dialogs.
  const preference = useCookie<string>('sarkisian-crm-theme', {
    default: () => 'light', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/',
  });
  const theme = useState<CrmTheme>('crm-theme', () => preference.value === 'dark' ? 'dark' : 'light');
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    preference.value = theme.value;
  }
  return { theme, toggleTheme };
}
