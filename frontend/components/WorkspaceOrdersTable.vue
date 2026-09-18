<script setup lang="ts">
import { ArrowUpRight, Search, ShoppingBag, X } from '@lucide/vue';
const props = defineProps<{ items: any[]; total: number; search: string; status: string; busy: boolean }>();
const emit = defineEmits<{ 'update:search': [value: string]; 'update:status': [value: string]; open: [order: any]; context: [event: MouseEvent, order: any] }>();
const statuses = [{ id: '', label: 'Все заказы' }, { id: 'NEW', label: 'Новые' }, { id: 'CONFIRMED', label: 'Подтверждены' }, { id: 'ASSEMBLING', label: 'В сборке' }, { id: 'SHIPPED', label: 'Отправлены' }, { id: 'DELIVERED', label: 'Доставлены' }, { id: 'PAYMENT_WAITING', label: 'Ожидают оплаты' }, { id: 'PAID', label: 'Оплачены' }, { id: 'CANCELLED', label: 'Отменены' }, { id: 'REFUNDED', label: 'Возврат' }];
const paymentNames: Record<string, string> = { PENDING: 'Ожидает оплаты', PAID: 'Оплачен', SUCCEEDED: 'Оплачен', UNPAID: 'Не оплачен', FAILED: 'Ошибка оплаты', CANCELLED: 'Отменена', REFUNDED: 'Возвращена', PARTIALLY_REFUNDED: 'Частичный возврат' };
const statusNames: Record<string, string> = { NEW: 'Новый', CONFIRMED: 'Подтверждён', ASSEMBLING: 'В сборке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', PAID: 'Оплачен', PAYMENT_WAITING: 'Ожидает оплаты', CANCELLED: 'Отменён', REFUNDED: 'Возврат' };
const customerName = (order: any) => [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || 'Гостевой заказ';
function amount(value: unknown) { const n = value == null || value === '' ? NaN : Number(value); return Number.isFinite(n) ? `${n.toLocaleString('ru-RU')} ₽` : '—'; }
function date(value: string) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Дата не указана'; }
function delivery(order: any) { return order.deliveryMethod === 'PVZ' ? 'Пункт выдачи' : order.deliveryMethod === 'COURIER' ? 'Курьер' : 'Способ не выбран'; }
</script>

<template>
  <section class="studio-orders" aria-label="Заказы интернет-магазина" :aria-busy="busy">
    <div class="studio-order-tools">
      <label class="studio-order-search"><Search :size="18" aria-hidden="true" /><span class="wn-sr-only">Поиск заказов</span><input id="studio-orders-query" :value="search" type="search" aria-label="Поиск заказов" placeholder="Номер заказа или email клиента" @input="emit('update:search', ($event.target as HTMLInputElement).value)" /></label>
      <label class="studio-order-filter"><span class="wn-sr-only">Статус заказа</span><select :value="status" aria-label="Статус заказа" @change="emit('update:status', ($event.target as HTMLSelectElement).value)"><option v-for="view in statuses" :key="view.id" :value="view.id">{{ view.label }}</option></select></label>
      <button v-if="search || status" type="button" class="studio-order-reset" @click="emit('update:search', ''); emit('update:status', '')"><X :size="16" /> Сбросить</button>
      <span class="studio-order-total" role="status">{{ busy ? 'Обновляем…' : `Найдено: ${total}` }}</span>
    </div>
    <div class="studio-orders-scroll"><table class="studio-orders-table"><thead><tr><th scope="col">Заказ</th><th scope="col">Покупатель</th><th scope="col">Доставка</th><th scope="col" class="studio-order-amount">Сумма</th><th scope="col">Заказ и оплата</th><th scope="col">Передача в 1С</th><th scope="col"><span class="wn-sr-only">Открыть заказ</span></th></tr></thead><tbody><tr v-for="order in items" :key="order.id" @click="emit('open', order)" @contextmenu.prevent="emit('context', $event, order)">
      <td><button type="button" class="studio-order-open" @click.stop="emit('open', order)">{{ order.orderNumber }}</button><small>{{ date(order.createdAt) }}</small></td>
      <td><strong>{{ customerName(order) }}</strong><small>{{ order.user?.email || 'Email не указан' }}</small></td>
      <td><span>{{ delivery(order) }}</span><small>{{ order.shippingAddress?.city || '—' }}</small></td>
      <td class="studio-order-amount"><strong>{{ amount(order.finalAmount) }}</strong></td>
      <td><span class="studio-status" :class="{ 'studio-status--positive': ['DELIVERED', 'PAID'].includes(order.status), 'studio-status--new': order.status === 'NEW', 'studio-status--muted': ['CANCELLED', 'REFUNDED'].includes(order.status) }">{{ statusNames[order.status] || order.status }}</span><small>{{ paymentNames[order.paymentStatus] || order.paymentStatus || 'Не указана' }}</small></td>
      <td><span class="studio-sync" :class="{ 'studio-sync--error': order.oneCSyncError }">{{ order.oneCSyncError ? 'Ошибка передачи' : order.isSynced1C ? 'Передан' : 'Не передан' }}</span></td>
      <td><ArrowUpRight :size="18" aria-hidden="true" /></td>
    </tr></tbody></table></div>
    <div class="studio-orders-mobile"><button v-for="order in items" :key="order.id" type="button" class="studio-mobile-order" @click="emit('open', order)" @contextmenu.prevent="emit('context', $event, order)"><span class="studio-mobile-order-top"><strong>{{ order.orderNumber }}</strong><span class="studio-status" :class="{ 'studio-status--new': order.status === 'NEW' }">{{ statusNames[order.status] || order.status }}</span></span><span class="studio-mobile-order-date">{{ date(order.createdAt) }}</span><span class="studio-mobile-order-top"><span>{{ customerName(order) }}</span><strong>{{ amount(order.finalAmount) }}</strong></span><span class="studio-mobile-order-meta">{{ delivery(order) }} · {{ order.shippingAddress?.city || 'Адрес не указан' }}</span><span class="studio-mobile-order-meta">{{ paymentNames[order.paymentStatus] || order.paymentStatus || 'Оплата не указана' }}</span></button></div>
    <div v-if="!items.length" class="studio-orders-empty"><ShoppingBag :size="28" /><h3>{{ busy ? 'Загружаем заказы' : 'Заказы не найдены' }}</h3><p>{{ search || status ? 'Измените поисковый запрос или сбросьте фильтры.' : 'Здесь появятся заказы интернет-магазина.' }}</p></div>
    <footer class="studio-orders-foot">На странице: {{ items.length }} · Нажмите на номер заказа, чтобы открыть карточку.</footer>
  </section>
</template>
