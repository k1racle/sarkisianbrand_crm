import { paymentProviderList, type PaymentProviderCapability, type StorefrontPaymentProvider } from '~/shared/payment-providers';

export function usePaymentProviders() {
  const config = useRuntimeConfig();
  const providers = ref<PaymentProviderCapability[]>([]), selected = ref<StorefrontPaymentProvider | ''>(''), pending = ref(true), error = ref('');
  const available = computed(() => providers.value.filter(item => item.available));
  const choice = computed(() => available.value.find(item => item.provider === selected.value));
  let version = 0;
  async function load(preserveSelection = false) {
    const current = ++version; pending.value = true; error.value = '';
    try {
      const response = await $fetch('/payments/providers', { baseURL: config.public.apiBase, timeout: 10000, retry: 0 });
      if (current !== version) return;
      providers.value = paymentProviderList(response);
      if (!preserveSelection && !available.value.some(item => item.provider === selected.value)) selected.value = available.value[0]?.provider || '';
    } catch {
      if (current !== version) return;
      providers.value = []; error.value = 'Не удалось проверить доступность онлайн-оплаты. Повторите попытку позже.';
    } finally { if (current === version) pending.value = false; }
  }
  onBeforeUnmount(() => { version++; });
  return { providers, available, selected, choice, pending, error, load };
}
