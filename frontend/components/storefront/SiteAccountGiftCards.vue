<script setup lang="ts">
import { ArrowRight, Check, Copy } from '@lucide/vue';

type GiftCardSummary = {
  id: string; maskedCode: string; faceValue: number | string; balance: number | string;
  reserved: number | string; expiresAt: string | null; isActive: boolean; orderNumber: string;
};
type RevealedGiftCard = GiftCardSummary & { code?: string };
defineProps<{ cards: GiftCardSummary[] }>();
const config = useRuntimeConfig();
const { authHeaders } = useStorefront();
const selected = ref<GiftCardSummary | null>(null);
const revealed = ref<RevealedGiftCard | null>(null);
const loading = ref(false), error = ref(''), copied = ref(false), copyNotice = ref('');
let requestId = 0;
const money = (value: number | string) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
const available = (card: GiftCardSummary) => Math.max(0, Number(card.balance) - Number(card.reserved));
const expiry = (card: GiftCardSummary) => card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('ru-RU') : 'Без ограничения срока';
function state(card: GiftCardSummary) {
  if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) return 'Срок действия истёк';
  if (!card.isActive) return 'Карта неактивна';
  if (Number(card.balance) <= 0) return 'Баланс использован';
  if (available(card) <= 0) return 'Средства зарезервированы';
  return 'Доступна к использованию';
}
function close() {
  requestId++; selected.value = null; revealed.value = null; loading.value = false;
  error.value = ''; copied.value = false; copyNotice.value = '';
}
async function reveal() {
  if (!selected.value || loading.value) return;
  const card = selected.value, currentRequest = ++requestId;
  loading.value = true; revealed.value = null; error.value = ''; copied.value = false; copyNotice.value = '';
  try {
    // The order endpoint must authorize ownership and reveal codes only after verified payment.
    // Never read customer cards from private admin APIs or cache the code in shared state.
    const order = await $fetch<{ orderNumber: string; giftCards?: RevealedGiftCard[] }>(`/storefront/orders/${encodeURIComponent(card.orderNumber)}`, { baseURL: config.public.apiBase, headers: authHeaders.value, cache: 'no-store' });
    if (currentRequest !== requestId) return;
    const match = order.orderNumber === card.orderNumber ? order.giftCards?.find(item => item.id === card.id) : null;
    if (!match || typeof match.code !== 'string' || !match.code.trim()) {
      error.value = 'Код карты пока недоступен. После подтверждения оплаты он появится здесь. Если заказ уже оплачен, обратитесь в поддержку.';
      return;
    }
    revealed.value = { ...card, code: match.code };
  } catch (exception: any) {
    if (currentRequest !== requestId) return;
    const status = Number(exception?.statusCode || exception?.status);
    error.value = [401, 403].includes(status) ? 'Не удалось подтвердить доступ к карте. Войдите в свой аккаунт снова.'
      : status === 404 ? 'Карта или её заказ недоступны для этого аккаунта.'
      : 'Не удалось загрузить карту. Попробуйте ещё раз.';
  } finally { if (currentRequest === requestId) loading.value = false; }
}
function open(card: GiftCardSummary) { close(); selected.value = card; reveal(); }
async function copy() {
  const code = revealed.value?.code, currentRequest = requestId;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    if (currentRequest === requestId) { copied.value = true; copyNotice.value = 'Код скопирован.'; }
  } catch { if (currentRequest === requestId) copyNotice.value = 'Копирование недоступно. Выделите и скопируйте код вручную.'; }
}
onBeforeUnmount(close);
</script>

<template>
  <section class="sa-panel sa-giftcards">
    <h2>Подарочные карты</h2>
    <p class="sa-muted">Здесь находятся карты, купленные в ваших заказах. Полный код доступен только владельцу заказа после подтверждения оплаты.</p>
    <div v-if="cards.length" class="sa-gift-grid">
      <article v-for="card in cards" :key="card.id" class="sa-gift-card">
        <div class="sa-gift-heading"><span>SARKISIAN BRAND</span></div>
        <p class="sa-gift-mask">{{ card.maskedCode }}</p>
        <dl class="sa-gift-values"><div><dt>Доступно</dt><dd>{{ money(available(card)) }}</dd></div><div><dt>Номинал</dt><dd>{{ money(card.faceValue) }}</dd></div></dl>
        <p v-if="Number(card.reserved) > 0" class="sa-muted">В резерве для оплаты заказа: {{ money(card.reserved) }}.</p>
        <small>{{ state(card) }}<br />{{ card.expiresAt ? `Действует до ${expiry(card)}` : expiry(card) }}<br />Заказ {{ card.orderNumber }}</small>
        <button class="sa-button" @click="open(card)">Показать карту <ArrowRight :size="20" /></button>
      </article>
    </div>
    <div v-else class="sa-gift-empty"><p>Купленных подарочных карт пока нет. После покупки карты появятся в этом разделе.</p><NuxtLink to="/catalog" class="sa-button">Перейти в каталог <ArrowRight :size="20" /></NuxtLink></div>
  </section>

  <SiteAccountDrawer :open="!!selected" title="Подарочная карта" @close="close">
    <p v-if="loading" role="status">Загружаем вашу карту…</p>
    <p v-if="error" class="sa-feedback" role="alert">{{ error }}</p>
    <template v-if="selected">
      <p class="sa-muted">Заказ {{ selected.orderNumber }} · {{ selected.maskedCode }}</p>
      <template v-if="revealed">
        <div class="sa-form"><label>Код подарочной карты<input :value="revealed.code" readonly autocomplete="off" spellcheck="false" /></label></div>
        <p class="sa-feedback">Храните код в безопасности: его можно использовать для оплаты или передать получателю подарка.</p>
        <button class="sa-button" @click="copy">{{ copied ? 'Скопировано' : 'Скопировать код' }}<Check v-if="copied" :size="20" /><Copy v-else :size="20" /></button>
        <p v-if="copyNotice" role="status">{{ copyNotice }}</p>
        <p>Доступно: <strong>{{ money(available(selected)) }}</strong></p>
      </template>
      <div class="sa-actions"><button v-if="error && !loading" class="sa-button" @click="reveal">Повторить загрузку <ArrowRight :size="20" /></button><NuxtLink to="/contacts" class="sa-button sa-secondary" @click="close">Связаться с поддержкой <ArrowRight :size="20" /></NuxtLink></div>
    </template>
  </SiteAccountDrawer>
</template>
