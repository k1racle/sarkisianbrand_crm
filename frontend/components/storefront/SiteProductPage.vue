<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, ChevronDown, Heart, ShieldCheck, ShoppingBag, Truck } from '@lucide/vue';
import { catalogProductCategory } from '~/shared/catalog-paths';
import { catalogVolume } from '~/shared/catalog-volume';
import { storefrontVariantPrice } from '~/shared/product-merchandising';

const props = defineProps<{ product: any }>();
const product = computed(() => props.product);
const productCategory = computed(() => catalogProductCategory(product.value));
const config = useRuntimeConfig();
const nuxtApp = useNuxtApp();
const { t, english, formatPrice } = useHomeLocale();
const name = computed(() => english.value && product.value?.nameEn ? product.value.nameEn : product.value?.nameRu);
const description = computed(() => (english.value && product.value?.descriptionEn ? product.value.descriptionEn : product.value?.descriptionRu) || t('Подробное описание уточняйте у команды магазина. Перед применением ознакомьтесь с инструкцией на упаковке.'));
const quantity = ref(1);
const added = ref(false);
const adding = ref(false);
const addError = ref('');
const selectedImage = ref(0);
const failedImages = ref<string[]>([]);
const selectedVariantId = ref('');
let addedTimer: ReturnType<typeof setTimeout> | undefined;
const apiBase = import.meta.server ? config.seoApiBase : config.public.apiBase;
const { data: catalog } = await useFetch<any>('/products', { key: 'product-page-recommendations', baseURL: apiBase, query: { limit: 24 } });
const { addToCart, favoriteIds, toggleFavorite, loadLocalFavorites } = useStorefront();
const { storefrontMediaUrl, siteContent } = useStorefrontContent();

const images = computed(() => {
  const primary = nuxtApp.runWithContext(() => storefrontProductImage(product.value));
  const gallery = (product.value?.images || [])
    .filter((item: any) => typeof item.url === 'string' && !item.url.startsWith('/catalog/'))
    .slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((item: any) => storefrontMediaUrl(item.url));
  return [...new Set<string>([primary, ...gallery].filter(Boolean))];
});
const image = computed(() => images.value[selectedImage.value] || images.value[0]);
const variants = computed(() => (product.value?.variants || []).filter((item: any) => item.isActive !== false));
const isGiftCard = computed(() => product.value?.productType === 'GIFT_CARD');
const variant = computed(() => variants.value.find((item: any) => item.id === selectedVariantId.value) || variants.value.find((item: any) => Number(item.stock) > Number(item.reserved || 0)) || variants.value[0]);
const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
const price = computed(() => variant.value ? storefrontVariantPrice(variant.value, isGiftCard.value) : Number(product.value?.basePrice ?? 0));
const regularPrice = computed(() => Number(variant.value?.regularPrice ?? variant.value?.price ?? product.value?.basePrice ?? 0));
const volume = computed(() => isGiftCard.value ? '' : catalogVolume(variant.value, product.value));
const options = computed(() => Object.entries(variant.value?.options || {}).filter(([key, value]) => !['giftCard', 'nominal', 'validityDays'].includes(key) && (typeof value === 'string' || typeof value === 'number')));
const optionLabels: Record<string, string> = { volume: 'Объём', color: 'Цвет', size: 'Размер', weight: 'Вес' };
const inFavorite = computed(() => product.value && favoriteIds.value.includes(product.value.id));
const otherProducts = computed(() => (catalog.value?.items || []).filter((item: any) => item.id !== product.value?.id));
const sameCategory = computed(() => {
  const categoryIds = new Set((product.value?.categories || []).map((item: any) => item.categoryId || item.category?.id));
  return otherProducts.value.filter((item: any) => item.categories?.some((relation: any) => categoryIds.has(relation.categoryId || relation.category?.id)));
});
const boughtTogether = computed(() => {
  const complementary = otherProducts.value.filter((item: any) => !sameCategory.value.some((similar: any) => similar.id === item.id));
  return (complementary.length >= 4 ? complementary : otherProducts.value).slice(0, 4);
});
const similarProducts = computed(() => {
  const used = new Set(boughtTogether.value.map((item: any) => item.id));
  return [...sameCategory.value, ...otherProducts.value].filter((item: any, index: number, list: any[]) => !used.has(item.id) && list.findIndex((candidate: any) => candidate.id === item.id) === index).slice(0, 4);
});

function resetPurchase() {
  clearTimeout(addedTimer);
  quantity.value = 1;
  added.value = false;
  addError.value = '';
}
watch(() => variant.value?.id, resetPurchase);
watch(() => product.value?.id, () => {
  selectedImage.value = 0;
  selectedVariantId.value = '';
  failedImages.value = [];
  resetPurchase();
});
onMounted(loadLocalFavorites);
onBeforeUnmount(() => clearTimeout(addedTimer));

async function add() {
  if (adding.value || !available.value) return;
  const variantId = variant.value?.id;
  adding.value = true;
  addError.value = '';
  try {
    await addToCart(product.value, quantity.value, variantId);
    if (variant.value?.id !== variantId) return;
    added.value = true;
    clearTimeout(addedTimer);
    addedTimer = setTimeout(() => { added.value = false; }, 1800);
  } catch (error: any) {
    if (variant.value?.id === variantId) addError.value = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || t('Не удалось добавить товар. Попробуйте ещё раз.');
  } finally { adding.value = false; }
}

useHead(() => ({ htmlAttrs: { lang: english.value ? 'en' : 'ru' } }));
useStorefrontSeo({
  title: () => product.value?.seo?.metaTitle || (name.value || t('Товар')) + ' — ' + siteContent.value.brand.name,
  description: () => product.value?.seo?.metaDesc || description.value,
  image: () => image.value,
  canonical: () => storefrontProductLink(product.value),
});
</script>

<template>
  <SiteShell editorial product>
    <div v-if="product" class="sp-page sh-container">
      <header class="sp-masthead">
        <NuxtLink to="/" class="sp-wordmark" :aria-label="t('На главную')"><img src="/storefront/home/hero-wordmark.svg" alt="SARKISIAN" width="1412" height="196" /></NuxtLink>
        <div class="sp-toolbar">
          <nav class="sp-breadcrumbs" :aria-label="t('Навигация по каталогу')">
            <NuxtLink to="/">{{ t('Главная') }}</NuxtLink><span aria-hidden="true">/</span><NuxtLink to="/catalog">{{ t('Каталог') }}</NuxtLink>
            <template v-if="productCategory"><span aria-hidden="true">/</span><NuxtLink :to="storefrontCatalogLink(productCategory)">{{ t(productCategory.nameRu) }}</NuxtLink></template>
            <span aria-hidden="true">/</span><span aria-current="page">{{ name }}</span>
          </nav>
        </div>
      </header>

      <div class="sp-layout">
        <div class="sp-media">
          <div class="sp-gallery sb-design-frame">
            <div class="sp-gallery-label"><span>{{ t(productCategory?.nameRu || 'SARKISIAN BRAND') }}</span><span v-if="images.length > 1">{{ String(selectedImage + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}</span></div>
            <img v-if="image && !failedImages.includes(image)" :key="image" class="sp-main-image" :src="image" :alt="name" fetchpriority="high" @error="failedImages.push(image)" />
            <div v-else class="sp-placeholder" :class="{ 'is-gift': isGiftCard }"><span>SARKISIAN</span><small>{{ t(isGiftCard ? 'Подарочная карта' : 'Фото появится позже') }}</small></div>
            <div class="sp-gallery-caption"><span>{{ t('От мастера — к мастерам') }}</span><span>{{ volume || 'SARKISIAN BRAND' }}</span></div>
          </div>
          <div v-if="images.length > 1" class="sp-thumbnails" role="group" :aria-label="t('Фотографии товара')">
            <button v-for="(src, index) in images" :key="src" type="button" :class="{ 'is-active': selectedImage === index }" :aria-label="t('Фотография') + ' ' + (index + 1)" :aria-pressed="selectedImage === index" @click="selectedImage = index"><img v-if="!failedImages.includes(src)" :src="src" alt="" loading="lazy" @error="failedImages.push(src)" /><span v-else>{{ index + 1 }}</span></button>
          </div>
        </div>

        <section class="sp-info" aria-labelledby="product-heading">
          <div class="sp-eyebrow"><span>SARKISIAN BRAND</span><button type="button" class="sp-favorite" :class="{ 'is-active': inFavorite }" :aria-label="t(inFavorite ? 'Убрать из избранного' : 'Добавить в избранное')" :aria-pressed="Boolean(inFavorite)" @click="toggleFavorite(product.id)"><Heart :size="25" :stroke-width="1.3" :fill="inFavorite ? 'currentColor' : 'none'" /></button></div>
          <h1 id="product-heading">{{ name }}</h1>
          <div class="sp-meta"><span v-if="variant?.sku || product.sku">{{ t('Артикул') }}: {{ variant?.sku || product.sku }}</span><span class="sp-stock" :class="{ 'is-unavailable': !available }">{{ t(isGiftCard ? 'Электронная карта' : available ? 'В наличии' : 'Нет в наличии') }}</span></div>

          <div class="sp-price" aria-live="polite" aria-atomic="true"><strong>{{ formatPrice(price, product.currency) }}</strong><del v-if="regularPrice > price">{{ formatPrice(regularPrice, product.currency) }}</del><span v-if="volume">{{ volume }}</span></div>
          <label v-if="variants.length > 1" class="sp-variant"><span>{{ t(isGiftCard ? 'Номинал карты' : 'Вариант товара') }}</span><span class="sp-select"><select :value="variant?.id" :disabled="adding" @change="selectedVariantId = ($event.target as HTMLSelectElement).value"><option v-for="item in variants" :key="item.id" :value="item.id">{{ item.name }}{{ !isGiftCard && Number(item.stock) <= Number(item.reserved || 0) ? ' — ' + t('Нет в наличии') : '' }}</option></select><ChevronDown :size="18" aria-hidden="true" /></span></label>
          <p v-if="isGiftCard" class="sp-gift-note">{{ t('Код станет доступен на странице заказа после подтверждения оплаты.') }} <template v-if="variant?.options?.validityDays || product.giftCardValidityDays">{{ t('Срок действия') }} — {{ variant?.options?.validityDays || product.giftCardValidityDays }} {{ t('дней с момента выпуска.') }} </template>{{ t('Карту можно использовать частями; остаток сохраняется. Покупка оформляется отдельно, без доставки и скидок.') }}</p>

          <div class="sp-buy">
            <SiteQuantityControl :quantity="quantity" :max="available" :disabled="adding || !available" @change="quantity = $event" />
            <button type="button" class="sb-design-button sp-add" :disabled="adding || !available" @click="add"><Check v-if="added" :size="18" /><ShoppingBag v-else :size="18" :stroke-width="1.5" />{{ t(adding ? 'Добавляем…' : added ? 'Добавлено' : available ? 'Добавить в корзину' : 'Нет в наличии') }}</button>
          </div>
          <span class="sb-visually-hidden" role="status">{{ added ? t('Добавлено в корзину') : '' }}</span>
          <p v-if="addError" class="sp-error" role="alert">{{ addError }}</p>

          <div v-if="!isGiftCard" class="sp-assurances">
            <NuxtLink to="/delivery"><Truck :size="21" :stroke-width="1.3" /><span>{{ t('Доставка по России') }}<small>{{ t('Условия доставки и оплаты') }}</small></span><ArrowRight :size="18" :stroke-width="1.3" /></NuxtLink>
            <div><ShieldCheck :size="21" :stroke-width="1.3" /><span>{{ t('Оригинальный продукт') }}<small>{{ t('Напрямую от производителя') }}</small></span></div>
          </div>

          <div class="sp-details">
            <details open><summary>{{ t('О продукте') }}<span aria-hidden="true"></span></summary><div class="sp-detail-body"><p>{{ description }}</p></div></details>
            <details><summary>{{ t('Сведения о товаре') }}<span aria-hidden="true"></span></summary><div class="sp-detail-body"><dl><div><dt>{{ t('Артикул') }}</dt><dd>{{ variant?.sku || product.sku }}</dd></div><div v-if="variant"><dt>{{ t('Вариант') }}</dt><dd>{{ t(variant.name) }}</dd></div><div v-for="[key, value] in options" :key="key"><dt>{{ t(optionLabels[key] || key) }}</dt><dd>{{ value }}</dd></div></dl></div></details>
            <details><summary>{{ t('Покупка и возврат') }}<span aria-hidden="true"></span></summary><div class="sp-detail-body"><p>{{ t('Проверьте выбранный вариант и ознакомьтесь с условиями магазина.') }}</p><NuxtLink to="/returns">{{ t('Правила возврата') }}</NuxtLink><NuxtLink to="/oferta">{{ t('Публичная оферта') }}</NuxtLink></div></details>
          </div>
          <NuxtLink to="/contacts" class="sp-help">{{ t('Поможем с выбором') }}<ArrowRight :size="19" :stroke-width="1.3" /></NuxtLink>
        </section>
      </div>

      <section v-if="boughtTogether.length" class="sp-recommendations" aria-labelledby="product-related-heading">
        <header class="sp-section-heading"><p>{{ t('Дополните свой набор') }}</p><div><h2 id="product-related-heading">{{ t('Вам также может понравиться') }}</h2><NuxtLink to="/catalog" class="sp-catalog-link">{{ t('Весь каталог') }}<ArrowRight :size="32" :stroke-width="1" /></NuxtLink></div></header>
        <div class="sp-related-grid"><ProductCard v-for="item in boughtTogether" :key="item.id" :product="item" catalog /></div>
      </section>
      <section v-if="similarProducts.length" class="sp-recommendations" aria-labelledby="product-similar-heading">
        <header class="sp-section-heading"><p>{{ t('Продолжите знакомство') }}</p><div><h2 id="product-similar-heading">{{ t('Похожие товары') }}</h2><NuxtLink :to="productCategory ? storefrontCatalogLink(productCategory) : '/catalog'" class="sp-catalog-link">{{ t('Смотреть все') }}<ArrowRight :size="32" :stroke-width="1" /></NuxtLink></div></header>
        <div class="sp-related-grid"><ProductCard v-for="item in similarProducts" :key="item.id" :product="item" catalog /></div>
      </section>
      <NuxtLink to="/catalog" class="sp-back sb-design-button"><ArrowLeft :size="18" />{{ t('Вернуться в каталог') }}</NuxtLink>
    </div>
    <div v-else class="sp-empty sh-container"><h1>{{ t('Товар не найден') }}</h1><NuxtLink to="/catalog" class="sb-design-button">{{ t('Вернуться в каталог') }}</NuxtLink></div>
  </SiteShell>
</template>
