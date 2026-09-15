<script setup lang="ts">
import { Check, Heart, ShoppingBag } from '@lucide/vue';

const props = defineProps<{ product: any; badge?: string }>();
const { addToCart, favoriteIds, toggleFavorite } = useStorefront();
const added = ref(false);
const busy = ref(false);
const image = computed(() => storefrontProductImage(props.product));
const inFavorite = computed(() => favoriteIds.value.includes(props.product.id));

async function add() {
  busy.value = true;
  try {
    await addToCart(props.product);
    added.value = true;
    setTimeout(() => { added.value = false; }, 1800);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="sb-product-card">
    <NuxtLink :to="`/products/${product.slug}`" class="sb-product-card__visual">
      <span v-if="badge" class="sb-product-badge">{{ badge }}</span>
      <button class="sb-favorite" :class="{ active: inFavorite }" :aria-label="inFavorite ? 'Убрать из избранного' : 'Добавить в избранное'" @click.prevent="toggleFavorite(product.id)"><Heart :size="19" :fill="inFavorite ? 'currentColor' : 'none'" /></button>
      <img v-if="image" :src="image" :alt="product.nameRu" loading="lazy" />
      <div v-else class="sb-product-placeholder"><span>S</span><small>SARKISIAN</small></div>
      <button class="sb-quick-add" :disabled="busy" @click.prevent="add">
        <Check v-if="added" :size="17" /><ShoppingBag v-else :size="17" />{{ added ? 'Добавлено' : 'В корзину' }}
      </button>
    </NuxtLink>
    <div class="sb-product-card__meta">
      <span>{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN BRAND' }}</span>
      <h3><NuxtLink :to="`/products/${product.slug}`">{{ product.nameRu }}</NuxtLink></h3>
      <div><strong>{{ Number(product.basePrice).toLocaleString('ru-RU') }} ₽</strong><small v-if="product.variants?.[0]?.stock > 0">В наличии</small></div>
    </div>
  </article>
</template>
