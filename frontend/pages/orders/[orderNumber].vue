<script setup lang="ts">
import { ArrowRight, CheckCircle2, Clock3, Copy, CreditCard, LockKeyhole, Mail, MapPin, Package, RefreshCw, UserRound } from '@lucide/vue';

const route = useRoute(), config = useRuntimeConfig();
const { authHeaders, accessToken } = useStorefront();
const { openAuth } = useStorefrontPanels();
const order = ref<any>(null), loading = ref(true), paying = ref(false), error = ref(''), paymentError = ref(''), notice = ref('');
const paymentCapability = ref<any>(null), capabilityPending = ref(true), now = ref(Date.now());
const orderNumber = computed(() => String(route.params.orderNumber || ''));
const validNumber = computed(() => /^[A-Za-z0-9_-]{1,100}$/.test(orderNumber.value));
const labels: Record<string, string> = { NEW: 'Заказ принят', CONFIRMED: 'Заказ подтверждён', PAYMENT_WAITING: 'Ожидает оплаты', PAID: 'Оплачен', PROCESSING: 'В обработке', ASSEMBLING: 'Собираем заказ', READY: 'Готов к отправке', SHIPPED: 'Передан в доставку', DELIVERED: 'Доставлен', COMPLETED: 'Завершён', CANCELLED: 'Отменён', CANCELED: 'Отменён', RETURNED: 'Возвращён', REFUNDED: 'Возврат оформлен' };
const paid = computed(() => ['PAID', 'SUCCEEDED'].includes(order.value?.paymentStatus) || order.value?.status === 'PAID');
const confirmed = computed(() => order.value?.deliveryConfirmed === true || order.value?.priceSnapshot?.deliveryConfirmed === true);
const reservationExpires = computed(() => Date.parse(order.value?.reservationExpiresAt || ''));
const reservationActive = computed(() => order.value?.reservationState === 'ACTIVE' && Number.isFinite(reservationExpires.value) && reservationExpires.value > now.value);
const payable = computed(() => Boolean(order.value && !paid.value && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.value.status) && reservationActive.value && confirmed.value && order.value.canPay !== false && Number.isFinite(Number(order.value.finalAmount)) && Number(order.value.finalAmount) > 0));
const canPay = computed(() => payable.value && paymentCapability.value?.available === true && !loading.value && !paying.value && !capabilityPending.value);
const statusLabel = computed(() => labels[order.value?.status] || 'Статус уточняется');
const deliveryAddress = computed(() => {
  const value = order.value?.shippingAddress;
  return value && typeof value === 'object' ? [value.city, value.address || [value.street, value.house, value.apartment].filter(Boolean).join(', ')].filter(Boolean).join(', ') : '';
});
const snapshot = computed(() => order.value?.priceSnapshot || {});
const digitalDelivery = computed(() => snapshot.value.digitalDelivery === true || Boolean(order.value?.items?.length && order.value.items.every((item: any) => item.productType === 'GIFT_CARD')));
const issuedCards = computed(() => paid.value && digitalDelivery.value && Array.isArray(order.value?.giftCards) ? order.value.giftCards.filter((card: any) => typeof card.code === 'string' && /^(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{8}){3})$/.test(card.code)) : []);
const copyNotice = ref('');
const remainingMinutes = computed(() => Math.max(0, Math.ceil((reservationExpires.value - now.value) / 60000)));
let mounted = false, version = 0, abort: AbortController | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined, clockTimer: ReturnType<typeof setInterval> | undefined;

useStorefrontSeo({ title: () => 'Заказ — SARKISIAN BRAND', noindex: true });

function money(value: unknown) {
  const amount = Number(value);
  return value === null || value === undefined || !Number.isFinite(amount) ? 'Уточняется' : amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽';
}
function cardExpiry(value: unknown) { const date = typeof value === 'string' ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('ru-RU') : 'Срок уточняется'; }
async function copyGiftCode(card: any) {
  copyNotice.value = '';
  if (!issuedCards.value.includes(card)) return;
  try { await navigator.clipboard.writeText(card.code); copyNotice.value = 'Код скопирован. Не передавайте его посторонним.'; }
  catch { copyNotice.value = 'Не удалось скопировать автоматически. Выделите код и скопируйте его вручную.'; }
}
function guestAccess() {
  if (!mounted || !validNumber.value) return '';
  try { return sessionStorage.getItem('sb-order-access:' + orderNumber.value) || ''; } catch { return ''; }
}
function protectedHeaders() { const guest = guestAccess(); return { ...authHeaders.value, ...(guest ? { 'x-order-access': guest } : {}), 'Cache-Control': 'no-cache' }; }
function friendlyError(e: any) {
  const status = Number(e?.statusCode || e?.response?.status || e?.data?.statusCode);
  if ([401, 403, 404].includes(status)) return 'Заказ не найден или недоступен. Войдите в аккаунт, с которого он оформлен, либо откройте заказ в том же браузере.';
  const message = e?.data?.message;
  return Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : 'Не удалось обновить заказ. Попробуйте ещё раз.';
}
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  // Only GET state. Do not create payments or call provider status endpoints in a timer.
  if (mounted && !document.hidden && order.value && !paid.value && reservationActive.value && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.value.status)) refreshTimer = setTimeout(() => loadOrder(false), 15000);
}
async function loadOrder(showLoading = true) {
  if (!mounted) return;
  const current = ++version;
  abort?.abort(); abort = new AbortController(); clearTimeout(refreshTimer);
  if (showLoading) loading.value = true;
  error.value = '';
  if (!validNumber.value || (!accessToken.value && !guestAccess())) {
    order.value = null; loading.value = false;
    error.value = 'Для просмотра нужен защищённый доступ. Войдите в аккаунт или откройте заказ в том же браузере, где его оформляли.';
    return;
  }
  try {
    const result: any = await $fetch('/orders/' + encodeURIComponent(orderNumber.value), { baseURL: config.public.apiBase, headers: protectedHeaders(), timeout: 15000, retry: 0, signal: abort.signal });
    if (current !== version) return;
    if (result?.orderNumber !== orderNumber.value || !Array.isArray(result.items)) throw new Error('Invalid order');
    // Never accept a guest token or payment status from query parameters.
    const { accessToken: _unused, ...protectedOrder } = result;
    order.value = protectedOrder; now.value = Date.now();
  } catch (e: any) {
    if (current === version) { order.value = null; error.value = friendlyError(e); }
  } finally { if (current === version) { loading.value = false; scheduleRefresh(); } }
}
async function loadCapability() {
  capabilityPending.value = true;
  try { paymentCapability.value = await $fetch('/payments/capabilities', { baseURL: config.public.apiBase, timeout: 10000, retry: 0 }); }
  catch { paymentCapability.value = { available: false, reason: 'Не удалось проверить онлайн-оплату. Повторите проверку позже.' }; }
  finally { capabilityPending.value = false; }
}
function officialPaymentUrl(value: unknown, provider: unknown) {
  if (typeof value !== 'string' || provider !== 'YOOKASSA') throw new Error('Не удалось получить безопасную ссылку оплаты.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !['yoomoney.ru', 'yookassa.ru'].some(host => url.hostname === host || url.hostname.endsWith('.' + host))) throw new Error('Получена некорректная ссылка оплаты. Обратитесь в поддержку.');
  return url.href;
}
async function pay() {
  if (!canPay.value) return;
  paying.value = true; paymentError.value = '';
  try {
    await loadOrder(); await loadCapability(); now.value = Date.now();
    if (!payable.value || paymentCapability.value?.available !== true) return;
    const payment: any = await $fetch('/payments/orders/' + encodeURIComponent(orderNumber.value), { baseURL: config.public.apiBase, method: 'POST', headers: protectedHeaders(), body: { returnUrl: window.location.origin + '/orders/' + encodeURIComponent(orderNumber.value) }, timeout: 20000, retry: 0 });
    if (payment.confirmationUrl) { window.location.assign(officialPaymentUrl(payment.confirmationUrl, payment.provider)); return; }
    await loadOrder(); // Even SUCCEEDED in a payment response is displayed only after protected GET.
    if (!paid.value) notice.value = 'Статус платежа ещё подтверждается. Обновите заказ через несколько секунд.';
  } catch (e: any) { paymentError.value = e?.message?.startsWith('Получена') ? e.message : friendlyError(e); }
  finally { paying.value = false; }
}
async function retry() { if (!paying.value) await Promise.all([loadOrder(), loadCapability()]); }
function visibilityChanged() { if (!document.hidden && !paying.value) loadOrder(false); else clearTimeout(refreshTimer); }
watch(orderNumber, () => { if (mounted) { order.value = null; notice.value = ''; paymentError.value = ''; retry(); } });
watch(accessToken, () => { if (mounted) { order.value = null; loadOrder(); } });
onMounted(async () => {
  mounted = true;
  try { notice.value = sessionStorage.getItem('sb-order-notice:' + orderNumber.value) || ''; sessionStorage.removeItem('sb-order-notice:' + orderNumber.value); } catch { /* Optional notice. */ }
  clockTimer = setInterval(() => { now.value = Date.now(); }, 1000);
  document.addEventListener('visibilitychange', visibilityChanged);
  await retry();
});
onBeforeUnmount(() => {
  mounted = false; version++; abort?.abort(); clearTimeout(refreshTimer); clearInterval(clockTimer);
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>

<template>
  <SiteShell><div class="sb-order-page sb-cart-page">
    <div class="sb-breadcrumbs"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Заказ</span></div>
    <header class="sb-page-title sb-checkout-heading"><div><p>ВАШ ЗАКАЗ</p><h1>{{ validNumber ? 'Заказ ' + orderNumber : 'Заказ' }}</h1></div></header>
    <div v-if="loading" class="sb-state" role="status">Загружаем защищённые данные заказа…</div>
    <section v-else-if="error || !order" class="sb-checkout-panel sb-order-access"><LockKeyhole :size="32" /><h2>Защищённый доступ к заказу</h2><p role="alert">{{ error }}</p><div class="sb-order-actions"><button class="sb-primary" @click="openAuth('login')">Войти <ArrowRight :size="18" /></button><button class="sb-checkout-secondary" @click="retry">Повторить <RefreshCw :size="18" /></button></div><NuxtLink to="/catalog" class="sb-checkout-text">Вернуться в каталог</NuxtLink></section>
    <template v-else>
      <p v-if="notice" class="sb-checkout-note" role="status">{{ notice }}</p>
      <div class="sb-checkout-flow">
        <div class="sb-checkout-stage sb-order-details">
          <section class="sb-checkout-panel"><h2><CheckCircle2 v-if="paid" :size="24" /><Package v-else :size="24" /> {{ statusLabel }}</h2><p>{{ paid ? 'Оплата подтверждена сервером. Спасибо за покупку!' : 'Заказ сохранён. Здесь отображается актуальный статус, полученный с сервера.' }}</p><p v-if="!confirmed" class="sb-checkout-note">Способ получения и стоимость доставки требуют подтверждения. Пока итог не согласован, оплатить заказ нельзя.</p><p v-if="reservationActive && !paid" class="sb-checkout-hint"><Clock3 :size="18" /> Товары зарезервированы ещё примерно на {{ remainingMinutes }} мин.</p><p v-else-if="!paid && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status)" class="sb-checkout-note">Действующий резерв отсутствует или истёк. Перед оплатой требуется проверка наличия сотрудником.</p></section>
          <section class="sb-checkout-panel"><h2><UserRound :size="20" /> Получатель</h2><p v-if="order.buyerName">{{ order.buyerName }}</p><p v-if="order.buyerEmail">{{ order.buyerEmail }}</p><p v-if="order.buyerPhone">{{ order.buyerPhone }}</p><h2 class="sb-order-delivery-title"><Mail v-if="digitalDelivery" :size="20" /><MapPin v-else :size="20" /> {{ digitalDelivery ? 'Получение карты' : 'Доставка' }}</h2><p>{{ digitalDelivery ? 'Электронная карта · ' + (order.buyerEmail || 'Email указан при оформлении') : deliveryAddress || 'Адрес уточняется' }}</p><p v-if="!digitalDelivery && order.shippingAddress?.pickupPointName">{{ order.shippingAddress.pickupPointName }}</p><p v-if="order.comments">{{ order.comments }}</p></section>
          <section v-if="digitalDelivery" class="sb-checkout-panel sb-order-gift-cards">
            <h2><CreditCard :size="20" /> Подарочные карты</h2>
            <p v-if="!paid">Коды появятся здесь после подтверждения оплаты сервером.</p>
            <p v-else-if="!issuedCards.length">Оплата подтверждена. Карты ещё подготавливаются — обновите статус через несколько секунд.</p>
            <div v-else class="sb-order-gift-list"><article v-for="(card, index) in issuedCards" :key="card.id || index" class="sb-order-gift-card"><strong>Подарочная карта {{ money(card.faceValue ?? card.nominal) }}</strong><p>Баланс: {{ money(card.balance) }} · Действует до {{ cardExpiry(card.expiresAt) }}</p><code>{{ card.code }}</code><button type="button" class="sb-checkout-secondary" @click="copyGiftCode(card)">Скопировать код <Copy :size="18" /></button></article></div>
            <p v-if="copyNotice" class="sb-checkout-hint" role="status">{{ copyNotice }}</p>
            <p v-if="issuedCards.length" class="sb-checkout-hint">Код позволяет использовать баланс карты. Храните его как платёжные данные.</p>
          </section>
          <section class="sb-checkout-panel"><h2><Package :size="20" /> Состав заказа</h2><div class="sb-order-items"><article v-for="(item, index) in order.items" :key="item.id || index"><div><b>{{ item.productName || item.variant?.product?.nameRu || 'Товар' }}</b><small>{{ item.variantName || item.variant?.name }}<template v-if="item.externalSku || item.variant?.sku"> · {{ item.externalSku || item.variant?.sku }}</template></small><span>{{ item.quantity }} шт. × {{ money(item.price) }}</span></div><strong>{{ money(item.total ?? Number(item.price) * item.quantity) }}</strong></article></div></section>
        </div>
        <aside class="sb-checkout-summary sb-checkout-panel sb-order-summary">
          <p class="sb-kicker">{{ confirmed ? 'ИТОГО' : 'ПРЕДВАРИТЕЛЬНАЯ СУММА' }}</p><h2>{{ money(order.finalAmount) }}</h2>
          <div v-if="snapshot.subtotal !== undefined || order.totalAmount !== undefined"><span>Товары</span><b>{{ money(snapshot.subtotal ?? order.totalAmount) }}</b></div>
          <div v-if="Number(snapshot.discount ?? order.discountAmount) > 0"><span>Скидка</span><b>−{{ money(snapshot.discount ?? order.discountAmount) }}</b></div>
          <div v-if="Number(snapshot.bonusAmount) > 0"><span>Списание бонусов</span><b>−{{ money(snapshot.bonusAmount) }}</b></div>
          <div v-if="Number(snapshot.giftCardAmount ?? order.giftCardAmount) > 0"><span>Подарочная карта</span><b>−{{ money(snapshot.giftCardAmount ?? order.giftCardAmount) }}</b></div>
          <div><span>{{ digitalDelivery ? 'Электронная доставка' : 'Доставка' }}</span><b>{{ confirmed ? money(snapshot.shippingAmount ?? order.shippingCost) : 'Требует подтверждения' }}</b></div>
          <p v-if="!confirmed">Окончательную сумму подтвердим до оплаты.</p>
          <p v-if="paid" class="sb-checkout-note" role="status">Оплачено</p>
          <template v-else>
            <button v-if="payable" class="sb-primary" :disabled="!canPay" @click="pay">{{ paying ? 'Открываем оплату…' : 'Оплатить заказ' }} <CreditCard :size="18" /></button>
            <p v-if="capabilityPending" role="status">Проверяем доступность оплаты…</p><p v-else-if="payable && paymentCapability?.available !== true" class="sb-checkout-hint">{{ paymentCapability?.reason || 'Онлайн-оплата пока недоступна. Заказ сохранён без списания денег.' }}</p>
          </template>
          <p v-if="paymentError" class="sb-form-error" role="alert">{{ paymentError }}</p>
          <button class="sb-checkout-secondary" :disabled="paying || loading" @click="retry">Обновить статус <RefreshCw :size="18" /></button>
          <NuxtLink v-if="accessToken" to="/account" class="sb-checkout-text">Мои заказы</NuxtLink><NuxtLink to="/catalog" class="sb-checkout-text">Продолжить покупки</NuxtLink>
          <small>Номер заказа не заменяет защищённый доступ. Не передавайте доступ к браузеру посторонним.</small>
        </aside>
      </div>
    </template>
  </div></SiteShell>
</template>
