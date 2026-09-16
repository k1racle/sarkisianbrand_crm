<script setup lang="ts">
import { Check, Heart, ShoppingBag } from '@lucide/vue';

const props = defineProps<{ product: any; badge?: string }>();
const { addToCart, favoriteIds, toggleFavorite } = useStorefront();
const added = ref(false);
const busy = ref(false);
const error = ref('');
const imageFailed = ref(false);
const image = computed(() => storefrontProductImage(props.product));
watch(image, () => { imageFailed.value = false; });
const variants = computed(() => (props.product.variants || []).filter((item: any) => item.isActive !== false));
const isGiftCard = computed(() => props.product.productType === 'GIFT_CARD');
const variant = computed(() => isGiftCard.value ? [...variants.value].sort((a: any, b: any) => Number(a.price) - Number(b.price))[0] : variants.value.find((item: any) => Number(item.stock) - Number(item.reserved || 0) > 0) || variants.value[0]);
const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
const price = computed(() => Number(variant.value?.price ?? props.product.basePrice ?? 0));
const inFavorite = computed(() => favoriteIds.value.includes(props.product.id));

async function add() {
  if (busy.value || !available.value) return;
  if (isGiftCard.value) { await navigateTo(`/products/${props.product.slug}`); return; }
  busy.value = true;
  error.value = '';
  try {
    await addToCart(props.product, 1, variant.value?.id);
    added.value = true;
    setTimeout(() => { added.value = false; }, 1800);
  } catch (e: any) {
    error.value = Array.isArray(e?.data?.message) ? e.data.message.join('. ') : e?.data?.message || 'Не удалось добавить товар. Попробуйте ещё раз.';
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
      <img v-if="image && !imageFailed" :src="image" :alt="product.nameRu" loading="lazy" @error="imageFailed = true" />
      <div v-else class="sb-product-placeholder" :class="{ 'sb-gift-product-art': isGiftCard }"><span>{{ isGiftCard ? 'Подарочная карта' : 'S' }}</span><small>SARKISIAN</small></div>
      <button class="sb-quick-add sb-card-add-overlay" :disabled="busy || !available" @click.prevent="add">
        <Check v-if="added" :size="17" /><ShoppingBag v-else :size="17" />{{ isGiftCard && available ? 'Подробнее' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии' }}
      </button>
    </NuxtLink>
    <div class="sb-product-card__meta">
      <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
      <span>{{ (product.categories?.find((item: any) => item.isPrimary) || product.categories?.[0])?.category?.nameRu || 'SARKISIAN BRAND' }}</span>
      <h3><NuxtLink :to="`/products/${product.slug}`">{{ product.nameRu }}</NuxtLink></h3>
      <div class="sb-product-card__price-row"><strong>{{ isGiftCard && variants.length > 1 ? 'от ' : '' }}{{ price.toLocaleString('ru-RU') }} ₽</strong><small v-if="!isGiftCard">{{ available ? 'В наличии' : 'Нет в наличии' }}</small></div>
      <button type="button" class="sb-quick-add sb-card-add-mobile" :disabled="busy || !available" @click="add"><Check v-if="added" :size="18" /><ShoppingBag v-else :size="18" />{{ isGiftCard && available ? 'Подробнее' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии' }}</button>
    </div>
  </article>
</template>
