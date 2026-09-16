<script setup lang="ts">
import { ArrowRight, Award, Gift, PackageCheck, ShieldCheck, Sparkles } from '@lucide/vue';

const config = useRuntimeConfig();
const { openAuth } = useStorefrontPanels();
const bonusCardTilt = useStorefrontCardTilt();
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
  return storefrontActiveCategories(content.value.categories || []).slice(0, 4).map((category: any, index: number) => ({
    title: category.nameRu,
    slug: category.slug,
    image: storefrontMediaUrl(category.imageUrl) || storefrontCategories[(index + 1) % storefrontCategories.length].image,
  }));
});

onMounted(() => {
  if (banners.value.length > 1) bannerTimer = setInterval(() => { bannerIndex.value = (bannerIndex.value + 1) % banners.value.length; }, 7000);
});
onBeforeUnmount(() => { if (bannerTimer) clearInterval(bannerTimer); });
watch(() => banners.value.length, (length) => { if (bannerIndex.value >= length) bannerIndex.value = 0; });

useStorefrontSeo({
  title: 'SARKISIAN BRAND — профессиональные материалы для маникюра',
  description: 'Официальный интернет-магазин SARKISIAN BRAND. Гели, базы, топы, инструменты и материалы для мастеров маникюра.',
  image: '/storefront/hero.jpg',
});
</script>

<template>
  <SiteShell>
    <section class="sb-hero sb-liquid-hero">
      <h1 class="sb-visually-hidden">SARKISIAN BRAND — профессиональные материалы для мастеров маникюра</h1>
      <Transition name="sb-banner-fade">
        <picture :key="currentBanner.id">
          <source v-if="currentBanner.mobileImageUrl" media="(max-width: 760px)" :srcset="storefrontMediaUrl(currentBanner.mobileImageUrl)" />
          <img :src="storefrontMediaUrl(currentBanner.imageUrl)" :alt="currentBanner.title || 'SARKISIAN BRAND'" fetchpriority="high" />
        </picture>
      </Transition>
      <NuxtLink :to="currentBanner.linkUrl || '/catalog'" class="sb-hero__hotspot" :aria-label="currentBanner.buttonLabel || 'Перейти по предложению SARKISIAN BRAND'"></NuxtLink>
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
        <NuxtLink v-for="category in displayCategories" :key="category.slug" :to="storefrontCatalogLink(category.slug)" class="sb-home-category">
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
        <p class="sb-club-banner__label">SARKISIAN CLUB</p>
        <h2>Покупайте любимое.<br /><em>Получайте больше.</em></h2>
        <ul class="sb-club-perks">
          <li><Award :size="20" /><span>Бонусы за покупки для следующих заказов</span></li>
          <li><Gift :size="20" /><span>Уровень участия и условия программы в кабинете</span></li>
          <li><ShieldCheck :size="20" /><span>Баланс и история начислений всегда под рукой</span></li>
        </ul>
        <div class="sb-club-actions">
          <button type="button" class="sb-liquid-primary sb-club-join" @click="openAuth('register')">Вступить в клуб <ArrowRight :size="17" /></button>
          <NuxtLink to="/club" class="sb-liquid-primary sb-club-about">О клубе <ArrowRight :size="17" /></NuxtLink>
        </div>
      </div>
      <SiteLoyaltyPreview class="sb-card-tilt" @pointerenter="bonusCardTilt.onPointerEnter" @pointermove="bonusCardTilt.onPointerMove" @pointerleave="bonusCardTilt.onPointerLeave" @pointercancel="bonusCardTilt.onPointerCancel" />
    </section>

    <section class="sb-brand-manifesto" aria-label="О бренде SARKISIAN">
      <h2><span class="is-dark">SARKISIAN — премиальный бренд</span><span class="is-dark">для мастеров маникюра, <em>который</em></span><span>понимает профессию изнутри.</span></h2>
    </section>

    <section id="about" class="sb-brand-story">
      <div>
        <p>SARKISIAN BRAND</p>
        <h2>Материалы, которые помогают работать <em>быстрее и увереннее</em></h2>
        <span>Мы не просто продаём — мы производим профессиональные материалы под личным контролем Светланы Саркисян. Только решения, которые действительно удобны в ежедневной работе.</span>
        <NuxtLink to="/catalog">Познакомиться с продуктами <ArrowRight :size="17" /></NuxtLink>
      </div>
      <figure class="sb-brand-story__portrait">
        <img src="/storefront/svetlana-portrait.png" alt="Светлана Саркисян — основательница SARKISIAN BRAND" width="1254" height="1254" loading="lazy" decoding="async" />
      </figure>
    </section>

    <section id="delivery" class="sb-benefits">
      <article><i><PackageCheck :size="28" /></i><div><small>01 / ДОСТАВКА</small><b>Быстрая отправка</b><span>Передаём заказ в сборку сразу после оплаты и сообщаем о каждом этапе.</span></div></article>
      <article><i><ShieldCheck :size="28" /></i><div><small>02 / КАЧЕСТВО</small><b>Оригинальная продукция</b><span>Напрямую от SARKISIAN BRAND — с контролем каждой партии.</span></div></article>
      <article><i><Award :size="28" /></i><div><small>03 / SARKISIAN CLUB</small><b>Бонусы за покупки</b><span>Возвращаем часть заказа баллами для следующих покупок.</span></div></article>
      <article><i><Sparkles :size="28" /></i><div><small>04 / ЭКСПЕРТИЗА</small><b>Создано для мастеров</b><span>Продукты проверены Светланой Саркисян в реальной ежедневной работе.</span></div></article>
    </section>
  </SiteShell>
</template>
