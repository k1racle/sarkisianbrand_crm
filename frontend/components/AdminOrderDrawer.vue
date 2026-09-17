<script setup lang="ts">
import { Check, Copy, MapPin, Package, Phone, X } from '@lucide/vue';
const selected = useState<any | null>('admin-order-selected', () => null); const copied = ref(false);
const config = useRuntimeConfig();
const session = useWorkspaceSession();
const access = useWorkspaceAccess();
const savedOrder = useState<any>('admin-order-saved', () => null);
const statusDraft = ref('');
const saving = ref(false);
const actionError = ref('');
const canManage = computed(() => ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR', 'WAREHOUSE'].includes(session.user.value?.role || '') && access.can('web_orders.manage'));
const nextStatuses = computed(() => {
  const order = selected.value;
  if (!order || !canManage.value || ['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) return [];
  const digital = order.reservationState === 'DIGITAL' || order.priceSnapshot?.digitalDelivery === true;
  const paid = ['PAID', 'SUCCEEDED'].includes(order.paymentStatus);
  return [...(order.status === 'NEW' ? ['CONFIRMED'] : []), ...(paid ? digital ? ['DELIVERED'] : ({ CONFIRMED: ['ASSEMBLING'], PAYMENT_WAITING: ['ASSEMBLING'], PAID: ['ASSEMBLING'], ASSEMBLING: ['SHIPPED'], SHIPPED: ['DELIVERED'] } as Record<string, string[]>)[order.status] || [] : []), ...(!paid && ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status) ? ['CANCELLED'] : [])];
});
watch(() => `${selected.value?.id || ''}:${session.token.value}`, () => { statusDraft.value = ''; actionError.value = ''; });
async function saveStatus() {
  if (saving.value || !selected.value || !nextStatuses.value.includes(statusDraft.value) || !session.token.value) return;
  const order = selected.value, token = session.token.value, target = statusDraft.value;
  if (target === 'CANCELLED' && !confirm('Отменить неоплаченный заказ? Доступность отмены и снятие резервов проверит сервер.')) return;
  saving.value = true; actionError.value = '';
  try {
    const result = await $fetch<any>(`/admin/orders/${encodeURIComponent(order.orderNumber)}/status`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: { status: target }, timeout: 35000 });
    if (session.token.value !== token || selected.value?.id !== order.id) return;
    if (!result || result.id !== order.id || result.status !== target) throw new Error('Invalid response');
    Object.assign(order, result); statusDraft.value = ''; savedOrder.value = { id: order.id, order: result };
  } catch (error: any) {
    if (session.token.value !== token || selected.value?.id !== order.id) return;
    const message = error?.data?.message;
    actionError.value = Array.isArray(message) ? message.join(' · ') : typeof message === 'string' ? message : 'Не удалось подтвердить изменение. Обновите заказ перед повторной попыткой: сервер уже мог принять запрос.';
  } finally { saving.value = false; }
}
let returnFocus: HTMLElement | null = null;
watch(() => Boolean(selected.value), async open => { if (open) { returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; await nextTick(); document.querySelector<HTMLElement>('.order-drawer .close')?.focus(); } });
function close() { if (!saving.value && (!statusDraft.value || confirm('Закрыть карточку без изменения статуса?'))) { selected.value = null; nextTick(() => { if (returnFocus?.isConnected) returnFocus.focus(); }); } }
function keys(event: KeyboardEvent) {
  if (!selected.value) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  if (event.key !== 'Tab') return;
  const controls = Array.from(document.querySelectorAll<HTMLElement>('.order-drawer button:not(:disabled), .order-drawer select:not(:disabled)')).filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
onMounted(() => window.addEventListener('keydown', keys));
onBeforeUnmount(() => { window.removeEventListener('keydown', keys); selected.value = null; });
onBeforeRouteLeave(() => { if (saving.value) return false; if (selected.value && statusDraft.value && !confirm('Уйти без изменения статуса заказа?')) return false; selected.value = null; });
const statuses: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', PAID: 'Оплачен', ASSEMBLING: 'Сборка', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const address = computed(() => { const value = selected.value?.shippingAddress; if (!value) return 'Адрес доставки не указан'; if (typeof value === 'string') return value; return Object.values(value).filter(Boolean).join(', '); });
async function copyNumber() { if (!selected.value) return; await navigator.clipboard?.writeText(selected.value.orderNumber); copied.value = true; setTimeout(() => copied.value = false, 1600); }
</script>
<template>
  <aside data-v-ui-3f69e94afb94 v-if="selected" class="order-backdrop admin-dialog-backdrop" @click.self="close"><section data-v-ui-3f69e94afb94 class="order-drawer admin-dialog admin-dialog--drawer" role="dialog" aria-modal="true" aria-label="Карточка заказа"><header data-v-ui-3f69e94afb94 class="drawer-header admin-dialog-head"><div data-v-ui-3f69e94afb94><p data-v-ui-3f69e94afb94 class="eyebrow">ЗАКАЗ МАГАЗИНА</p><div data-v-ui-3f69e94afb94 class="number-line"><h2 data-v-ui-3f69e94afb94>{{ selected.orderNumber }}</h2><button data-v-ui-3f69e94afb94 @click="copyNumber" title="Скопировать номер"><Check data-v-ui-3f69e94afb94 v-if="copied" :size="15" /><Copy data-v-ui-3f69e94afb94 v-else :size="15" /></button></div><span data-v-ui-3f69e94afb94>{{ new Date(selected.createdAt).toLocaleString('ru-RU') }}</span></div><button data-v-ui-3f69e94afb94 type="button" class="close" :disabled="saving" aria-label="Закрыть карточку заказа" @click="close"><X data-v-ui-3f69e94afb94 :size="19" /></button></header><div data-v-ui-3f69e94afb94 class="drawer-body admin-dialog-body"><div data-v-ui-3f69e94afb94 class="order-summary"><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Статус</span><strong data-v-ui-3f69e94afb94 :class="`status-${selected.status.toLowerCase()}`">{{ statuses[selected.status] || selected.status }}</strong></div><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Оплата</span><strong data-v-ui-3f69e94afb94>{{ statuses[selected.paymentStatus] || selected.paymentStatus }}</strong></div><div data-v-ui-3f69e94afb94><span data-v-ui-3f69e94afb94>Итого</span><strong data-v-ui-3f69e94afb94>{{ Number(selected.finalAmount || 0).toLocaleString('ru-RU') }} ₽</strong></div></div><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94><Package data-v-ui-3f69e94afb94 :size="16" /> Состав заказа</h3><div data-v-ui-3f69e94afb94 v-for="item in selected.items" :key="item.id" class="item"><div data-v-ui-3f69e94afb94><strong data-v-ui-3f69e94afb94>{{ item.productName }}</strong><small data-v-ui-3f69e94afb94>{{ item.variantName }} · {{ item.quantity }} шт.</small></div><span data-v-ui-3f69e94afb94>{{ Number(item.total || 0).toLocaleString('ru-RU') }} ₽</span></div><p data-v-ui-3f69e94afb94 v-if="!selected.items?.length" class="muted">Состав не указан</p></section><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94><Phone data-v-ui-3f69e94afb94 :size="16" /> Клиент</h3><div data-v-ui-3f69e94afb94 class="client"><strong data-v-ui-3f69e94afb94>{{ [selected.user?.firstName, selected.user?.lastName].filter(Boolean).join(' ') || 'Гость' }}</strong><span data-v-ui-3f69e94afb94>{{ selected.user?.email || 'Email не указан' }}</span><span data-v-ui-3f69e94afb94>{{ selected.user?.phone || 'Телефон не указан' }}</span></div></section><section data-v-ui-3f69e94afb94 class="detail-section"><h3 data-v-ui-3f69e94afb94><MapPin data-v-ui-3f69e94afb94 :size="16" /> Доставка</h3><p data-v-ui-3f69e94afb94 class="address">{{ address }}</p><p data-v-ui-3f69e94afb94 v-if="selected.shippingProvider || selected.trackingNumber" class="delivery-meta">{{ selected.shippingProvider || 'Служба доставки' }} <b data-v-ui-3f69e94afb94 v-if="selected.trackingNumber">· {{ selected.trackingNumber }}</b></p></section><section data-v-ui-3f69e94afb94 class="detail-section history"><h3 data-v-ui-3f69e94afb94>История статусов</h3><div data-v-ui-3f69e94afb94 v-for="entry in selected.history" :key="entry.id" class="history-row"><i data-v-ui-3f69e94afb94></i><div data-v-ui-3f69e94afb94><strong data-v-ui-3f69e94afb94>{{ statuses[entry.toStatus] || entry.toStatus }}</strong><small data-v-ui-3f69e94afb94>{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}<template v-if="entry.comment"> · {{ entry.comment }}</template></small></div></div><p data-v-ui-3f69e94afb94 v-if="!selected.history?.length" class="muted">История пока пуста</p></section></div><p data-v-ui-3f69e94afb94 v-if="actionError" class="studio-order-action-error" role="alert">{{ actionError }}</p><footer data-v-ui-3f69e94afb94 v-if="nextStatuses.length" class="studio-order-actions"><label data-v-ui-3f69e94afb94>Следующий этап<select data-v-ui-3f69e94afb94 v-model="statusDraft" :disabled="saving"><option data-v-ui-3f69e94afb94 value="">Выберите действие</option><option data-v-ui-3f69e94afb94 v-for="status in nextStatuses" :key="status" :value="status">{{ statuses[status] }}</option></select></label><button data-v-ui-3f69e94afb94 type="button" class="studio-order-save" :disabled="saving || !statusDraft" @click="saveStatus">{{ saving ? 'Сохраняем…' : 'Изменить статус' }}</button></footer></section></aside>
</template>

