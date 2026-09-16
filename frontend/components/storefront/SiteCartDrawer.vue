<script setup lang="ts">
import { ArrowRight, ShoppingBag, Trash2, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { cartSession, cart, loadCart, authHeaders } = useStorefront();
const loading = ref(false);
const busy = ref(''); const error = ref('');
function message(exception: any) { return Array.isArray(exception?.data?.message) ? exception.data.message.join('. ') : exception?.data?.message || 'Не удалось обновить корзину. Попробуйте ещё раз.'; }

const total = computed(() => Number(cart.value?.total || 0));

async function change(item: any, quantity: number) {
  if (busy.value) return; busy.value = item.id; error.value = '';
  try {
  cart.value = await $fetch(`/cart/items/${item.id}`, {
    baseURL: config.public.apiBase,
    method: 'PATCH',
    headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
    body: { quantity: Math.max(1, quantity) },
  });
  } catch (exception) { error.value = message(exception); } finally { busy.value = ''; }
}

async function remove(item: any) {
  if (busy.value) return; busy.value = item.id; error.value = '';
  try {
  cart.value = await $fetch(`/cart/items/${item.id}`, {
    baseURL: config.public.apiBase,
    method: 'DELETE',
    headers: { ...authHeaders.value, 'x-cart-session': cartSession.value },
  });
  } catch (exception) { error.value = message(exception); } finally { busy.value = ''; }
}

watch(() => props.open, async (value) => {
  if (!value) return;
  loading.value = true;
  error.value = ''; await loadCart().catch(exception => { error.value = message(exception); });
  loading.value = false;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-cart-drawer" aria-label="Корзина">
          <header class="sb-drawer-head">
            <div>
              <span>ВАШ ЗАКАЗ</span>
              <h2>Корзина</h2>
              <p>{{ cart?.items?.length || 0 }} {{ cart?.items?.length === 1 ? 'позиция' : 'позиций' }}</p>
            </div>
            <button aria-label="Закрыть" @click="emit('close')"><X :size="20" /></button>
          </header>

          <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
          <div v-if="loading" class="sb-drawer-state">Загружаем корзину…</div>
          <div v-else-if="cart?.items?.length" class="sb-mini-cart">
            <div class="sb-mini-cart__list">
              <article v-for="item in cart.items" :key="item.id">
                <NuxtLink :to="`/products/${item.variant.product.slug}`" class="sb-mini-cart__image" @click="emit('close')">
                  <img v-if="storefrontProductImage(item.variant.product)" :src="storefrontProductImage(item.variant.product)!" :alt="item.variant.product.nameRu" />
                  <span v-else>S</span>
                </NuxtLink>
                <div class="sb-mini-cart__info">
                  <NuxtLink :to="`/products/${item.variant.product.slug}`" @click="emit('close')">{{ item.variant.product.nameRu }}</NuxtLink>
                  <small>{{ item.variant.sku }}</small>
                  <SiteQuantityControl :quantity="item.quantity" :max="Math.max(item.quantity, item.variant.stock - item.variant.reserved)" :disabled="!!busy" compact @change="change(item, $event)" />
                </div>
                <strong>{{ (Number(item.variant.price) * item.quantity).toLocaleString('ru-RU') }} ₽</strong>
                <button class="sb-mini-cart__remove" aria-label="Удалить товар" :disabled="!!busy" @click="remove(item)"><Trash2 :size="17" /></button>
              </article>
            </div>

            <div class="sb-mini-cart__footer">
              <div><span>Итого</span><strong>{{ total.toLocaleString('ru-RU') }} ₽</strong></div>
              <small>Доставка рассчитывается при оформлении</small>
              <NuxtLink to="/cart" class="sb-liquid-primary" @click="emit('close')">Оформить заказ <ArrowRight :size="17" /></NuxtLink>
              <button class="sb-drawer-secondary" @click="emit('close')">Продолжить покупки</button>
            </div>
          </div>

          <div v-else class="sb-drawer-empty">
            <i><ShoppingBag :size="30" /></i>
            <h3>Здесь пока пусто</h3>
            <p>Добавьте профессиональные материалы из каталога.</p>
            <NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Открыть каталог <ArrowRight :size="17" /></NuxtLink>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
