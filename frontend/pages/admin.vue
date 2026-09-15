<script setup lang="ts">
import { BarChart3, Box, LogIn, Package, RefreshCw, ShoppingCart, Users } from '@lucide/vue';
await navigateTo('/admin-workspace');

const config = useRuntimeConfig();
const email = ref('');
const password = ref('');
const token = ref('');
const loginError = ref('');
const loading = ref(false);
const dashboard = ref<any>(null);
const orders = ref<any[]>([]);
const products = ref<any[]>([]);
const savingProduct = ref<string | null>(null);
const savingOrder = ref<string | null>(null);

async function login() {
  loading.value = true; loginError.value = '';
  try {
    const result = await $fetch<any>('/auth/login', { baseURL: config.public.apiBase, method: 'POST', body: { email: email.value, password: password.value } });
    token.value = result.accessToken;
    await loadAdmin();
  } catch (error: any) { loginError.value = error?.data?.message || 'Не удалось войти'; }
  finally { loading.value = false; }
}

async function loadAdmin() {
  const headers = { Authorization: `Bearer ${token.value}` };
  dashboard.value = await $fetch('/admin/dashboard', { baseURL: config.public.apiBase, headers });
  orders.value = await $fetch<any[]>('/admin/orders', { baseURL: config.public.apiBase, headers });
  products.value = await $fetch<any[]>('/admin/products', { baseURL: config.public.apiBase, headers });
}

async function saveProduct(product: any) {
  savingProduct.value = product.id;
  try {
    const updated = await $fetch<any>(`/admin/products/${product.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${token.value}` }, body: { nameRu: product.nameRu, price: Number(product.variants?.[0]?.price || product.basePrice), stock: Number(product.variants?.[0]?.stock || 0), descriptionRu: product.descriptionRu, isActive: product.isActive } });
    Object.assign(product, updated);
  } finally { savingProduct.value = null; }
}

async function saveOrderStatus(order: any) {
  savingOrder.value = order.orderNumber;
  try {
    const statusMap: Record<string, string> = { PROCESSING: 'ASSEMBLING', READY_FOR_SHIPMENT: 'CONFIRMED' };
    await $fetch(`/admin/orders/${order.orderNumber}/status`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { Authorization: `Bearer ${token.value}` }, body: { status: statusMap[order.status] || order.status, comment: 'Изменено из административной панели' } });
  } finally { savingOrder.value = null; }
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-header"><NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><span>Административная панель</span><NuxtLink to="/" class="back-link">В магазин →</NuxtLink></header>
    <main v-if="!dashboard" class="admin-login"><div class="admin-login-card"><div class="admin-icon"><LogIn :size="24" /></div><p class="kicker">SARKISIAN BRAND</p><h1>Вход в админку</h1><p>Доступ только для сотрудников с ролью администратора или менеджера.</p><form @submit.prevent="login"><label>Email<input v-model="email" type="email" required /></label><label>Пароль<input v-model="password" type="password" required /></label><p v-if="loginError" class="login-error">{{ loginError }}</p><button class="admin-submit" :disabled="loading">{{ loading ? 'Проверяем…' : 'Войти' }} <LogIn :size="17" /></button></form></div></main>
    <main v-else class="admin-main"><div class="admin-title"><div><p class="kicker">OVERVIEW</p><h1>Добрый день</h1></div><button class="refresh" @click="loadAdmin"><RefreshCw :size="17" /> Обновить</button></div><div class="kpi-grid"><div class="kpi"><ShoppingCart :size="20" /><span>Заказы</span><strong>{{ dashboard.orders }}</strong></div><div class="kpi"><BarChart3 :size="20" /><span>Оплачено</span><strong>{{ dashboard.paidOrders }}</strong></div><div class="kpi"><Users :size="20" /><span>Клиенты</span><strong>{{ dashboard.customers }}</strong></div><div class="kpi"><Package :size="20" /><span>Товары</span><strong>{{ dashboard.products }}</strong></div></div><section class="admin-section"><div class="admin-section-title"><h2>Последние заказы</h2><span>{{ orders.length }} записей</span></div><div class="order-table"><div class="table-head"><span>Номер</span><span>Статус</span><span>Сумма</span><span>Дата</span></div><div v-for="order in orders" :key="order.id" class="table-row"><b>{{ order.orderNumber }}</b><span class="status">{{ order.status }}</span><span>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</span><span>{{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</span></div></div></section></main>
    <section v-if="dashboard" class="admin-section admin-orders"><div class="admin-section-title"><h2>Управление статусами заказов</h2><span>{{ orders.length }} заказов</span></div><div class="admin-order-controls"><article v-for="order in orders" :key="`control-${order.id}`"><div><strong>{{ order.orderNumber }}</strong><small>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</small></div><select v-model="order.status"><option value="NEW">Новый</option><option value="CONFIRMED">Подтверждён</option><option value="PROCESSING">В обработке</option><option value="READY_FOR_SHIPMENT">Готов к отправке</option><option value="SHIPPED">Отправлен</option><option value="DELIVERED">Доставлен</option><option value="CANCELLED">Отменён</option></select><button class="refresh" @click="saveOrderStatus(order)" :disabled="savingOrder === order.orderNumber">{{ savingOrder === order.orderNumber ? 'Сохраняем...' : 'Обновить' }}</button></article></div></section><section v-if="dashboard" class="admin-section admin-catalog"><div class="admin-section-title"><h2>Каталог товаров</h2><span>{{ products.length }} позиций</span></div><div class="admin-products"><article v-for="product in products" :key="product.id" class="admin-product-row"><div class="admin-product-name"><input v-model="product.nameRu" /><small>{{ product.sku }}</small></div><label>Цена<input v-model.number="product.variants[0].price" type="number" min="0" /></label><label>Остаток<input v-model.number="product.variants[0].stock" type="number" min="0" /></label><button class="refresh" @click="saveProduct(product)" :disabled="savingProduct === product.id">{{ savingProduct === product.id ? 'Сохраняем...' : 'Сохранить' }}</button></article></div></section>
  </div>
</template>

<style scoped>
.admin-catalog { margin-top: 24px; }
.admin-products { display: grid; gap: 10px; }
.admin-product-row { display: grid; grid-template-columns: minmax(260px, 1fr) 130px 130px 110px; gap: 14px; align-items: end; padding: 14px 0; border-bottom: 1px solid var(--line); }
.admin-product-row label { display: grid; gap: 6px; color: var(--muted); font-size: 10px; }
.admin-product-row input { width: 100%; height: 38px; border: 1px solid var(--line); padding: 0 9px; outline: 0; background: #fff; }
.admin-product-name { display: grid; gap: 5px; }
.admin-product-name small { font-size: 10px; color: var(--muted); }
@media (max-width: 700px) { .admin-product-row { grid-template-columns: 1fr 1fr; } .admin-product-name, .admin-product-row .refresh { grid-column: 1 / -1; } }
.admin-orders { margin-top: 24px; }.admin-order-controls { display: grid; gap: 10px; }.admin-order-controls article { display: grid; grid-template-columns: 1fr 180px 110px; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }.admin-order-controls article div { display: grid; gap: 4px; }.admin-order-controls small { color: var(--muted); font-size: 10px; }.admin-order-controls select { height: 38px; border: 1px solid var(--line); background: #fff; padding: 0 8px; }
@media (max-width: 700px) { .admin-order-controls article { grid-template-columns: 1fr 1fr; }.admin-order-controls article div { grid-column: 1 / -1; } }
</style>
