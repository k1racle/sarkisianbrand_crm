import { homeEnglish } from '~/shared/home-locale';

export const homeRegions = [
  { id: 'ru', label: 'Россия · ₽', currency: 'RUB', language: 'ru', flag: 'ru' },
  { id: 'en', label: 'English · $', currency: 'USD', language: 'en', flag: 'gb' },
  { id: 'ae', label: 'UAE · AED', currency: 'AED', language: 'en', flag: 'ae' },
  { id: 'eu', label: 'Europe · €', currency: 'EUR', language: 'en', flag: 'eu' },
] as const;
type Rates = { date: string; rates: Record<string, number> };

export function useHomeLocale() {
  const preference = useCookie<string>('sb-home-region', { default: () => 'ru', sameSite: 'lax', maxAge: 31536000 });
  const region = computed(() => homeRegions.find(item => item.id === preference.value) || homeRegions[0]);
  const english = computed(() => region.value.language === 'en');
  const rates = useState<Rates | null>('home-exchange-rates', () => null);
  const ratesLoading = useState('home-exchange-loading', () => false);
  const ratesError = useState('home-exchange-error', () => false);
  const t = (text: string) => english.value ? homeEnglish[text] || text : text;
  async function loadRates() {
    if (region.value.currency === 'RUB' || rates.value || ratesLoading.value) return;
    ratesLoading.value = true;
    ratesError.value = false;
    try { rates.value = await $fetch<Rates>('/api/storefront/exchange-rates'); }
    catch { ratesError.value = true; }
    finally { ratesLoading.value = false; }
  }
  function selectRegion(id: string) {
    if (!homeRegions.some(item => item.id === id)) return;
    preference.value = id;
    void loadRates();
  }
  function formatPrice(value: number, sourceCurrency = 'RUB') {
    const rate = sourceCurrency === 'RUB' ? rates.value?.rates[region.value.currency] : undefined;
    const converted = region.value.currency !== 'RUB' && !!rate;
    const currency = converted ? region.value.currency : sourceCurrency;
    return `${converted ? '≈ ' : ''}${new Intl.NumberFormat(english.value ? 'en-US' : 'ru-RU', {
      style: 'currency', currency, minimumFractionDigits: converted ? 2 : 0, maximumFractionDigits: 2,
    }).format(converted ? value / rate! : value)}`;
  }
  return { region, english, t, rates, ratesLoading, ratesError, loadRates, selectRegion, formatPrice };
}
