<script setup lang="ts">
import { Check, Heart, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Truck } from '@lucide/vue';

const route = useRoute();
const config = useRuntimeConfig();
const quantity = ref(1);
const added = ref(false);
const { data: product, error } = await useFetch<any>(`/products/${route.params.slug}`, { baseURL: config.public.apiBase });
const { data: catalog } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: { limit: 24 } });
const { addToCart, favoriteIds, toggleFavorite, loadLocalFavorites } = useStorefront();

const image = computed(() => storefrontProductImage(product.value));
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
  await addToCart(product.value, quantity.value);
  added.value = true;
  setTimeout(() => { added.value = false; }, 1800);
}

useSeoMeta({
  title: () => product.value ? `${product.value.nameRu} — SARKISIAN BRAND` : 'Товар — SARKISIAN BRAND',
  description: () => product.value?.descriptionRu || 'Профессиональный материал SARKISIAN BRAND.',
});
</script>

<template>
  <SiteShell>
    <div v-if="product" class="sb-product-page">
      <div class="sb-breadcrumbs">
        <NuxtLink to="/">Главная</NuxtLink><span>/</span><NuxtLink to="/catalog">Каталог</NuxtLink><span>/</span><span>{{ product.nameRu }}</span>
      </div>

      <div class="sb-product-layout">
        <section class="sb-product-gallery">
          <img v-if="image" :src="image" :alt="product.nameRu" />
          <div v-else class="sb-product-placeholder is-large"><span>S</span><small>SARKISIAN</small></div>
        </section>

        <section class="sb-product-info">
          <p class="sb-kicker">{{ product.categories?.[0]?.category?.nameRu || 'SARKISIAN BRAND' }}</p>
          <h1>{{ product.nameRu }}</h1>
          <div class="sb-product-code">Артикул: {{ product.sku }} <span v-if="product.variants?.[0]?.stock > 0">● В наличии</span></div>
          <div class="sb-product-price">{{ Number(product.basePrice).toLocaleString('ru-RU') }} ₽</div>
          <p class="sb-product-description">{{ product.descriptionRu || 'Профессиональный материал SARKISIAN BRAND для мастеров маникюра. Предсказуемый результат и комфортная работа.' }}</p>

          <div class="sb-product-buy">
            <div class="sb-quantity" aria-label="Количество товара">
              <button :disabled="quantity <= 1" aria-label="Уменьшить количество" @click="quantity--"><Minus :size="16" /></button>
              <b>{{ quantity }}</b>
              <button aria-label="Увеличить количество" @click="quantity++"><Plus :size="16" /></button>
            </div>
            <button class="sb-primary" @click="add"><Check v-if="added" :size="18" /><ShoppingBag v-else :size="18" />{{ added ? 'Добавлено' : 'Добавить в корзину' }}</button>
            <button class="sb-product-heart" :class="{ active: inFavorite }" aria-label="Добавить в избранное" @click="toggleFavorite(product.id)"><Heart :size="20" :fill="inFavorite ? 'currentColor' : 'none'" /></button>
          </div>

          <div class="sb-product-assurances">
            <div><Truck :size="20" /><span><b>Доставка по России</b><small>Рассчитаем срок и стоимость при оформлении</small></span></div>
            <div><ShieldCheck :size="20" /><span><b>Оригинальный продукт</b><small>Напрямую от производителя</small></span></div>
            <div><RotateCcw :size="20" /><span><b>Поможем с выбором</b><small>Поддержка до и после покупки</small></span></div>
          </div>
        </section>
      </div>

      <section v-if="boughtTogether.length" class="sb-product-recommendations">
        <div class="sb-section-head"><div><p>ДОПОЛНИТЕ УХОД</p><h2>С этим товаром покупают</h2></div><NuxtLink to="/catalog">Весь каталог</NuxtLink></div>
        <div class="sb-product-grid"><ProductCard v-for="item in boughtTogether" :key="item.id" :product="item" /></div>
      </section>

      <section v-if="similarProducts.length" class="sb-product-recommendations is-similar">
        <div class="sb-section-head"><div><p>ВАМ МОЖЕТ ПОНРАВИТЬСЯ</p><h2>Похожие товары</h2></div><NuxtLink to="/catalog">Смотреть все</NuxtLink></div>
        <div class="sb-product-grid"><ProductCard v-for="item in similarProducts" :key="item.id" :product="item" /></div>
      </section>
    </div>

    <div v-else-if="error" class="sb-empty sb-product-error">
      <h2>Товар не найден</h2><NuxtLink to="/catalog" class="sb-primary">Вернуться в каталог</NuxtLink>
    </div>
  </SiteShell>
</template>
