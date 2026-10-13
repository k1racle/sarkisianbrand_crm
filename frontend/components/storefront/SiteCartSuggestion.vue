<script setup lang="ts">
import { Heart } from '@lucide/vue';
import { storefrontVariantPrice } from '~/shared/product-merchandising';

const props = defineProps<{ product: any }>();
const { favoriteIds, toggleFavorite } = useStorefront();
const imageFailed = ref(false);
const image = computed(() => storefrontProductImage(props.product));
const gift = computed(() => props.product.productType === 'GIFT_CARD');
const variants = computed(() => (props.product.variants || []).filter((v: any) => v.isActive !== false && (gift.value || Number(v.stock) - Number(v.reserved || 0) > 0)));
const variant = computed(() => variants.value[0]);
watch(image, () => { imageFailed.value = false; });
const favorite = computed(() => favoriteIds.value.includes(props.product.id));
const price = computed(() => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: props.product.currency || 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(storefrontVariantPrice(variant.value, gift.value)));
const variantLabel = (v: any) => v?.name && v.name !== 'Основной вариант' ? v.name : v?.sku || 'Основной вариант';
</script>

<template>
  <article class="sd-suggestion">
    <NuxtLink :to="storefrontProductLink(product)" class="sd-suggestion-image" :aria-label="product.nameRu">
      <img v-if="image && !imageFailed" :src="image" :alt="product.nameRu" loading="lazy" @error="imageFailed = true" />
      <span v-else class="sd-image-placeholder">SARKISIAN</span>
    </NuxtLink>
    <NuxtLink :to="storefrontProductLink(product)" class="sd-suggestion-name">{{ product.nameRu }}</NuxtLink>
    <button type="button" class="sd-suggestion-favorite" :aria-label="favorite ? 'Убрать из избранного' : 'Добавить в избранное'" :aria-pressed="favorite" @click="toggleFavorite(product.id)"><Heart :size="18" :fill="favorite ? 'currentColor' : 'none'" /></button>
    <div class="sd-suggestion-bottom">
      <small>{{ variantLabel(variant) }}</small>
      <strong>{{ price }}</strong>
    </div>
  </article>
</template>
