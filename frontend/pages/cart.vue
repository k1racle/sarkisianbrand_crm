<script setup lang="ts">
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from '@lucide/vue';
const config = useRuntimeConfig();
const session = useCookie('sb-cart-session', { default: () => `web-${Math.random().toString(36).slice(2)}` });
const cart = ref<any>(null);
const loading = ref(true);
const success = ref<any>(null);
const payment = ref<any>(null);
const error = ref('');
const address = reactive({ city: '', address: '', postalCode: '' });

async function loadCart() { loading.value = true; cart.value = await $fetch('/cart', { baseURL: config.public.apiBase, headers: { 'x-cart-session': session.value } }); loading.value = false; }
async function change(item: any, quantity: number) { await $fetch(`/cart/items/${item.id}`, { baseURL: config.public.apiBase, method: 'PATCH', headers: { 'x-cart-session': session.value }, body: { quantity: Math.max(1, quantity) } }); await loadCart(); }
async function remove(item: any) { await $fetch(`/cart/items/${item.id}`, { baseURL: config.public.apiBase, method: 'DELETE', headers: { 'x-cart-session': session.value } }); await loadCart(); }
async function checkout() { error.value = ''; try { success.value = await $fetch<any>('/orders/checkout', { baseURL: config.public.apiBase, method: 'POST', headers: { 'x-cart-session': session.value }, body: { shippingAddress: address, paymentMethod: 'YOOKASSA' } }); payment.value = await $fetch('/payments/orders/' + success.value.orderNumber, { baseURL: config.public.apiBase, method: 'POST', body: { returnUrl: window.location.origin + '/cart' } }); await loadCart(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось оформить заказ'; } }
await loadCart();
</script>

<template>
  <div class="site"><header class="header"><NuxtLink to="/" class="logo"><img src="/sarkisian-logo.png" alt="SARKISIAN" /></NuxtLink><NuxtLink to="/" class="back-link"><ArrowLeft :size="17" /> Вернуться в каталог</NuxtLink></header><main class="cart-page"><div class="cart-title"><div><p class="kicker">YOUR SHOPPING BAG</p><h1>Корзина</h1></div><span v-if="cart">{{ cart.items?.length || 0 }} позиции</span></div><div v-if="success" class="success-box"><b>Заказ {{ success.orderNumber }} создан.</b><span v-if="payment">Платёжная сессия готова.</span><a v-if="payment" :href="payment.confirmationUrl" class="product-page-button" target="_blank"><ShoppingBag :size="18" /> Перейти к оплате</a></div><div v-else-if="!loading && cart?.items?.length" class="cart-layout"><section class="cart-items"><article v-for="item in cart.items" :key="item.id" class="cart-item"><div class="cart-thumb"><span>{{ item.variant.product.nameRu.slice(0, 1) }}</span></div><div class="cart-item-info"><h2>{{ item.variant.product.nameRu }}</h2><p>{{ item.variant.name }} · {{ Number(item.variant.price).toLocaleString('ru-RU') }} ₽</p><div class="quantity"><button @click="change(item, item.quantity - 1)"><Minus :size="14" /></button><b>{{ item.quantity }}</b><button @click="change(item, item.quantity + 1)"><Plus :size="14" /></button></div></div><strong>{{ (Number(item.variant.price) * item.quantity).toLocaleString('ru-RU') }} ₽</strong><button class="remove" @click="remove(item)"><Trash2 :size="17" /></button></article></section><aside class="checkout-card"><h2>Оформление</h2><div class="checkout-total"><span>Итого</span><strong>{{ Number(cart.total).toLocaleString('ru-RU') }} ₽</strong></div><input v-model="address.city" placeholder="Город" /><input v-model="address.address" placeholder="Адрес доставки" /><input v-model="address.postalCode" placeholder="Индекс" /><p v-if="error" class="login-error">{{ error }}</p><button class="product-page-button" :disabled="!address.city || !address.address" @click="checkout"><ShoppingBag :size="18" /> Оформить заказ</button></aside></div><div v-else class="empty-cart"><ShoppingBag :size="42" /><h2>В корзине пока пусто</h2><NuxtLink to="/" class="product-page-button">Перейти в каталог</NuxtLink></div></main></div>
</template>
