<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, Mail, MapPin, ShoppingBag, Trash2, Truck, UserRound, X } from '@lucide/vue';

type DeliveryMethod = 'COURIER' | 'PICKUP_POINT';
type ShippingProvider = 'CDEK' | 'OZON_DELIVERY';
type PublicQuote = { subtotal: number; discount: number; bonusAmount: number; giftCardAmount: number; digitalDelivery: boolean; shippingAmount: number | null; total: number; currency: string; deliveryConfirmed: boolean; maxBonusAmount: number; earnEstimate: number; messages: string[]; canPay: boolean };
type CheckoutIntent = { key: string; fingerprint: string; body: Record<string, any>; uncertain: boolean; quote?: PublicQuote; giftCodeHash?: string; needsGiftCardCode?: boolean };
type PickupPoint = { code: string; name: string; address: string; cityCode?: number; workTime?: string };
type ShippingCity = { code: number; city: string; region: string; country: string; countryCode: string };

const config = useRuntimeConfig();
const partnerToken=useCookie<string|null>('sb-partner-attribution');
// Checkout must remain private even before parent replaces the cart page SEO hook.
useSeoMeta({ robots: 'noindex, nofollow' });
const { cartSession, cart, loadCart, user, accessToken, authHeaders } = useStorefront();
const { openAuth } = useStorefrontPanels();
const loading = ref(true), busy = ref(false), modifying = ref(false), error = ref(''), quoteError = ref('');
const success = ref<any>(null), step = ref(1), accepted = ref(false), formElement = ref<HTMLFormElement>();
const contact = reactive({ firstName: '', lastName: '', email: '', phone: '' });
const address = reactive({ city: '', street: '', house: '', apartment: '', pickupPointName: '', pickupPointAddress: '', cityCode: '' });
const deliveryMethod = ref<DeliveryMethod>('COURIER'), shippingProvider = ref<ShippingProvider>('CDEK'), comments = ref('');
const promoInput = ref(''), promoCode = ref(''), useBonuses = ref(false);
const giftInput = ref(''), giftCardCode = ref(''), giftCodeHash = ref(''), giftRecoveryInput = ref(''), giftError = ref('');
const quote = ref<PublicQuote | null>(null), quotePending = ref(false), shippingPending = ref(false);
const shippingCapabilities = ref<any[]>([]), paymentCapability = ref<any>(null), capabilitiesPending = ref(true);
const shippingResult = ref<any>(null), pickupPoints = ref<PickupPoint[]>([]), pickupCode = ref(''), pickupPending = ref(false), pickupMessage = ref('');
const savedAddresses = ref<any[]>([]), savedAddressId = ref(''), addressesError = ref('');
const cities = ref<ShippingCity[]>([]), selectedCity = ref<ShippingCity | null>(null), cityPending = ref(false), cityMessage = ref(''), cityActive = ref(-1);
const intent = ref<CheckoutIntent | null>(null);
const isGiftOrder = computed(() => cart.value?.items?.length ? cart.value.items.every((item: any) => item.variant?.product?.productType === 'GIFT_CARD') : intent.value?.quote?.digitalDelivery === true || quote.value?.digitalDelivery === true);
const mixedBasket = computed(() => Boolean(cart.value?.items?.some((item: any) => item.variant?.product?.productType === 'GIFT_CARD') && cart.value?.items?.some((item: any) => item.variant?.product?.productType !== 'GIFT_CARD')));
const steps = computed(() => ['Корзина', 'Контактные данные', isGiftOrder.value ? 'Получение карты' : 'Доставка', 'Проверка и оплата']);
const locked = computed(() => busy.value || Boolean(intent.value?.uncertain));
const contactValid = computed(() => Boolean(contact.firstName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) && /^(?=(?:\D*\d){7,})\+?[\d\s()-]{7,24}$/.test(contact.phone.trim())));
const cityCode = computed(() => shippingProvider.value === 'CDEK' && selectedCity.value?.city === address.city.trim() && selectedCity.value.code === Number(address.cityCode) ? selectedCity.value.code : undefined);
const capability = computed(() => shippingCapabilities.value.find(item => item.provider === shippingProvider.value));
const actualPoint = computed(() => pickupPoints.value.find(point => point.code === pickupCode.value));
const deliveryValid = computed(() => isGiftOrder.value ? contactValid.value : Boolean(address.city.trim() && (deliveryMethod.value === 'COURIER' ? address.street.trim() && address.house.trim() : actualPoint.value || (address.pickupPointName.trim() && address.pickupPointAddress.trim()))));
const basketTotal = computed(() => Number(cart.value?.total || 0));
const displayTotal = computed(() => step.value <= 2 && quote.value ? quote.value.subtotal - quote.value.discount : quote.value?.total ?? basketTotal.value);
const summaryMessages = computed(() => (quote.value?.messages || []).filter(message => {
  // Hide only known informational copy duplicated by the delivery row/review.
  // Pricing errors and other warnings remain visible, including on the cart step.
  if (/^Стоимость доставки (?:пока не рассчитана|подтвердим до оплаты)/i.test(message)) return false;
  if (step.value < 4 && /^Списание бонусов доступно участникам SARKISIAN CLUB/i.test(message)) return false;
  return true;
}));
const deliveryLabel = computed(() => isGiftOrder.value ? 'Электронная подарочная карта' : deliveryMethod.value === 'COURIER' ? 'Курьером до двери' : 'В пункт выдачи');
const deliveryAddress = computed(() => isGiftOrder.value ? contact.email.trim() : [address.city, deliveryMethod.value === 'COURIER' ? [address.street, 'д. ' + address.house, address.apartment ? 'кв. ' + address.apartment : ''].filter(Boolean).join(', ') : [actualPoint.value?.name || address.pickupPointName, actualPoint.value?.address || address.pickupPointAddress].join(', ')].join(', '));
const draftKey = computed(() => 'sb-checkout-draft:' + cartSession.value);
const canSubmit = computed(() => !busy.value && !mixedBasket.value && accepted.value && (Boolean(intent.value?.uncertain && !intent.value.needsGiftCardCode) || (!intent.value?.uncertain && contactValid.value && deliveryValid.value && Boolean(quote.value) && !quotePending.value && !shippingPending.value && !quoteError.value)));
const coveredByGift = computed(() => !isGiftOrder.value && quote.value?.total === 0 && quote.value.giftCardAmount > 0 && quote.value.deliveryConfirmed && quote.value.canPay);
const onlinePayment = computed(() => quote.value?.canPay === true && quote.value.total > 0 && quote.value.deliveryConfirmed === true && paymentCapability.value?.available === true);
const basketSignature = computed(() => JSON.stringify((cart.value?.items || []).map((item: any) => ({ id: item.variantId || item.variant?.id || item.id, quantity: item.quantity, price: String(item.variant?.price ?? item.price ?? '') })).sort((a: any, b: any) => a.id.localeCompare(b.id))));
let ready = false, quoteVersion = 0, shippingVersion = 0, pointsVersion = 0, addressesVersion = 0, citiesVersion = 0;
let quoteTimer: ReturnType<typeof setTimeout> | undefined, shippingTimer: ReturnType<typeof setTimeout> | undefined;
let citiesTimer: ReturnType<typeof setTimeout> | undefined;
let quoteAbort: AbortController | undefined, shippingAbort: AbortController | undefined, pointsAbort: AbortController | undefined;
let citiesAbort: AbortController | undefined;

function friendlyError(e: any) {
  const message = e?.data?.message;
  return Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
}
function money(value: number) { return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽'; }
function cleanContact() { return Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()])); }
function shippingAddress() {
  if (isGiftOrder.value) return {};
  return {
    country: 'Россия', city: address.city.trim(), ...(cityCode.value ? { cityCode: cityCode.value, region: selectedCity.value!.region } : {}),
    recipientName: [contact.firstName.trim(), contact.lastName.trim()].filter(Boolean).join(' '), phone: contact.phone.trim(),
    ...(deliveryMethod.value === 'COURIER'
      ? { street: address.street.trim(), house: address.house.trim(), apartment: address.apartment.trim(), address: [address.street.trim(), address.house.trim(), address.apartment.trim()].filter(Boolean).join(', ') }
      : { pickupPointName: actualPoint.value?.name || address.pickupPointName.trim(), address: actualPoint.value?.address || address.pickupPointAddress.trim(),
          ...(actualPoint.value ? { pickupPointCode: actualPoint.value.code } : { pickupPointRequested: true }) }),
  };
}
function requestBody(includeQuote = true): Record<string, any> {
  return {
    ...(/^[a-f0-9]{64}$/.test(partnerToken.value||'')?{partnerToken:partnerToken.value}:{}),
    ...(contactValid.value ? { contact: cleanContact() } : {}), shippingAddress: shippingAddress(),
    ...(isGiftOrder.value ? { deliveryMethod: 'DIGITAL' } : {}),
    ...(!isGiftOrder.value ? {
      deliveryMethod: deliveryMethod.value, shippingProvider: shippingProvider.value,
      ...(includeQuote && shippingResult.value?.quoteId ? { shippingQuoteId: shippingResult.value.quoteId } : {}),
      ...(promoCode.value ? { promoCode: promoCode.value } : {}), useBonuses: Boolean(step.value === 4 && accessToken.value && useBonuses.value),
      ...(step.value === 4 && giftCardCode.value ? { giftCardCode: giftCardCode.value } : {}),
    } : {}),
    ...(comments.value.trim() ? { comments: comments.value.trim() } : {}),
  };
}
function fingerprint() { const { giftCardCode: _secret, ...input } = requestBody(false); return JSON.stringify({ basket: basketSignature.value, input: { ...input, contact: cleanContact() }, giftCodeHash: step.value === 4 && !isGiftOrder.value ? giftCodeHash.value : '', customer: user.value?.id || null }); }
function persistDraft() {
  if (!ready || success.value) return;
  try {
    const persistedIntent = intent.value ? { ...intent.value, body: { ...intent.value.body } } : null;
    if (persistedIntent?.body.giftCardCode) {
      delete persistedIntent.body.giftCardCode;
      persistedIntent.needsGiftCardCode = true;
    }
    sessionStorage.setItem(draftKey.value, JSON.stringify({ contact, address, deliveryMethod: deliveryMethod.value, shippingProvider: shippingProvider.value, pickupCode: pickupCode.value, promoCode: promoCode.value, promoInput: promoInput.value, useBonuses: useBonuses.value, comments: comments.value, step: step.value, intent: persistedIntent, expires: Date.now() + 2 * 60 * 60 * 1000 }));
  } catch { /* Optional storage; intent remains in memory during this attempt. */ }
}
function go(next: number) {
  if (locked.value || modifying.value || next < 1 || next > 4) return;
  if (next > 2 && !contactValid.value) { step.value = 2; return; }
  if (next > 3 && !deliveryValid.value) { step.value = 3; return; }
  error.value = ''; step.value = next;
  nextTick(() => document.querySelector('.sb-checkout-heading')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
}
function nextStep() { if (!formElement.value || formElement.value.reportValidity()) go(step.value + 1); }

function normalizedQuote(value: any): PublicQuote {
  const numeric = ['subtotal', 'discount', 'bonusAmount', 'total', 'maxBonusAmount', 'earnEstimate'] as const;
  const result = { ...value };
  for (const field of numeric) {
    if (value?.[field] === null || value?.[field] === undefined || !Number.isFinite(Number(value[field])) || Number(value[field]) < 0) throw new Error('Invalid quote');
    result[field] = Number(value[field]);
  }
  if (value.shippingAmount !== null && (value.shippingAmount === undefined || !Number.isFinite(Number(value.shippingAmount)) || Number(value.shippingAmount) < 0)) throw new Error('Invalid shipping amount');
  result.shippingAmount = value.shippingAmount === null ? null : Number(value.shippingAmount);
  result.giftCardAmount = Number(value.giftCardAmount ?? 0);
  if (!Number.isFinite(result.giftCardAmount) || result.giftCardAmount < 0) throw new Error('Invalid gift card amount');
  result.digitalDelivery = value.digitalDelivery === true;
  if (value.currency !== 'RUB' || typeof value.deliveryConfirmed !== 'boolean' || typeof value.canPay !== 'boolean') throw new Error('Invalid quote flags');
  result.messages = Array.isArray(value.messages) ? value.messages.filter((item: unknown) => typeof item === 'string') : [];
  return result;
}
function queueQuote() {
  if (intent.value?.uncertain) { quotePending.value = false; return; }
  quoteVersion++; quoteAbort?.abort(); clearTimeout(quoteTimer); quote.value = null; quoteError.value = '';
  quotePending.value = ready && Boolean(cart.value?.items?.length) && !intent.value?.uncertain && !success.value;
  if (quotePending.value) quoteTimer = setTimeout(refreshQuote, 300);
}
async function refreshQuote() {
  clearTimeout(quoteTimer);
  if (!ready || !cart.value?.items?.length || success.value || intent.value?.uncertain) { quotePending.value = false; return; }
  const version = ++quoteVersion;
  quoteAbort?.abort(); quoteAbort = new AbortController();
  quotePending.value = true; quoteError.value = '';
  try {
    const value = await $fetch('/orders/quote', { baseURL: config.public.apiBase, method: 'POST', headers: { ...authHeaders.value, 'x-cart-session': cartSession.value }, body: requestBody(), signal: quoteAbort.signal, timeout: 15000, retry: 0 });
    if (version === quoteVersion) quote.value = normalizedQuote(value);
  } catch (e: any) {
    if (version === quoteVersion) { quote.value = null; quoteError.value = friendlyError(e); }
  } finally { if (version === quoteVersion) quotePending.value = false; }
}
function applyPromo() { if (!locked.value) { promoCode.value = promoInput.value.trim(); queueQuote(); persistDraft(); } }
function clearPromo() { if (!locked.value) { promoCode.value = ''; promoInput.value = ''; queueQuote(); persistDraft(); } }
async function hashGiftCode(code: string) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function applyGiftCard() {
  if (locked.value || isGiftOrder.value || step.value !== 4) return;
  giftError.value = '';
  try {
    const code = giftInput.value.trim(), digest = await hashGiftCode(code);
    if (locked.value || step.value !== 4 || isGiftOrder.value || code !== giftInput.value.trim()) return;
    giftCodeHash.value = digest; giftCardCode.value = code; queueQuote();
  } catch { giftError.value = 'Не удалось безопасно применить код. Попробуйте ещё раз.'; }
}
function clearGiftCard() { if (!locked.value) { giftInput.value = ''; giftCardCode.value = ''; giftCodeHash.value = ''; giftError.value = ''; queueQuote(); } }
async function restoreGiftCardCode() {
  if (!intent.value?.uncertain || !intent.value.needsGiftCardCode || busy.value) return;
  giftError.value = '';
  try {
    const current = intent.value, code = giftRecoveryInput.value.trim();
    if (await hashGiftCode(code) !== current.giftCodeHash) { giftError.value = 'Введите тот же код подарочной карты, который использовали при отправке заказа.'; return; }
    if (intent.value !== current) return;
    current.body.giftCardCode = code; current.needsGiftCardCode = false; giftRecoveryInput.value = ''; persistDraft();
  } catch { giftError.value = 'Не удалось проверить код. Повторите попытку.'; }
}

function invalidateShipping() {
  shippingVersion++; shippingAbort?.abort(); clearTimeout(shippingTimer);
  shippingResult.value = null; shippingPending.value = false;
  queueQuote();
  if (ready && !isGiftOrder.value && !locked.value && !success.value && step.value >= 3 && deliveryValid.value && capability.value?.available === true && capability.value?.canEstimate === true && cityCode.value && (deliveryMethod.value === 'COURIER' || actualPoint.value)) {
    shippingPending.value = true; shippingTimer = setTimeout(estimateShipping, 350);
  }
}
async function estimateShipping() {
  clearTimeout(shippingTimer);
  if (isGiftOrder.value || capability.value?.available !== true || capability.value?.canEstimate !== true || !cityCode.value || !deliveryValid.value || locked.value) { shippingPending.value = false; return; }
  if (deliveryMethod.value === 'PICKUP_POINT' && !actualPoint.value) { shippingPending.value = false; return; }
  const version = ++shippingVersion;
  shippingAbort?.abort(); shippingAbort = new AbortController();
  shippingPending.value = true;
  try {
    const result: any = await $fetch('/shipping/estimate', {
      baseURL: config.public.apiBase, method: 'POST', headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
      body: { provider: shippingProvider.value, deliveryMethod: deliveryMethod.value, city: address.city.trim(), cityCode: cityCode.value,
        ...(deliveryMethod.value === 'COURIER' ? { street: address.street.trim(), house: address.house.trim() } : { pickupPointCode: actualPoint.value!.code }) },
      signal: shippingAbort.signal, timeout: 20000, retry: 0,
    });
    if (version !== shippingVersion) return;
    shippingResult.value = result;
  } catch (e: any) {
    if (version === shippingVersion) shippingResult.value = { amount: null, requiresConfirmation: true, message: friendlyError(e) };
  } finally {
    if (version === shippingVersion) { shippingPending.value = false; queueQuote(); }
  }
}
async function loadPickupPoints() {
  const version = ++pointsVersion;
  pointsAbort?.abort(); pointsAbort = new AbortController();
  pickupPoints.value = []; pickupCode.value = ''; pickupMessage.value = ''; pickupPending.value = false;
  if (!ready || isGiftOrder.value || deliveryMethod.value !== 'PICKUP_POINT' || !cityCode.value || capability.value?.available !== true || capability.value?.canListPickupPoints !== true || locked.value) return;
  pickupPending.value = true;
  try {
    const result: any = await $fetch('/shipping/pickup-points', { baseURL: config.public.apiBase, query: { provider: shippingProvider.value, cityCode: cityCode.value }, signal: pointsAbort.signal, timeout: 20000, retry: 0 });
    if (version !== pointsVersion) return;
    pickupPoints.value = result.available === true && Array.isArray(result.points) ? result.points.filter((point: any) => typeof point.code === 'string' && typeof point.name === 'string' && typeof point.address === 'string') : [];
    pickupMessage.value = result.message || '';
  } catch (e: any) { if (version === pointsVersion) pickupMessage.value = friendlyError(e); }
  finally { if (version === pointsVersion) pickupPending.value = false; }
}
async function loadAddresses() {
  const version = ++addressesVersion;
  savedAddresses.value = []; addressesError.value = '';
  if (!accessToken.value || isGiftOrder.value) return;
  try {
    const items = await $fetch<any[]>('/storefront/addresses', { baseURL: config.public.apiBase, headers: authHeaders.value, timeout: 10000, retry: 0 });
    if (version === addressesVersion) savedAddresses.value = Array.isArray(items) ? items : [];
  } catch { if (version === addressesVersion) addressesError.value = 'Сохранённые адреса недоступны. Можно заполнить адрес вручную.'; }
}
function selectAddress() {
  const saved = savedAddresses.value.find(item => item.id === savedAddressId.value);
  if (!saved || locked.value) return;
  deliveryMethod.value = 'COURIER';
  for (const key of ['city', 'street', 'house', 'apartment'] as const) address[key] = String(saved[key] || '');
  // Re-select a current city lookup result; saved/draft codes are not proof of a valid destination.
  selectedCity.value = null;
  address.cityCode = '';
  queueCities();
}
function cityEdited() {
  selectedCity.value = null;
  address.cityCode = '';
  savedAddressId.value = '';
  pickupCode.value = '';
  pickupPoints.value = [];
  queueCities();
}
function queueCities() {
  citiesVersion++; citiesAbort?.abort(); clearTimeout(citiesTimer);
  cities.value = []; cityActive.value = -1; cityPending.value = false; cityMessage.value = '';
  if (!ready || isGiftOrder.value || locked.value || success.value || step.value !== 3 || cityCode.value || capability.value?.available !== true) return;
  if (address.city.trim().length < 2) { cityMessage.value = 'Введите минимум 2 буквы названия города'; return; }
  cityPending.value = true;
  citiesTimer = setTimeout(searchCities, 350);
}
async function searchCities() {
  if (!ready || locked.value || step.value !== 3 || cityCode.value || capability.value?.available !== true || address.city.trim().length < 2) { cityPending.value = false; return; }
  const version = ++citiesVersion;
  citiesAbort?.abort(); citiesAbort = new AbortController();
  cityPending.value = true;
  try {
    const result: any = await $fetch('/shipping/cities', { baseURL: config.public.apiBase, query: { provider: shippingProvider.value, search: address.city.trim() }, headers: { ...authHeaders.value, 'x-cart-session': cartSession.value }, signal: citiesAbort.signal, timeout: 15000, retry: 0 });
    if (version !== citiesVersion) return;
    cities.value = result.available === true && result.provider === shippingProvider.value && Array.isArray(result.cities)
      ? result.cities.filter((city: any) => Number.isInteger(city.code) && city.code > 0 && city.code <= 100000000 && typeof city.city === 'string' && city.city.trim() && typeof city.region === 'string' && city.countryCode === 'RU').slice(0, 20) : [];
    cityMessage.value = cities.value.length ? 'Выберите город и регион из списка' : result.available === true ? 'Город не найден. Уточните название или укажите адрес для подтверждения доставки.' : 'Поиск городов временно недоступен. Укажите адрес или желаемый ПВЗ — подтвердим доставку до оплаты.';
  } catch {
    if (version === citiesVersion) cityMessage.value = 'Поиск городов временно недоступен. Укажите адрес или желаемый ПВЗ — подтвердим доставку до оплаты.';
  } finally { if (version === citiesVersion) cityPending.value = false; }
}
function selectCity(city: ShippingCity) {
  if (locked.value || !cities.value.includes(city)) return;
  citiesVersion++; citiesAbort?.abort(); clearTimeout(citiesTimer);
  selectedCity.value = city; address.city = city.city; address.cityCode = String(city.code);
  cities.value = []; cityActive.value = -1; cityPending.value = false; cityMessage.value = '';
}
function cityKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    citiesVersion++; citiesAbort?.abort(); clearTimeout(citiesTimer); cities.value = []; cityPending.value = false; cityActive.value = -1;
  } else if (cities.value.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault(); cityActive.value = (cityActive.value + (event.key === 'ArrowDown' ? 1 : -1) + cities.value.length) % cities.value.length;
  } else if (cities.value.length && event.key === 'Enter') {
    event.preventDefault(); if (cityActive.value >= 0) selectCity(cities.value[cityActive.value]!);
  }
}
async function loadCapabilities() {
  capabilitiesPending.value = true;
  const [shipping, payments] = await Promise.allSettled([
    isGiftOrder.value ? Promise.resolve({ providers: [] }) : $fetch<any>('/shipping/capabilities', { baseURL: config.public.apiBase, timeout: 10000, retry: 0 }),
    $fetch<any>('/payments/capabilities', { baseURL: config.public.apiBase, timeout: 10000, retry: 0 }),
  ]);
  shippingCapabilities.value = shipping.status === 'fulfilled' && Array.isArray(shipping.value?.providers) ? shipping.value.providers : [];
  paymentCapability.value = payments.status === 'fulfilled' ? payments.value : { available: false, reason: 'Не удалось проверить доступность онлайн-оплаты. Заказ можно отправить на подтверждение.' };
  capabilitiesPending.value = false;
  invalidateShipping(); await loadPickupPoints();
}
async function change(item: any, quantity: number) {
  if (modifying.value || locked.value) return;
  modifying.value = true; error.value = '';
  try { cart.value = await $fetch('/cart/items/' + item.id, { baseURL: config.public.apiBase, method: 'PATCH', headers: { ...authHeaders.value, 'x-cart-session': cartSession.value }, body: { quantity }, retry: 0 }); }
  catch (e: any) { error.value = friendlyError(e); }
  finally { modifying.value = false; }
}
async function remove(item: any) {
  if (modifying.value || locked.value) return;
  modifying.value = true; error.value = '';
  try { cart.value = await $fetch('/cart/items/' + item.id, { baseURL: config.public.apiBase, method: 'DELETE', headers: { ...authHeaders.value, 'x-cart-session': cartSession.value }, retry: 0 }); }
  catch (e: any) { error.value = friendlyError(e); }
  finally { modifying.value = false; }
}
async function retryCart() {
  loading.value = true; error.value = ''; cart.value = null;
  try { await loadCart(); } catch (e: any) { error.value = friendlyError(e); }
  finally { loading.value = false; }
}
function officialPaymentUrl(value: unknown, provider: unknown) {
  if (typeof value !== 'string' || provider !== 'YOOKASSA') throw new Error('Не удалось получить безопасную ссылку оплаты.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !['yoomoney.ru', 'yookassa.ru'].some(host => url.hostname === host || url.hostname.endsWith('.' + host))) throw new Error('Получена некорректная ссылка оплаты. Заказ сохранён, обратитесь в поддержку.');
  return url.href;
}
async function checkout() {
  if (!canSubmit.value || success.value) return;
  const recovering = Boolean(intent.value?.uncertain);
  const stamp = fingerprint();
  if (!intent.value || (!intent.value.uncertain && intent.value.fingerprint !== stamp)) {
    intent.value = { key: 'web-' + crypto.randomUUID(), fingerprint: stamp, body: { ...requestBody(), expectedTotal: quote.value!.total, acceptedTerms: true }, quote: quote.value || undefined, uncertain: false, giftCodeHash: giftCodeHash.value || undefined };
  } else if (!intent.value.uncertain) {
    // A definitive 400/422 created no order; an explicitly refreshed quote may be used
    // without rotating the key. Unknown network outcomes always retain the original body.
    intent.value.body = { ...requestBody(), expectedTotal: quote.value!.total, acceptedTerms: true };
    intent.value.giftCodeHash = giftCodeHash.value || undefined;
    intent.value.quote = quote.value || undefined;
  }
  const sentExpectedTotal = intent.value.body.expectedTotal;
  busy.value = true; error.value = ''; intent.value.uncertain = true; persistDraft();
  // Keep exactly the same body and key on retry, even if the quote expires meanwhile.
  try {
    const result: any = await $fetch('/orders/checkout', { baseURL: config.public.apiBase, method: 'POST', headers: { ...authHeaders.value, 'x-cart-session': cartSession.value, 'x-idempotency-key': intent.value.key }, body: intent.value.body, timeout: 20000, retry: 0 });
    if (!result?.orderNumber || !/^[A-Za-z0-9_-]{1,100}$/.test(result.orderNumber)) throw new Error('Invalid order response');
    const { accessToken: guestAccess, ...order } = result;
    let guestStored = true;
    if (typeof guestAccess === 'string' && guestAccess) {
      try { sessionStorage.setItem('sb-order-access:' + order.orderNumber, guestAccess); }
      catch { guestStored = false; }
    }
    success.value = order;
    giftInput.value = ''; giftCardCode.value = ''; giftCodeHash.value = ''; giftRecoveryInput.value = '';
    // If the buyer navigated away while POST was in flight, retain the persisted
    // uncertain intent. Returning to checkout can safely recover the same order.
    if (!ready) return;
    intent.value = null;
    try { sessionStorage.removeItem(draftKey.value); } catch { /* Storage unavailable. */ }
    cart.value = null;
    await loadCart().catch(() => undefined);
    if (!ready) return;
    if (!guestStored) {
      error.value = 'Заказ принят, но браузер запретил сохранить защищённый доступ. Сохраните номер заказа и обратитесь в поддержку; не оформляйте его повторно.';
      return;
    }
    const activeReservation = order.reservationState === 'ACTIVE' && Date.parse(order.reservationExpiresAt || '') > Date.now();
    const unpaid = !['PAID', 'SUCCEEDED'].includes(order.paymentStatus) && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status);
    const amountUnchanged = typeof sentExpectedTotal === 'number' && Math.round(Number(order.finalAmount) * 100) === Math.round(sentExpectedTotal * 100);
    if (order.canPay === true && !amountUnchanged) {
      try { sessionStorage.setItem('sb-order-notice:' + order.orderNumber, 'Проверьте актуальную итоговую сумму заказа перед оплатой: автоматический переход не выполнялся.'); } catch { /* Optional notice. */ }
    }
    if (order.canPay === true && amountUnchanged && order.requiresDeliveryConfirmation !== true && activeReservation && unpaid && Number(order.finalAmount) > 0 && paymentCapability.value?.available === true) {
      try {
        const guest = sessionStorage.getItem('sb-order-access:' + order.orderNumber);
        const payment: any = await $fetch('/payments/orders/' + encodeURIComponent(order.orderNumber), {
          baseURL: config.public.apiBase, method: 'POST', headers: { ...authHeaders.value, ...(guest ? { 'x-order-access': guest } : {}) },
          body: { returnUrl: window.location.origin + '/orders/' + encodeURIComponent(order.orderNumber) }, timeout: 20000, retry: 0,
        });
        if (payment.confirmationUrl) { window.location.assign(officialPaymentUrl(payment.confirmationUrl, payment.provider)); return; }
      } catch (e: any) {
        try { sessionStorage.setItem('sb-order-notice:' + order.orderNumber, e?.message?.startsWith('Получена') ? e.message : 'Заказ сохранён. Оплату не удалось открыть; проверьте статус и повторите на странице заказа.'); } catch { /* Optional notice. */ }
      }
    }
    await navigateTo('/orders/' + encodeURIComponent(order.orderNumber));
  } catch (e: any) {
    const status = Number(e?.statusCode || e?.response?.status || e?.data?.statusCode);
    const message = friendlyError(e);
    // This specific backend conflict guarantees no order/payment was created.
    // Refresh pricing, revoke consent, and generate a key only on explicit resubmit.
    const priceChanged = status === 409 && (e?.data?.code === 'CHECKOUT_PRICE_CHANGED' || message.startsWith('Цена или условия заказа изменились'));
    if (priceChanged) { intent.value = null; accepted.value = false; quote.value = null; }
    // A first-attempt 4xx (stock race, missing auth, validation) is actionable.
    // Do not unlock an unknown earlier outcome merely because a recovery attempt
    // now hits an auth/idempotency conflict. It must retain the original request.
    if (intent.value && ([400, 422].includes(status) || (!recovering && status >= 400 && status < 500 && ![408, 429].includes(status)))) intent.value.uncertain = false;
    error.value = intent.value?.uncertain ? 'Не удалось подтвердить результат отправки. Повторите запрос: сохранённый ключ защищает от повторного создания заказа.' : message;
    persistDraft();
  } finally { busy.value = false; if (!success.value && !intent.value?.uncertain) queueQuote(); }
}

watch(user, value => {
  if (!value || locked.value) return;
  for (const key of ['firstName', 'lastName', 'email', 'phone'] as const) if (!contact[key] && (value as any)[key]) contact[key] = String((value as any)[key]);
}, { immediate: true });
watch([contact, comments, promoCode, useBonuses, accessToken], () => { if (ready && !locked.value) queueQuote(); persistDraft(); }, { deep: true });
watch(isGiftOrder, () => { if (ready && !locked.value) { clearGiftCard(); invalidateShipping(); queueCities(); loadPickupPoints(); loadCapabilities(); } });
watch([address, deliveryMethod, shippingProvider, basketSignature, pickupCode], () => { if (ready && !locked.value) invalidateShipping(); persistDraft(); }, { deep: true });
watch([() => address.city, () => address.cityCode, shippingProvider, deliveryMethod], () => { if (ready && !locked.value) loadPickupPoints(); });
watch(shippingProvider, () => { if (!locked.value) { selectedCity.value = null; address.cityCode = ''; } });
watch([() => address.city, capability, step], queueCities);
watch(step, () => { if (ready) { queueQuote(); if (step.value === 3 && !locked.value) invalidateShipping(); } persistDraft(); });
watch(accessToken, async () => {
  if (!accessToken.value) useBonuses.value = false;
  if (!ready || busy.value || success.value) return;
  // Do not leave a previous customer's cart on screen after login/logout.
  cart.value = null; modifying.value = true;
  try { await loadCart(); } catch (e: any) { error.value = friendlyError(e); }
  finally { modifying.value = false; }
  loadAddresses();
});
watch(pickupCode, value => { const point = pickupPoints.value.find(item => item.code === value); if (point) { address.pickupPointName = point.name; address.pickupPointAddress = point.address; } });
watch([promoInput, accepted], persistDraft);

onMounted(async () => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey.value) || 'null');
    if (draft?.expires > Date.now()) {
      for (const key of Object.keys(contact) as (keyof typeof contact)[]) if (typeof draft.contact?.[key] === 'string') contact[key] = draft.contact[key];
      for (const key of Object.keys(address) as (keyof typeof address)[]) if (key !== 'cityCode' && typeof draft.address?.[key] === 'string') address[key] = draft.address[key];
      deliveryMethod.value = draft.deliveryMethod === 'PICKUP_POINT' ? 'PICKUP_POINT' : 'COURIER';
      shippingProvider.value = draft.shippingProvider === 'OZON_DELIVERY' ? 'OZON_DELIVERY' : 'CDEK';
      comments.value = typeof draft.comments === 'string' ? draft.comments : '';
      promoInput.value = typeof draft.promoInput === 'string' ? draft.promoInput.slice(0, 40) : '';
      promoCode.value = typeof draft.promoCode === 'string' ? draft.promoCode.slice(0, 40) : '';
      useBonuses.value = Boolean(accessToken.value && draft.useBonuses);
      step.value = Number.isInteger(draft.step) ? Math.max(1, Math.min(4, draft.step)) : 1;
      if (draft.intent && /^[A-Za-z0-9_-]{16,100}$/.test(draft.intent.key) && typeof draft.intent.fingerprint === 'string' && typeof draft.intent.body === 'object' && draft.intent.body && draft.intent.body.acceptedTerms === true) {
        intent.value = draft.intent;
        if (intent.value?.uncertain) {
          step.value = 4;
          if (intent.value.quote) quote.value = normalizedQuote(intent.value.quote);
        }
      }
      if (!intent.value?.uncertain) {
        if (step.value > 2 && !contactValid.value) step.value = 2;
        if (step.value > 3 && !deliveryValid.value) step.value = 3;
      }
    }
  } catch { /* Ignore malformed/expired drafts. */ }
  cart.value = null;
  try { await loadCart(); } catch (e: any) { error.value = friendlyError(e); }
  finally { loading.value = false; ready = true; }
  await Promise.all([loadCapabilities(), loadAddresses()]);
  queueQuote();
});
onBeforeUnmount(() => {
  ready = false; quoteVersion++; shippingVersion++; pointsVersion++; addressesVersion++; citiesVersion++;
  clearTimeout(quoteTimer); clearTimeout(shippingTimer); clearTimeout(citiesTimer); quoteAbort?.abort(); shippingAbort?.abort(); pointsAbort?.abort(); citiesAbort?.abort();
});
</script>

<template>
  <div class="sb-cart-page">
    <div class="sb-breadcrumbs"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Оформление заказа</span></div>
    <header class="sb-page-title sb-checkout-heading"><div><p>ВАШ ЗАКАЗ</p><h1>{{ success ? 'Заказ принят' : steps[step - 1] }}</h1></div></header>
    <section v-if="success" class="sb-checkout-confirmation sb-checkout-panel" role="status">
      <CheckCircle2 :size="32" /><h2>Спасибо за заказ!</h2><strong>{{ success.orderNumber }}</strong>
      <p>{{ success.requiresDeliveryConfirmation ? 'Заказ сохранён. Способ получения и стоимость доставки подтвердим до оплаты.' : 'Заказ сохранён. Статус и условия оплаты доступны на его странице.' }}</p>
      <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
      <NuxtLink v-else :to="'/orders/' + encodeURIComponent(success.orderNumber)" class="sb-primary">Открыть заказ <ArrowRight :size="18" /></NuxtLink>
      <NuxtLink to="/catalog" class="sb-checkout-text">Продолжить покупки</NuxtLink>
    </section>
    <div v-else-if="loading" class="sb-state" role="status">Загружаем корзину…</div>
    <div v-else-if="cart?.items?.length || intent?.uncertain">
      <nav class="sb-checkout-steps" aria-label="Шаги оформления">
        <button v-for="(label, index) in steps" :key="label" type="button" :aria-current="step === index + 1 ? 'step' : undefined" :class="{ active: step === index + 1, complete: step > index + 1 }" :disabled="locked || index + 1 > step" @click="go(index + 1)"><i><Check v-if="step > index + 1" :size="16" /><template v-else>{{ index + 1 }}</template></i><span>{{ label }}</span><ArrowRight v-if="index < 3" :size="18" aria-hidden="true" /><Check v-else :size="18" aria-hidden="true" /></button>
      </nav>
      <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
      <p v-if="mixedBasket" class="sb-form-error" role="alert">Подарочные карты и обычные товары оформляются отдельными заказами. Уберите из корзины один из типов товаров.</p>
      <p v-if="intent?.uncertain" class="sb-checkout-note" role="status">Проверяем ранее отправленный заказ. Не меняйте состав и данные: повторная отправка с тем же ключом безопасна и не создаст второй заказ.</p>
      <section v-if="intent?.uncertain && intent.needsGiftCardCode" class="sb-checkout-panel sb-checkout-cart-promo">
        <p>Для безопасного повтора введите тот же код подарочной карты. Мы не сохраняем сам код в браузере.</p>
        <form class="sb-checkout-promo" @submit.prevent="restoreGiftCardCode"><label for="sb-gift-recovery">Код для повторной отправки</label><div><input id="sb-gift-recovery" v-model="giftRecoveryInput" maxlength="100" autocomplete="off" :disabled="busy" /><button class="sb-checkout-secondary" :disabled="busy || !giftRecoveryInput.trim()">Подтвердить</button></div></form>
        <p v-if="giftError" class="sb-form-error" role="alert">{{ giftError }}</p>
      </section>
      <div class="sb-checkout-flow">
        <div class="sb-checkout-stage">
          <template v-if="step === 1"><section class="sb-cart-items">
            <article v-for="item in cart.items" :key="item.id" class="sb-cart-item">
              <NuxtLink :to="storefrontProductLink(item.variant.product)" class="sb-cart-thumb"><img v-if="storefrontProductImage(item.variant.product)" :src="storefrontProductImage(item.variant.product)!" :alt="item.variant.product.nameRu" /><span v-else>S</span></NuxtLink>
              <div><h2><NuxtLink :to="storefrontProductLink(item.variant.product)">{{ item.variant.product.nameRu }}</NuxtLink></h2><p>{{ item.variant.name }} · {{ item.variant.sku }}</p><SiteQuantityControl :quantity="item.quantity" :disabled="modifying || locked" compact @change="change(item, $event)" /></div>
              <strong>{{ money(Number(item.variant.price) * item.quantity) }}</strong><button class="sb-remove" :disabled="modifying || locked" aria-label="Удалить товар" @click="remove(item)"><Trash2 :size="18" /></button>
            </article>
          </section>
          <SiteCartRecommendations v-if="!isGiftOrder" /></template>
          <section v-else-if="step === 2" class="sb-checkout-panel sb-checkout">
            <h2><UserRound :size="20" /> Контактные данные</h2><p>Укажите, с кем связаться по заказу. Покупка доступна и без регистрации.</p>
            <div v-if="!user" class="sb-checkout-auth"><span>Есть аккаунт? Войдите, чтобы сохранить заказ в кабинете и использовать бонусы.</span><div><button type="button" class="sb-checkout-text" @click="openAuth('login')">Войти</button><button type="button" class="sb-checkout-text" @click="openAuth('register')">Зарегистрироваться</button></div></div>
            <p v-else class="sb-checkout-account">Вы вошли как {{ user.email }}</p>
            <form ref="formElement" @submit.prevent="nextStep">
              <div class="sb-checkout-row"><label>Имя<input v-model="contact.firstName" autocomplete="given-name" maxlength="100" :disabled="locked" required /></label><label>Фамилия<input v-model="contact.lastName" autocomplete="family-name" maxlength="100" :disabled="locked" /></label></div>
              <label>Электронная почта<input v-model="contact.email" type="email" autocomplete="email" maxlength="254" :disabled="locked" required /></label>
              <label>Телефон<input v-model="contact.phone" type="tel" autocomplete="tel" placeholder="+7 999 000-00-00" pattern="\+?[0-9\s\(\)\-]{7,24}" maxlength="24" :disabled="locked" required /></label>
              <div class="sb-checkout-actions"><button type="button" class="sb-checkout-text" :disabled="locked" @click="go(1)"><ArrowLeft :size="18" /> Назад</button><button class="sb-primary" :disabled="!contactValid || locked">{{ isGiftOrder ? 'К получению карты' : 'К доставке' }} <ArrowRight :size="18" /></button></div>
            </form>
          </section>
          <section v-else-if="step === 3 && isGiftOrder" class="sb-checkout-panel sb-checkout">
            <h2><Mail :size="20" /> Получение карты</h2><p>Электронная подарочная карта будет доступна в защищённом заказе после подтверждения оплаты. Укажите действующий email для получения уведомления.</p>
            <p class="sb-checkout-note">Email получателя: {{ contact.email }}. Доставка бесплатная, адрес и выбор ПВЗ не нужны.</p>
            <div class="sb-checkout-actions"><button type="button" class="sb-checkout-text" :disabled="locked" @click="go(2)"><ArrowLeft :size="18" /> Назад</button><button class="sb-primary" :disabled="!deliveryValid || locked" @click="go(4)">Проверить заказ <ArrowRight :size="18" /></button></div>
          </section>
          <section v-else-if="step === 3" class="sb-checkout-panel sb-checkout">
            <h2><Truck :size="20" /> Способ получения</h2><p>Выберите доставку до двери или получение в пункте выдачи.</p>
            <div class="sb-delivery-options" role="group" aria-label="Способ получения"><button type="button" :disabled="locked" :aria-pressed="deliveryMethod === 'COURIER'" :class="{ active: deliveryMethod === 'COURIER' }" @click="deliveryMethod = 'COURIER'"><Truck :size="20" /><b>Курьером до двери</b><span>Привезём по указанному адресу</span></button><button type="button" :disabled="locked" :aria-pressed="deliveryMethod === 'PICKUP_POINT'" :class="{ active: deliveryMethod === 'PICKUP_POINT' }" @click="deliveryMethod = 'PICKUP_POINT'"><MapPin :size="20" /><b>В пункт выдачи</b><span>Получение в удобном для вас ПВЗ</span></button></div>
            <form ref="formElement" @submit.prevent="nextStep">
              <label>Служба доставки<select v-model="shippingProvider" :disabled="locked"><option value="CDEK">СДЭК</option><option value="OZON_DELIVERY">Ozon Доставка</option></select></label>
              <p v-if="capabilitiesPending" class="sb-checkout-hint" role="status">Проверяем доступность доставки…</p>
              <p v-else-if="capability?.available !== true" class="sb-checkout-note">{{ capability?.message || 'Автоматический расчёт недоступен. Способ и стоимость доставки подтвердим до оплаты.' }}</p>
              <label v-if="savedAddresses.length && deliveryMethod === 'COURIER'">Сохранённый адрес<select v-model="savedAddressId" :disabled="locked" @change="selectAddress"><option value="">Заполнить вручную</option><option v-for="saved in savedAddresses" :key="saved.id" :value="saved.id">{{ saved.label || [saved.city, saved.street, saved.house].filter(Boolean).join(', ') }}</option></select></label>
              <p v-if="addressesError" class="sb-checkout-hint">{{ addressesError }}</p>
              <div class="sb-checkout-city">
                <label for="sb-checkout-city-input">Город</label>
                <input id="sb-checkout-city-input" v-model="address.city" autocomplete="off" maxlength="100" :disabled="locked" required role="combobox" aria-autocomplete="list" :aria-expanded="cities.length > 0" aria-controls="sb-checkout-city-results" :aria-activedescendant="cityActive >= 0 ? 'sb-checkout-city-option-' + cityActive : undefined" aria-describedby="sb-checkout-city-status" @input="cityEdited" @focus="queueCities" @keydown="cityKeydown" />
                <ul v-if="cities.length" id="sb-checkout-city-results" class="sb-checkout-city-results" role="listbox" aria-label="Город и регион">
                  <li v-for="(city, index) in cities" :id="'sb-checkout-city-option-' + index" :key="city.code" role="option" :aria-selected="cityActive === index">
                    <button type="button" :disabled="locked" :class="{ active: cityActive === index }" @click="selectCity(city)"><b>{{ city.city }}</b><span>{{ city.region || city.country || 'Россия' }}</span></button>
                  </li>
                </ul>
                <p id="sb-checkout-city-status" class="sb-checkout-hint" role="status">{{ cityPending ? 'Ищем город…' : cityCode ? [selectedCity?.city, selectedCity?.region].filter(Boolean).join(' · ') : cityMessage || (capability?.available === true ? 'Выберите город из подсказок для расчёта доставки' : 'Укажите город доставки') }}</p>
              </div>
              <template v-if="deliveryMethod === 'COURIER'"><label>Улица<input v-model="address.street" autocomplete="address-line1" maxlength="200" :disabled="locked" required /></label><div class="sb-checkout-row"><label>Дом, корпус<input v-model="address.house" maxlength="40" :disabled="locked" required /></label><label>Квартира или офис<input v-model="address.apartment" maxlength="50" :disabled="locked" /></label></div></template>
              <template v-else>
                <p v-if="pickupPending" class="sb-checkout-hint" role="status">Загружаем пункты выдачи…</p>
                <label v-if="pickupPoints.length">Пункт выдачи<select v-model="pickupCode" :disabled="locked"><option value="">Указать желаемый ПВЗ вручную</option><option v-for="point in pickupPoints" :key="point.code" :value="point.code">{{ point.name }} · {{ point.address }}</option></select></label>
                <p v-if="actualPoint" class="sb-checkout-note">{{ actualPoint.address }}<template v-if="actualPoint.workTime"> · {{ actualPoint.workTime }}</template></p>
                <template v-else><p class="sb-checkout-note">{{ pickupMessage || 'Укажите желаемый пункт выдачи. Мы проверим возможность доставки и подтвердим его перед оплатой.' }}</p><label>Название желаемого ПВЗ<input v-model="address.pickupPointName" placeholder="Например, СДЭК на Центральной" maxlength="200" :disabled="locked" required /></label><label>Адрес желаемого ПВЗ<input v-model="address.pickupPointAddress" placeholder="Улица и номер дома" maxlength="300" :disabled="locked" required /></label></template>
              </template>
              <p v-if="shippingPending" class="sb-checkout-hint" role="status">Рассчитываем доставку…</p>
              <p v-else-if="shippingResult?.message" class="sb-checkout-note">{{ shippingResult.message }}</p>
              <button v-if="capability?.canEstimate && cityCode && deliveryValid && (!shippingResult?.quoteId || !quote?.deliveryConfirmed)" type="button" class="sb-checkout-secondary" :disabled="shippingPending || locked" @click="estimateShipping">Обновить доставку <ArrowRight :size="18" /></button>
              <label>Комментарий к заказу<textarea v-model="comments" maxlength="1000" rows="3" :disabled="locked" placeholder="Домофон, удобное время звонка или пожелания" /></label>
              <div class="sb-checkout-actions"><button type="button" class="sb-checkout-text" :disabled="locked" @click="go(2)"><ArrowLeft :size="18" /> Назад</button><button class="sb-primary" :disabled="!deliveryValid || locked">Проверить заказ <ArrowRight :size="18" /></button></div>
            </form>
          </section>
          <section v-else class="sb-checkout-panel sb-checkout">
            <h2>Проверьте заказ</h2><div class="sb-checkout-review"><article><div><b>Контактные данные</b><button class="sb-checkout-text" :disabled="locked" @click="go(2)">Изменить</button></div><p>{{ contact.firstName }} {{ contact.lastName }}</p><p>{{ contact.phone }} · {{ contact.email }}</p></article><article><div><b>{{ deliveryLabel }}</b><button class="sb-checkout-text" :disabled="locked" @click="go(3)">Изменить</button></div><p>{{ deliveryAddress }}</p><p v-if="comments">{{ comments }}</p></article><article><div><b>Товары · {{ cart?.items?.length || 0 }} поз.</b><button class="sb-checkout-text" :disabled="locked" @click="go(1)">Изменить</button></div><p v-for="item in cart?.items || []" :key="item.id">{{ item.variant.product.nameRu }} × {{ item.quantity }}</p></article></div>
            <div v-if="!isGiftOrder && !intent?.uncertain" class="sb-checkout-rewards">
            <section class="sb-checkout-cart-promo sb-checkout-gift-code sb-checkout-reward" aria-label="Оплата подарочной картой">
              <form class="sb-checkout-promo" @submit.prevent="applyGiftCard"><label for="sb-checkout-gift-code">Подарочная карта</label><div><input id="sb-checkout-gift-code" v-model="giftInput" maxlength="100" autocomplete="off" :disabled="locked" /><button class="sb-checkout-secondary sb-checkout-code-apply" aria-label="Применить" title="Применить подарочную карту" :disabled="locked || !giftInput.trim()"><Check :size="18" aria-hidden="true" /></button></div></form>
              <small v-if="giftCardCode && quote && quote.giftCardAmount > 0 && !quotePending && !quoteError" class="sb-checkout-reward-status">Учтено в расчёте: {{ money(quote.giftCardAmount) }}</small>
              <button v-if="giftCardCode" type="button" class="sb-checkout-text" :disabled="locked" @click="clearGiftCard">Убрать подарочную карту <X :size="18" /></button>
              <p v-if="giftError" class="sb-form-error" role="alert">{{ giftError }}</p>
            </section>
            <section class="sb-checkout-final-bonuses sb-checkout-reward" aria-label="Бонусы SARKISIAN CLUB">
              <h3>Бонусы клуба</h3>
              <label v-if="accessToken" class="sb-checkout-check sb-checkout-bonuses"><input v-model="useBonuses" type="checkbox" role="switch" aria-describedby="sb-checkout-bonus-available" :disabled="locked || (!useBonuses && (!quote || quote.maxBonusAmount <= 0))" /><span class="sb-checkout-bonus-copy">Использовать бонусы<small id="sb-checkout-bonus-available">{{ quote ? 'Доступно к списанию: ' + quote.maxBonusAmount.toLocaleString('ru-RU') + ' бонусов' : 'Проверяем доступный баланс…' }}</small></span><i class="sb-checkout-bonus-switch" aria-hidden="true" /></label>
              <p v-else class="sb-checkout-hint">Для списания бонусов <button type="button" class="sb-checkout-text" @click="openAuth('login')">войдите</button> в аккаунт.</p>
              <p v-if="quote && quote.earnEstimate > 0" class="sb-checkout-hint">После подтверждения оплаты: {{ quote.earnEstimate.toLocaleString('ru-RU') }} бонусов.</p>
            </section>
            </div>
            <h2><CreditCard :size="20" /> Оплата</h2>
            <p class="sb-checkout-note">{{ coveredByGift ? 'Сумма заказа полностью покрывается подарочной картой. Подтвердите оформление — отдельный платёж не потребуется.' : onlinePayment ? 'Итоговая сумма рассчитана. После оформления откроется защищённая страница ЮKassa. Статус оплаты подтвердит сервер.' : quote?.deliveryConfirmed ? (paymentCapability?.reason || 'Онлайн-оплата пока недоступна. Заказ будет сохранён без списания денег.') : 'Стоимость и способ доставки ещё требуют подтверждения. Отправьте заказ: мы согласуем условия до оплаты. Сейчас деньги не списываются.' }}</p>
            <label class="sb-checkout-check"><input v-model="accepted" type="checkbox" :disabled="busy" /><span>Принимаю <NuxtLink to="/oferta" target="_blank">условия оферты</NuxtLink> и ознакомлен с <NuxtLink to="/privacy" target="_blank">политикой конфиденциальности</NuxtLink>.</span></label>
            <div class="sb-checkout-actions"><button type="button" class="sb-checkout-text" :disabled="locked" @click="go(3)"><ArrowLeft :size="18" /> Назад</button></div>
          </section>
        </div>
        <aside class="sb-checkout-summary sb-checkout-panel" :aria-busy="quotePending || shippingPending">
          <p class="sb-kicker">{{ intent?.uncertain ? 'ПРЕДЫДУЩИЙ РАСЧЁТ' : 'ВАШ ЗАКАЗ' }}</p><h2>{{ money(displayTotal) }}</h2>
          <div><span>Товары</span><b>{{ money(quote?.subtotal ?? basketTotal) }}</b></div>
          <div v-if="quote && quote.discount > 0"><span>Скидка</span><b>−{{ money(quote.discount) }}</b></div>
          <div v-if="step === 4 && quote && quote.bonusAmount > 0"><span>Списание бонусов</span><b>−{{ money(quote.bonusAmount) }}</b></div>
          <div v-if="step === 4 && quote && quote.giftCardAmount > 0"><span>Подарочная карта</span><b>−{{ money(quote.giftCardAmount) }}</b></div>
          <div v-if="step >= 3"><span>{{ isGiftOrder ? 'Электронная доставка' : 'Доставка' }}</span><b>{{ quote?.shippingAmount !== null && quote?.shippingAmount !== undefined ? money(quote.shippingAmount) : 'Требует расчёта' }}</b></div>
          <p v-if="quotePending || shippingPending" role="status">Обновляем расчёт…</p>
          <p v-else-if="intent?.uncertain">Показываем расчёт отправленного заказа. Актуальные данные появятся после подтверждения результата.</p>
          <p v-else-if="step >= 3 && !quote?.deliveryConfirmed">Предварительная сумма. Итог с доставкой подтвердим до оплаты.</p>
          <p v-else-if="step >= 3">Итоговая сумма с доставкой.</p>
          <p v-for="message in summaryMessages" :key="message" class="sb-checkout-hint">{{ message }}</p>
          <section v-if="!isGiftOrder" class="sb-checkout-cart-promo sb-checkout-summary-promo" aria-label="Промокод заказа">
            <form class="sb-checkout-promo" @submit.prevent="applyPromo"><label for="sb-checkout-promo-code">Промокод</label><div><input id="sb-checkout-promo-code" v-model="promoInput" maxlength="40" autocomplete="off" :disabled="locked" /><button class="sb-checkout-secondary sb-checkout-code-apply" aria-label="Применить" title="Применить промокод" :disabled="locked || !promoInput.trim()"><Check :size="18" aria-hidden="true" /></button></div></form>
            <button v-if="promoCode" type="button" class="sb-checkout-text" :disabled="locked" @click="clearPromo">Убрать промокод {{ promoCode }} <X :size="18" /></button>
          </section>
          <template v-if="!intent?.uncertain">
            <p v-if="quoteError" class="sb-form-error" role="alert">{{ quoteError }}</p>
            <button v-if="quoteError" class="sb-checkout-secondary" :disabled="quotePending || locked" @click="refreshQuote">Обновить расчёт <ArrowRight :size="18" /></button>
          </template>
          <button v-if="step === 1" class="sb-primary" :disabled="modifying || locked || mixedBasket" @click="go(2)">К оформлению <ArrowRight :size="18" /></button>
          <button v-if="step === 4" class="sb-primary" :disabled="!canSubmit" @click="checkout">{{ busy ? 'Оформляем…' : intent?.uncertain ? 'Повторить безопасно' : onlinePayment ? 'Оформить и оплатить' : 'Подтвердить заказ' }} <Check :size="18" /></button>
          <NuxtLink v-if="step === 1" to="/catalog" class="sb-checkout-text">Продолжить покупки</NuxtLink><small v-else>Шаг {{ step }} из 4</small>
        </aside>
      </div>
    </div>
    <div v-else-if="error" class="sb-empty"><h2>Корзина недоступна</h2><p>{{ error }}</p><button class="sb-primary" @click="retryCart">Повторить <ArrowRight :size="18" /></button></div>
    <div v-else class="sb-empty"><ShoppingBag :size="32" /><h2>Корзина пока пуста</h2><p>Добавьте продукты, с которыми хочется работать.</p><NuxtLink to="/catalog" class="sb-primary">Перейти в каталог <ArrowRight :size="18" /></NuxtLink></div>
  </div>
</template>
