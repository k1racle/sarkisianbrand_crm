<script setup lang="ts">
import { ArrowRight, Heart, ShoppingBag, Trash2, X } from '@lucide/vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; 'after-leave': [] }>();
const motionDuration = useStorefrontMotion();
const config = useRuntimeConfig();
const { favoriteIds, toggleFavorite, addToCart, syncFavorites } = useStorefront();
const products = ref<any[]>([]);
const loading = ref(false);
const addedId = ref('');

const favorites = computed(() => products.value.filter((product) => favoriteIds.value.includes(product.id)));

async function load() {
  loading.value = true;
  try {
    await syncFavorites();
    const response = await $fetch<any>('/products', { baseURL: config.public.apiBase, query: { limit: 100 } });
    products.value = response?.items || [];
  } finally {
    loading.value = false;
  }
}

async function add(product: any) {
  await addToCart(product);
  addedId.value = product.id;
  setTimeout(() => { if (addedId.value === product.id) addedId.value = ''; }, 1600);
}

watch(() => props.open, (value) => { if (value) load().catch(() => undefined); });
</script>

<template>
  <Teleport to="body">
    <Transition name="sf-drawer" :duration="motionDuration" @after-leave="emit('after-leave')">
      <div v-if="open" class="sb-glass-layer" @click.self="emit('close')">
        <aside class="sb-side-drawer sb-favorites-drawer" aria-label="Избранное">
          <header class="sb-drawer-head">
            <div><span>ВАША ПОДБОРКА</span><h2>Избранное</h2><p>{{ favoriteIds.length }} сохранённых товаров</p></div>
            <button aria-label="Закрыть" @click="emit('close')"><X :size="20" /></button>
          </header>

          <div v-if="loading" class="sb-drawer-state">Загружаем избранное…</div>
          <div v-else-if="favorites.length" class="sb-favorite-list">
            <article v-for="product in favorites" :key="product.id">
              <NuxtLink :to="`/products/${product.slug}`" class="sb-favorite-list__image" @click="emit('close')">
                <img v-if="storefrontProductImage(product)" :src="storefrontProductImage(product)!" :alt="product.nameRu" />
                <span v-else>S</span>
              </NuxtLink>
              <div>
                <small>{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN BRAND' }}</small>
                <NuxtLink :to="`/products/${product.slug}`" @click="emit('close')">{{ product.nameRu }}</NuxtLink>
                <strong>{{ Number(product.basePrice).toLocaleString('ru-RU') }} ₽</strong>
                <button @click="add(product)"><ShoppingBag :size="15" />{{ addedId === product.id ? 'Добавлено' : 'В корзину' }}</button>
              </div>
              <button class="sb-favorite-list__remove" aria-label="Убрать из избранного" @click="toggleFavorite(product.id)"><Trash2 :size="17" /></button>
            </article>
          </div>

          <div v-else class="sb-drawer-empty">
            <i><Heart :size="30" /></i>
            <h3>Сохраняйте любимое</h3>
            <p>Нажимайте на сердце в карточке товара — он появится здесь.</p>
            <NuxtLink to="/catalog" class="sb-liquid-primary" @click="emit('close')">Открыть каталог <ArrowRight :size="17" /></NuxtLink>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
