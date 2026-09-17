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
  <div data-v-ui-557e9c624b57 class="admin-page">
    <header data-v-ui-557e9c624b57 class="admin-header"><NuxtLink data-v-ui-557e9c624b57 to="/" class="logo"><img data-v-ui-557e9c624b57 src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><span data-v-ui-557e9c624b57>Административная панель</span><NuxtLink data-v-ui-557e9c624b57 to="/" class="back-link">В магазин →</NuxtLink></header>
    <main data-v-ui-557e9c624b57 v-if="!dashboard" class="admin-login"><div data-v-ui-557e9c624b57 class="admin-login-card"><div data-v-ui-557e9c624b57 class="admin-icon"><LogIn data-v-ui-557e9c624b57 :size="24" /></div><p data-v-ui-557e9c624b57 class="kicker">SARKISIAN BRAND</p><h1 data-v-ui-557e9c624b57>Вход в админку</h1><p data-v-ui-557e9c624b57>Доступ только для сотрудников с ролью администратора или менеджера.</p><form data-v-ui-557e9c624b57 @submit.prevent="login"><label data-v-ui-557e9c624b57>Email<input data-v-ui-557e9c624b57 v-model="email" type="email" required /></label><label data-v-ui-557e9c624b57>Пароль<input data-v-ui-557e9c624b57 v-model="password" type="password" required /></label><p data-v-ui-557e9c624b57 v-if="loginError" class="login-error">{{ loginError }}</p><button data-v-ui-557e9c624b57 class="admin-submit" :disabled="loading">{{ loading ? 'Проверяем…' : 'Войти' }} <LogIn data-v-ui-557e9c624b57 :size="17" /></button></form></div></main>
    <main data-v-ui-557e9c624b57 v-else class="admin-main"><div data-v-ui-557e9c624b57 class="admin-title"><div data-v-ui-557e9c624b57><p data-v-ui-557e9c624b57 class="kicker">OVERVIEW</p><h1 data-v-ui-557e9c624b57>Добрый день</h1></div><button data-v-ui-557e9c624b57 class="refresh" @click="loadAdmin"><RefreshCw data-v-ui-557e9c624b57 :size="17" /> Обновить</button></div><div data-v-ui-557e9c624b57 class="kpi-grid"><div data-v-ui-557e9c624b57 class="kpi"><ShoppingCart data-v-ui-557e9c624b57 :size="20" /><span data-v-ui-557e9c624b57>Заказы</span><strong data-v-ui-557e9c624b57>{{ dashboard.orders }}</strong></div><div data-v-ui-557e9c624b57 class="kpi"><BarChart3 data-v-ui-557e9c624b57 :size="20" /><span data-v-ui-557e9c624b57>Оплачено</span><strong data-v-ui-557e9c624b57>{{ dashboard.paidOrders }}</strong></div><div data-v-ui-557e9c624b57 class="kpi"><Users data-v-ui-557e9c624b57 :size="20" /><span data-v-ui-557e9c624b57>Клиенты</span><strong data-v-ui-557e9c624b57>{{ dashboard.customers }}</strong></div><div data-v-ui-557e9c624b57 class="kpi"><Package data-v-ui-557e9c624b57 :size="20" /><span data-v-ui-557e9c624b57>Товары</span><strong data-v-ui-557e9c624b57>{{ dashboard.products }}</strong></div></div><section data-v-ui-557e9c624b57 class="admin-section"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Последние заказы</h2><span data-v-ui-557e9c624b57>{{ orders.length }} записей</span></div><div data-v-ui-557e9c624b57 class="order-table"><div data-v-ui-557e9c624b57 class="table-head"><span data-v-ui-557e9c624b57>Номер</span><span data-v-ui-557e9c624b57>Статус</span><span data-v-ui-557e9c624b57>Сумма</span><span data-v-ui-557e9c624b57>Дата</span></div><div data-v-ui-557e9c624b57 v-for="order in orders" :key="order.id" class="table-row"><b data-v-ui-557e9c624b57>{{ order.orderNumber }}</b><span data-v-ui-557e9c624b57 class="status">{{ order.status }}</span><span data-v-ui-557e9c624b57>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</span><span data-v-ui-557e9c624b57>{{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</span></div></div></section></main>
    <section data-v-ui-557e9c624b57 v-if="dashboard" class="admin-section admin-orders"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Управление статусами заказов</h2><span data-v-ui-557e9c624b57>{{ orders.length }} заказов</span></div><div data-v-ui-557e9c624b57 class="admin-order-controls"><article data-v-ui-557e9c624b57 v-for="order in orders" :key="`control-${order.id}`"><div data-v-ui-557e9c624b57><strong data-v-ui-557e9c624b57>{{ order.orderNumber }}</strong><small data-v-ui-557e9c624b57>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</small></div><select data-v-ui-557e9c624b57 v-model="order.status"><option data-v-ui-557e9c624b57 value="NEW">Новый</option><option data-v-ui-557e9c624b57 value="CONFIRMED">Подтверждён</option><option data-v-ui-557e9c624b57 value="PROCESSING">В обработке</option><option data-v-ui-557e9c624b57 value="READY_FOR_SHIPMENT">Готов к отправке</option><option data-v-ui-557e9c624b57 value="SHIPPED">Отправлен</option><option data-v-ui-557e9c624b57 value="DELIVERED">Доставлен</option><option data-v-ui-557e9c624b57 value="CANCELLED">Отменён</option></select><button data-v-ui-557e9c624b57 class="refresh" @click="saveOrderStatus(order)" :disabled="savingOrder === order.orderNumber">{{ savingOrder === order.orderNumber ? 'Сохраняем...' : 'Обновить' }}</button></article></div></section><section data-v-ui-557e9c624b57 v-if="dashboard" class="admin-section admin-catalog"><div data-v-ui-557e9c624b57 class="admin-section-title"><h2 data-v-ui-557e9c624b57>Каталог товаров</h2><span data-v-ui-557e9c624b57>{{ products.length }} позиций</span></div><div data-v-ui-557e9c624b57 class="admin-products"><article data-v-ui-557e9c624b57 v-for="product in products" :key="product.id" class="admin-product-row"><div data-v-ui-557e9c624b57 class="admin-product-name"><input data-v-ui-557e9c624b57 v-model="product.nameRu" /><small data-v-ui-557e9c624b57>{{ product.sku }}</small></div><label data-v-ui-557e9c624b57>Цена<input data-v-ui-557e9c624b57 v-model.number="product.variants[0].price" type="number" min="0" /></label><label data-v-ui-557e9c624b57>Остаток<input data-v-ui-557e9c624b57 v-model.number="product.variants[0].stock" type="number" min="0" /></label><button data-v-ui-557e9c624b57 class="refresh" @click="saveProduct(product)" :disabled="savingProduct === product.id">{{ savingProduct === product.id ? 'Сохраняем...' : 'Сохранить' }}</button></article></div></section>
  </div>
</template>


