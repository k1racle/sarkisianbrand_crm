<script setup lang="ts">
import { ArrowRight, Check, Heart, ShoppingBag } from '@lucide/vue';
import { catalogVolume } from '~/shared/catalog-volume';

const props = defineProps<{ product: any; badge?: string; editorial?: boolean; catalog?: boolean; volumes?: string[] }>();
const { t, english, formatPrice } = useHomeLocale();
const editorialName = computed(() => english.value && props.product.nameEn ? props.product.nameEn : props.product.nameRu);
import { DEFAULT_PRODUCT_BADGES, storefrontBadges, storefrontVariantPrice } from '~/shared/product-merchandising';
const {content:storefrontContent}=useStorefrontContent();
const configuredBadges=computed(()=>storefrontBadges(props.product,storefrontContent.value.settings.productBadges??DEFAULT_PRODUCT_BADGES));
const { addToCart, favoriteIds, toggleFavorite } = useStorefront();
const added = ref(false);
const busy = ref(false);
const error = ref('');
const imageFailed = ref(false);
const image = computed(() => storefrontProductImage(props.product));
watch(image, () => { imageFailed.value = false; });
const variants = computed(() => (props.product.variants || []).filter((item: any) => item.isActive !== false && (!props.volumes?.length || props.volumes.includes(catalogVolume(item, props.product).split(' ')[0]))));
const isGiftCard = computed(() => props.product.productType === 'GIFT_CARD');
const variant = computed(() => isGiftCard.value ? [...variants.value].sort((a: any, b: any) => Number(a.price) - Number(b.price))[0] : variants.value.find((item: any) => Number(item.stock) - Number(item.reserved || 0) > 0) || variants.value[0]);
const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
const price = computed(() => variant.value?storefrontVariantPrice(variant.value,isGiftCard.value):Number(props.product.basePrice??0));
const regularPrice=computed(()=>Number(variant.value?.regularPrice??variant.value?.price??props.product.basePrice??0));
const inFavorite = computed(() => favoriteIds.value.includes(props.product.id));

async function add() {
  if (busy.value || !available.value) return;
  if (isGiftCard.value) { await navigateTo(storefrontProductLink(props.product)); return; }
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
  <article v-if="catalog" class="sc-product">
    <div class="sc-product-frame">
      <NuxtLink :to="storefrontProductLink(product)" class="sc-product-link">
        <h3>{{ editorialName }}</h3>
        <div class="sc-product-image">
          <img v-if="image && !imageFailed" :src="image" :alt="editorialName" loading="lazy" @error="imageFailed = true" />
          <span v-else class="sc-product-placeholder">SARKISIAN<small>{{ t(isGiftCard ? 'Подарочная карта' : 'Фото появится позже') }}</small></span>
        </div>
        <div class="sc-product-meta"><span>{{ catalogVolume(variant, product) || (variant?.name !== 'Основной вариант' ? variant?.name : '') }}</span><span class="sc-product-price"><del v-if="regularPrice > price">{{ formatPrice(regularPrice, product.currency) }}</del><strong>{{ isGiftCard && variants.length > 1 ? t('от ') : '' }}{{ formatPrice(price, product.currency) }}</strong></span></div>
      </NuxtLink>
      <button type="button" class="sc-product-favorite" :class="{ 'is-active': inFavorite }" :aria-pressed="inFavorite" :aria-label="t(inFavorite ? 'Убрать из избранного' : 'Добавить в избранное')" @click="toggleFavorite(product.id)"><Heart :fill="inFavorite ? 'currentColor' : 'none'" :stroke-width="1.5" /></button>
    </div>
    <div class="sc-product-actions"><button type="button" class="sb-design-button" :disabled="busy || !available" @click="add"><Check v-if="added" :size="16" /><ShoppingBag v-else :size="16" />{{ t(busy ? 'Добавляем…' : isGiftCard && available ? 'Выбрать номинал' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии') }}</button><NuxtLink class="sc-product-arrow" :to="storefrontProductLink(product)" :aria-label="`${t('Подробнее')}: ${editorialName}`"><ArrowRight :stroke-width="1" /></NuxtLink></div>
    <p v-if="error" class="sc-product-error" role="alert">{{ error }}</p><span class="sb-visually-hidden" role="status">{{ added ? t('Добавлено в корзину') : '' }}</span>
  </article>
  <article v-else-if="editorial" class="sh-product">
    <NuxtLink :to="storefrontProductLink(product)" class="sh-product-image" :aria-label="editorialName">
      <img v-if="image && !imageFailed" :src="image" :alt="editorialName" loading="lazy" @error="imageFailed = true" />
      <span v-else class="sh-product-placeholder">SARKISIAN<small>{{ t(isGiftCard ? 'Подарочная карта' : 'Фото появится позже') }}</small></span>
    </NuxtLink>
    <div class="sh-product-copy">
      <span class="sh-product-label">{{ configuredBadges[0]?.label || ((product.categories?.find((item: any) => item.isPrimary) || product.categories?.[0])?.category?.nameRu) || 'SARKISIAN' }}</span>
      <h3><NuxtLink :to="storefrontProductLink(product)">{{ editorialName }}</NuxtLink></h3>
      <span class="sh-product-variant">{{ variant?.name && variant.name !== 'Основной вариант' ? variant.name : t(available ? 'В наличии' : 'Нет в наличии') }}</span>
      <div class="sh-product-bottom"><span>{{ variants.length > 1 ? `${variants.length} ${english ? 'variants' : 'варианта'}` : 'SARKISIAN' }}</span><span class="sh-product-price"><del v-if="regularPrice > price">{{ formatPrice(regularPrice, product.currency) }}</del>{{ isGiftCard && variants.length > 1 ? t('от ') : '' }}{{ formatPrice(price, product.currency) }}</span></div>
      <button class="sh-product-buy" :disabled="busy || !available" @click="add"><Check v-if="added" :size="16" /><ShoppingBag v-else :size="16" />{{ t(busy ? 'Добавляем…' : isGiftCard && available ? 'Выбрать номинал' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии') }}</button>
      <p v-if="error" class="sh-product-error" role="alert">{{ error }}</p>
    </div>
  </article>
  <article v-else class="sb-product-card">
    <div class="sb-product-card__frame">
      <NuxtLink :to="storefrontProductLink(product)" class="sb-product-card__visual" :aria-label="`${t('Подробнее')}: ${editorialName}`">
        <img v-if="image && !imageFailed" :src="image" :alt="editorialName" loading="lazy" @error="imageFailed = true" />
        <div v-else class="sb-product-placeholder" :class="{ 'sb-gift-product-art': isGiftCard }"><span>{{ isGiftCard ? 'Подарочная карта' : 'S' }}</span><small>SARKISIAN</small></div>
      </NuxtLink>
      <div class="sb-product-badges"><span v-for="item in configuredBadges" :key="item.id" class="sb-product-badge" :style="{background:item.color,color:item.textColor}">{{item.label}}</span></div>
      <button type="button" class="sb-favorite" :class="{ active: inFavorite }" :aria-pressed="inFavorite" :aria-label="t(inFavorite ? 'Убрать из избранного' : 'Добавить в избранное')" @click="toggleFavorite(product.id)"><Heart :size="19" :fill="inFavorite ? 'currentColor' : 'none'" aria-hidden="true" /></button>
      <button type="button" class="sb-quick-add sb-card-add-overlay" :disabled="busy || !available" @click="add">
        <Check v-if="added" :size="17" aria-hidden="true" /><ShoppingBag v-else :size="17" aria-hidden="true" />{{ t(busy ? 'Добавляем…' : isGiftCard && available ? 'Подробнее' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии') }}
      </button>
    </div>
    <div class="sb-product-card__meta">
      <p v-if="error" class="sb-form-error" role="alert">{{ error }}</p>
      <span>{{ (product.categories?.find((item: any) => item.isPrimary) || product.categories?.[0])?.category?.nameRu || 'SARKISIAN BRAND' }}</span>
      <h3><NuxtLink :to="storefrontProductLink(product)">{{ product.nameRu }}</NuxtLink></h3>
      <div class="sb-product-card__price-row"><div class="sb-product-prices"><del v-if="regularPrice>price">{{regularPrice.toLocaleString('ru-RU')}} ₽</del><strong>{{ isGiftCard && variants.length > 1 ? 'от ' : '' }}{{ price.toLocaleString('ru-RU') }} ₽</strong></div><small v-if="!isGiftCard">{{ available ? 'В наличии' : 'Нет в наличии' }}</small></div>
      <button type="button" class="sb-quick-add sb-card-add-mobile" :disabled="busy || !available" @click="add"><Check v-if="added" :size="18" aria-hidden="true" /><ShoppingBag v-else :size="18" aria-hidden="true" />{{ t(busy ? 'Добавляем…' : isGiftCard && available ? 'Подробнее' : added ? 'Добавлено' : available ? 'В корзину' : 'Нет в наличии') }}</button>
      <span class="sb-visually-hidden" role="status">{{ added ? t('Добавлено в корзину') : '' }}</span>
    </div>
  </article>
</template>
