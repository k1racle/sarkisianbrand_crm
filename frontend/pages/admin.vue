<script setup lang="ts">
import { BarChart3, Box, LogIn, Package, RefreshCw, ShoppingCart, Users } from '@lucide/vue';

const config = useRuntimeConfig();
const email = ref('');
const password = ref('');
const token = ref('');
const loginError = ref('');
const loading = ref(false);
const dashboard = ref<any>(null);
const orders = ref<any[]>([]);

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
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-header"><NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><span>Административная панель</span><NuxtLink to="/" class="back-link">В магазин →</NuxtLink></header>
    <main v-if="!dashboard" class="admin-login"><div class="admin-login-card"><div class="admin-icon"><LogIn :size="24" /></div><p class="kicker">SARKISIAN BRAND</p><h1>Вход в админку</h1><p>Доступ только для сотрудников с ролью администратора или менеджера.</p><form @submit.prevent="login"><label>Email<input v-model="email" type="email" required /></label><label>Пароль<input v-model="password" type="password" required /></label><p v-if="loginError" class="login-error">{{ loginError }}</p><button class="admin-submit" :disabled="loading">{{ loading ? 'Проверяем…' : 'Войти' }} <LogIn :size="17" /></button></form></div></main>
    <main v-else class="admin-main"><div class="admin-title"><div><p class="kicker">OVERVIEW</p><h1>Добрый день</h1></div><button class="refresh" @click="loadAdmin"><RefreshCw :size="17" /> Обновить</button></div><div class="kpi-grid"><div class="kpi"><ShoppingCart :size="20" /><span>Заказы</span><strong>{{ dashboard.orders }}</strong></div><div class="kpi"><BarChart3 :size="20" /><span>Оплачено</span><strong>{{ dashboard.paidOrders }}</strong></div><div class="kpi"><Users :size="20" /><span>Клиенты</span><strong>{{ dashboard.customers }}</strong></div><div class="kpi"><Package :size="20" /><span>Товары</span><strong>{{ dashboard.products }}</strong></div></div><section class="admin-section"><div class="admin-section-title"><h2>Последние заказы</h2><span>{{ orders.length }} записей</span></div><div class="order-table"><div class="table-head"><span>Номер</span><span>Статус</span><span>Сумма</span><span>Дата</span></div><div v-for="order in orders" :key="order.id" class="table-row"><b>{{ order.orderNumber }}</b><span class="status">{{ order.status }}</span><span>{{ Number(order.finalAmount).toLocaleString('ru-RU') }} ₽</span><span>{{ new Date(order.createdAt).toLocaleDateString('ru-RU') }}</span></div></div></section></main>
  </div>
</template>
