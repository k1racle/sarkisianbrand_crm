<script setup lang="ts">
import { ArrowRight, ChevronLeft, ShoppingBag, Trash2, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { cartSession, cart, cartCount, loadCart, authHeaders } = useStorefront();
const loading = ref(false);
const busy = ref(''); const error = ref('');
function message(exception: any) { return Array.isArray(exception?.data?.message) ? exception.data.message.join('. ') : exception?.data?.message || 'Не удалось обновить корзину. Попробуйте ещё раз.'; }

const total = computed(() => Number(cart.value?.total || 0));
const countLabel = computed(() => {
  const count = cartCount.value, last = count % 10, lastTwo = count % 100;
  return `${count} ${last === 1 && lastTwo !== 11 ? 'товар' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'товара' : 'товаров'}`;
});

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
      <div v-if="open" class="sb-glass-layer sd-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-cart-drawer sd-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          <div class="sd-toolbar">
            <button type="button" aria-label="Вернуться к покупкам" @click="emit('close')"><ChevronLeft :size="32" :stroke-width="1" /></button>
            <button type="button" aria-label="Закрыть" @click="emit('close')"><X :size="32" :stroke-width="1.5" /></button>
          </div>
          <div class="sd-content">
          <header class="sd-heading sd-cart-heading"><h2 id="cart-drawer-title">Корзина</h2><span aria-live="polite">{{ countLabel }}</span></header>

          <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
          <div v-if="loading" class="sb-drawer-state">Загружаем корзину…</div>
          <div v-else-if="cart?.items?.length" class="sd-cart">
            <div class="sd-cart-list" :aria-busy="!!busy">
              <article v-for="item in cart.items" :key="item.id" class="sd-cart-item">
                <div class="sd-cart-media">
                <NuxtLink :to="storefrontProductLink(item.variant.product)" class="sd-cart-image" @click="emit('close')">
                  <img v-if="storefrontProductImage(item.variant.product)" :src="storefrontProductImage(item.variant.product)!" :alt="item.variant.product.nameRu" />
                  <span v-else class="sd-image-placeholder">SARKISIAN<small>Фото появится позже</small></span>
                </NuxtLink>
                <SiteQuantityControl :quantity="item.quantity" :max="Math.max(item.quantity, item.variant.stock - item.variant.reserved)" :disabled="!!busy" compact @change="change(item, $event)" />
                </div>
                <div class="sd-cart-info">
                  <NuxtLink :to="storefrontProductLink(item.variant.product)" @click="emit('close')">{{ item.variant.product.nameRu }}</NuxtLink>
                  <small>{{ item.variant.name && item.variant.name !== 'Основной вариант' ? item.variant.name : item.variant.sku }}</small>
                  <div class="sd-cart-item-bottom"><button class="sd-remove" type="button" :aria-label="`Удалить товар ${item.variant.product.nameRu}`" :disabled="!!busy" @click="remove(item)"><Trash2 :size="16" /><span>Удалить</span></button><strong>{{ (Number(item.variant.price) * item.quantity).toLocaleString('ru-RU') }} ₽</strong></div>
                </div>
              </article>
            </div>
            <SiteCartRecommendations drawer />
            <div class="sd-cart-footer">
              <div class="sd-cart-total"><span>Итого</span><strong>{{ total.toLocaleString('ru-RU') }} ₽</strong></div>
              <small>Доставка рассчитывается при оформлении</small>
              <NuxtLink to="/cart" class="sb-liquid-primary" @click="emit('close')">Перейти к оформлению</NuxtLink>
              <button class="sb-drawer-secondary" @click="emit('close')">Продолжить покупки</button>
            </div>
          </div>

          <div v-else class="sb-drawer-empty">
            <i><ShoppingBag :size="30" /></i>
            <h3>Здесь пока пусто</h3>
            <p>Добавьте профессиональные материалы из каталога.</p>
            <NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Открыть каталог <ArrowRight :size="17" /></NuxtLink>
          </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
