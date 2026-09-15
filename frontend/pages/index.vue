<script setup lang="ts">
import { ArrowRight, Award, Gift, PackageCheck, ShieldCheck, Sparkles } from '@lucide/vue';

const config = useRuntimeConfig();
const { data, pending, error } = await useFetch<any>('/products', {
  baseURL: config.public.apiBase,
  query: { limit: 8 },
});
const products = computed(() => data.value?.items || []);
const { content, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const bannerIndex = ref(0);
let bannerTimer: ReturnType<typeof setInterval> | undefined;
const banners = computed(() => content.value.banners?.length ? content.value.banners : [{ id: 'default', imageUrl: '/storefront/hero.jpg', linkUrl: '/catalog', buttonLabel: 'Перейти в каталог' }]);
const currentBanner = computed(() => banners.value[bannerIndex.value % banners.value.length]);
const displayCategories = computed(() => {
  if (!content.value.categories?.length) return storefrontCategories.slice(1, 7);
  return content.value.categories.slice(0, 6).map((category: any, index: number) => ({
    title: category.nameRu,
    query: category.nameRu,
    image: storefrontMediaUrl(category.imageUrl) || storefrontCategories[(index + 1) % storefrontCategories.length].image,
  }));
});

onMounted(() => {
  if (banners.value.length > 1) bannerTimer = setInterval(() => { bannerIndex.value = (bannerIndex.value + 1) % banners.value.length; }, 7000);
});
onBeforeUnmount(() => { if (bannerTimer) clearInterval(bannerTimer); });
watch(() => banners.value.length, (length) => { if (bannerIndex.value >= length) bannerIndex.value = 0; });

useSeoMeta({
  title: 'SARKISIAN BRAND — профессиональные материалы для маникюра',
  description: 'Официальный интернет-магазин SARKISIAN BRAND. Гели, базы, топы, инструменты и материалы для мастеров маникюра.',
  ogTitle: 'SARKISIAN BRAND — от мастера мастерам',
  ogDescription: 'Профессиональные материалы для скорости, качества и уверенной работы мастера.',
});
</script>

<template>
  <SiteShell>
    <section class="sb-hero sb-liquid-hero">
      <Transition name="sb-banner-fade" mode="out-in">
        <picture :key="currentBanner.id">
          <source v-if="currentBanner.mobileImageUrl" media="(max-width: 760px)" :srcset="storefrontMediaUrl(currentBanner.mobileImageUrl)" />
          <img :src="storefrontMediaUrl(currentBanner.imageUrl)" alt="SARKISIAN BRAND" />
        </picture>
      </Transition>
      <div class="sb-hero__ambient"></div>
      <NuxtLink :to="currentBanner.linkUrl || '/catalog'" class="sb-hero__hotspot" aria-label="Перейти по предложению SARKISIAN BRAND"></NuxtLink>
      <div v-if="currentBanner.title || currentBanner.subtitle" class="sb-hero__admin-copy sb-glass-surface">
        <p>SARKISIAN BRAND</p><h1>{{ currentBanner.title }}</h1><span>{{ currentBanner.subtitle }}</span>
        <NuxtLink :to="currentBanner.linkUrl || '/catalog'">{{ currentBanner.buttonLabel || 'Подробнее' }} <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div class="sb-hero__glass-note sb-glass-surface">
        <Sparkles :size="17" />
        <span><b>Создано мастером</b><small>Проверено ежедневной работой</small></span>
      </div>
      <div v-if="!currentBanner.title && !currentBanner.subtitle" class="sb-hero__mobile-copy sb-glass-surface">
        <p>SARKISIAN BRAND</p>
        <h1>От мастера —<br /><em>мастерам</em></h1>
        <NuxtLink to="/catalog">Перейти в каталог <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div v-if="banners.length > 1" class="sb-hero__dots">
        <button v-for="(banner, index) in banners" :key="banner.id" :class="{ active: bannerIndex === index }" :aria-label="`Показать баннер ${index + 1}`" @click="bannerIndex = index"></button>
      </div>
    </section>

    <section class="sb-home-section sb-categories">
      <div class="sb-section-head">
        <div><p>ВЫБИРАЙТЕ ПО ЗАДАЧЕ</p><h2>Всё необходимое<br />для уверенной работы</h2></div>
        <NuxtLink to="/catalog">Весь каталог <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div class="sb-category-grid">
        <NuxtLink v-for="category in displayCategories" :key="category.title" :to="storefrontCatalogLink(category.query)" class="sb-home-category">
          <img :src="category.image" :alt="category.title" loading="lazy" />
          <span>{{ category.title }}</span><ArrowRight :size="18" />
        </NuxtLink>
      </div>
    </section>

    <section class="sb-home-section sb-products-section">
      <div class="sb-section-head">
        <div><p>ВЫБОР МАСТЕРОВ</p><h2>Бестселлеры</h2></div>
        <NuxtLink to="/catalog">Смотреть все <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div v-if="pending" class="sb-state">Загружаем каталог…</div>
      <div v-else-if="error" class="sb-state is-error">Каталог временно недоступен. Попробуйте обновить страницу.</div>
      <div v-else class="sb-product-grid">
        <ProductCard v-for="(product, index) in products.slice(0, 8)" :key="product.id" :product="product" :badge="index < 2 ? 'Бестселлер' : undefined" />
      </div>
    </section>

    <section class="sb-club-banner">
      <div class="sb-club-banner__glow"></div>
      <div class="sb-club-banner__copy">
        <p><Gift :size="15" /> SARKISIAN CLUB</p>
        <h2>Покупайте любимое.<br /><em>Получайте больше.</em></h2>
        <span>Бонусы за заказы, персональные предложения и ранний доступ к новинкам — в личном кабинете.</span>
        <NuxtLink to="/login" class="sb-liquid-primary">Вступить в клуб <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div class="sb-club-banner__card sb-glass-surface">
        <small>ВАШ БОНУСНЫЙ БАЛАНС</small>
        <b>1 250</b>
        <span>баллов для следующей покупки</span>
        <i><span></span></i>
        <div><span>Старт</span><span>Профи</span></div>
      </div>
    </section>

    <section class="sb-brand-manifesto" aria-label="О бренде SARKISIAN">
      <h2>SARKISIAN — премиальный бренд<br />для мастеров маникюра, <span>который понимает<br />профессию изнутри.</span></h2>
    </section>

    <section id="about" class="sb-brand-story">
      <div>
        <p>SARKISIAN BRAND</p>
        <h2>Материалы, которые помогают работать <em>быстрее и увереннее</em></h2>
        <span>Мы не просто продаём — мы производим профессиональные материалы под личным контролем Светланы Саркисян. Только решения, которые действительно удобны в ежедневной работе.</span>
        <NuxtLink to="/catalog">Познакомиться с продуктами <ArrowRight :size="17" /></NuxtLink>
      </div>
    </section>

    <section id="delivery" class="sb-benefits">
      <article><PackageCheck :size="25" /><div><b>Быстрая отправка</b><span>Передаём заказ в сборку сразу после оплаты</span></div></article>
      <article><ShieldCheck :size="25" /><div><b>Оригинальная продукция</b><span>Напрямую от SARKISIAN BRAND</span></div></article>
      <article><Award :size="25" /><div><b>Бонусы за покупки</b><span>Возвращаем часть заказа баллами</span></div></article>
      <article><Sparkles :size="25" /><div><b>Создано для мастеров</b><span>Продукты проверены в реальной работе</span></div></article>
    </section>
  </SiteShell>
</template>
