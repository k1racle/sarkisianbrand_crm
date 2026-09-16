<script setup lang="ts">
import { ArrowRight, Check, Heart, RotateCcw, ShieldCheck, ShoppingBag, Truck } from '@lucide/vue';

const route = useRoute();
const config = useRuntimeConfig();
const quantity = ref(1);
const added = ref(false);
const adding = ref(false);
const addError = ref('');
const selectedImage = ref(0);
const selectedVariantId = ref('');
const { data: product, error } = await useFetch<any>(`/products/${route.params.slug}`, { baseURL: config.public.apiBase });
if (error.value || !product.value) throw createError({ statusCode: error.value?.statusCode === 404 || !error.value && !product.value ? 404 : 503, statusMessage: error.value?.statusCode === 404 ? 'Товар не найден' : 'Не удалось загрузить товар' });
const { data: catalog } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: { limit: 24 } });
const { addToCart, favoriteIds, toggleFavorite, loadLocalFavorites } = useStorefront();

const { storefrontMediaUrl } = useStorefrontContent();
const images = computed(() => {
  const primary = storefrontProductImage(product.value);
  return [...new Set([primary, ...(product.value?.images || []).filter((item: any) => !item.url.startsWith('/catalog/')).slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((item: any) => storefrontMediaUrl(item.url))].filter(Boolean))];
});
const image = computed(() => images.value[selectedImage.value] || images.value[0]);
const variants = computed(() => (product.value?.variants || []).filter((item: any) => item.isActive !== false));
const isGiftCard = computed(() => product.value?.productType === 'GIFT_CARD');
const variant = computed(() => variants.value.find((item: any) => item.id === selectedVariantId.value) || variants.value.find((item: any) => item.stock > item.reserved) || variants.value[0]);
const available = computed(() => isGiftCard.value && variant.value ? 99 : Math.max(0, Number(variant.value?.stock || 0) - Number(variant.value?.reserved || 0)));
const price = computed(() => Number(variant.value?.price ?? product.value?.basePrice ?? 0));
const options = computed(() => Object.entries(variant.value?.options || {}).filter(([key, value]) => !['giftCard', 'nominal', 'validityDays'].includes(key) && (typeof value === 'string' || typeof value === 'number')));
watch(() => variant.value?.id, () => { quantity.value = 1; added.value = false; addError.value = ''; });
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
  const candidates = [...sameCategory.value, ...otherProducts.value].filter((item: any, index: number, list: any[]) => !used.has(item.id) && list.findIndex((candidate: any) => candidate.id === item.id) === index);
  return (candidates.length ? candidates : otherProducts.value).slice(0, 4);
});

onMounted(loadLocalFavorites);

async function add() {
  if (adding.value || !available.value) return;
  adding.value = true;
  addError.value = '';
  try {
    await addToCart(product.value, quantity.value, variant.value?.id);
    added.value = true;
    setTimeout(() => { added.value = false; }, 1800);
  } catch (error: any) { addError.value = Array.isArray(error?.data?.message) ? error.data.message.join('. ') : error?.data?.message || 'Не удалось добавить товар. Попробуйте ещё раз.'; }
  finally { adding.value = false; }
}

useStorefrontSeo({
  title: () => product.value ? `${product.value.nameRu} — SARKISIAN BRAND` : 'Товар — SARKISIAN BRAND',
  description: () => product.value?.descriptionRu || 'Профессиональный материал SARKISIAN BRAND.',
  image: () => image.value,
});
</script>

<template>
  <SiteShell>
    <div v-if="product" class="sb-product-page">
      <div class="sb-breadcrumbs">
        <NuxtLink to="/">Главная</NuxtLink><span>/</span><NuxtLink to="/catalog">Каталог</NuxtLink><span>/</span><span>{{ product.nameRu }}</span>
      </div>

      <div class="sb-product-layout">
        <div class="sb-product-media"><section class="sb-product-gallery">
          <img v-if="image" :src="image" :alt="product.nameRu" />
          <div v-else class="sb-product-placeholder is-large" :class="{ 'sb-gift-product-art': isGiftCard }"><span>{{ isGiftCard ? 'Подарочная карта' : 'S' }}</span><small>SARKISIAN</small></div>
        </section><div v-if="images.length > 1" class="sb-product-thumbnails" aria-label="Фотографии товара"><button v-for="(src, index) in images" :key="src" :class="{ active: selectedImage === index }" :aria-label="`Фотография ${index + 1}`" :aria-pressed="selectedImage === index" @click="selectedImage = index"><img :src="src" :alt="`${product.nameRu}, фото ${index + 1}`" loading="lazy" /></button></div></div>

        <section class="sb-product-info">
          <p class="sb-kicker">{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN BRAND' }}</p>
          <h1>{{ product.nameRu }}</h1>
          <div class="sb-product-code">Артикул: {{ variant?.sku || product.sku }} <span class="sb-product-stock">{{ isGiftCard ? 'Электронная карта' : available ? 'В наличии' : 'Нет в наличии' }}</span></div>
          <div class="sb-product-price">{{ price.toLocaleString('ru-RU') }} ₽</div>
          <p class="sb-product-description">{{ product.descriptionRu || 'Профессиональный материал SARKISIAN BRAND для мастеров маникюра. Предсказуемый результат и комфортная работа.' }}</p>

          <label v-if="variants.length > 1" class="sb-product-variant">{{ isGiftCard ? 'Номинал карты' : 'Вариант товара' }}<select :value="variant?.id" @change="selectedVariantId = ($event.target as HTMLSelectElement).value"><option v-for="item in variants" :key="item.id" :value="item.id">{{ item.name }}{{ !isGiftCard && item.stock <= item.reserved ? ' — нет в наличии' : '' }}</option></select></label>
          <p v-if="isGiftCard" class="sb-product-description">Код станет доступен на странице заказа после подтверждения оплаты. Срок действия — {{ variant?.options?.validityDays || product.giftCardValidityDays }} дней с момента выпуска. Карту можно использовать частями; остаток сохраняется. Покупка оформляется отдельно, без доставки и скидок.</p>

          <div class="sb-product-buy">
            <SiteQuantityControl :quantity="quantity" :max="available" :disabled="adding || !available" @change="quantity = $event" />
            <button class="sb-primary" :disabled="adding || !available" @click="add"><Check v-if="added" :size="18" /><ShoppingBag v-else :size="18" />{{ adding ? 'Добавляем…' : added ? 'Добавлено' : available ? 'Добавить в корзину' : 'Нет в наличии' }}</button>
            <button class="sb-product-heart" :class="{ active: inFavorite }" :aria-label="inFavorite ? 'Удалить из избранного' : 'Добавить в избранное'" :aria-pressed="Boolean(inFavorite)" @click="toggleFavorite(product.id)"><Heart :size="20" :fill="inFavorite ? 'currentColor' : 'none'" /></button>
          </div>
          <p v-if="addError" class="sb-form-error" role="alert">{{ addError }}</p>

          <div v-if="!isGiftCard" class="sb-product-assurances">
            <div><Truck :size="20" /><span><b>Доставка по России</b><small><NuxtLink to="/delivery">Условия доставки и оплаты</NuxtLink></small></span></div>
            <div><ShieldCheck :size="20" /><span><b>Оригинальный продукт</b><small>Напрямую от производителя</small></span></div>
            <div><RotateCcw :size="20" /><span><b>Поможем с выбором</b><small><NuxtLink to="/contacts">Свяжитесь с командой магазина</NuxtLink></small></span></div>
          </div>
          <div class="sb-product-details"><details open><summary>О продукте</summary><p>{{ product.descriptionRu || 'Подробное описание уточняйте у команды магазина. Перед применением ознакомьтесь с инструкцией на упаковке.' }}</p></details><details><summary>Сведения о товаре</summary><dl><div><dt>Артикул</dt><dd>{{ variant?.sku || product.sku }}</dd></div><div v-if="variant"><dt>Вариант</dt><dd>{{ variant.name }}</dd></div><div v-for="[key, value] in options" :key="key"><dt>{{ ({ volume: 'Объём', color: 'Цвет', size: 'Размер', weight: 'Вес' } as Record<string, string>)[key] || key }}</dt><dd>{{ value }}</dd></div></dl></details><details><summary>Покупка и возврат</summary><p>Проверьте выбранный вариант и ознакомьтесь с условиями магазина.</p><NuxtLink to="/returns">Правила возврата</NuxtLink><NuxtLink to="/oferta">Публичная оферта</NuxtLink></details></div>
        </section>
      </div>

      <section v-if="boughtTogether.length" class="sb-product-recommendations">
        <div class="sb-section-head"><div><p>ДОПОЛНИТЕ УХОД</p><h2>С этим товаром покупают</h2></div><NuxtLink to="/catalog">Весь каталог <ArrowRight :size="18" /></NuxtLink></div>
        <div class="sb-product-grid"><ProductCard v-for="item in boughtTogether" :key="item.id" :product="item" /></div>
      </section>

      <section v-if="similarProducts.length" class="sb-product-recommendations is-similar">
        <div class="sb-section-head"><div><p>ВАМ МОЖЕТ ПОНРАВИТЬСЯ</p><h2>Похожие товары</h2></div><NuxtLink to="/catalog">Смотреть все <ArrowRight :size="18" /></NuxtLink></div>
        <div class="sb-product-grid"><ProductCard v-for="item in similarProducts" :key="item.id" :product="item" /></div>
      </section>
    </div>

    <div v-else-if="error" class="sb-empty sb-product-error">
      <h2>Товар не найден</h2><NuxtLink to="/catalog" class="sb-primary">Вернуться в каталог</NuxtLink>
    </div>
  </SiteShell>
</template>
