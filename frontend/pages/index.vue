<script setup lang="ts">
import { defaultSiteContent } from '~/shared/site-content';
import { ArrowRight, Award, Gift, PackageCheck, ShieldCheck, Sparkles } from '@lucide/vue';

const config = useRuntimeConfig();
const { openAuth } = useStorefrontPanels();
const bonusCardTilt = useStorefrontCardTilt();
const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const home = computed(() => siteContent.value.home);
const visibleSections = computed(() => home.value.order.filter(key => !home.value.hidden.includes(key)));
const productQuery = computed(() => home.value.bestsellers.mode === 'manual' ? { limit: 8, ids: home.value.bestsellers.productIds.join(','), sort: 'new' } : { limit: 8, sort: 'popular' });
const { data, pending, error } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: productQuery });
const products = computed(() => {
  const items = (data.value?.items || []).filter((item: any) => item.isActive !== false);
  if (home.value.bestsellers.mode !== 'manual') return items.slice(0, 8);
  const byId = new Map<string, any>(items.map((item: any) => [item.id, item]));
  return home.value.bestsellers.productIds.flatMap(id => byId.has(id) ? [byId.get(id)] : []);
});
const clubIcons = { award: Award, gift: Gift, shield: ShieldCheck };
const benefitIcons = { package: PackageCheck, shield: ShieldCheck, award: Award, sparkles: Sparkles };
const bannerIndex = ref(0);
let bannerTimer: ReturnType<typeof setInterval> | undefined;
const banners = computed(() => content.value.banners?.length ? content.value.banners : [{ id: 'default', imageUrl: '/storefront/hero.jpg', linkUrl: '/catalog', buttonLabel: 'Перейти в каталог' }]);
const currentBanner = computed(() => banners.value[bannerIndex.value % banners.value.length]);
const displayCategories = computed(() => {
  return storefrontActiveCategories(content.value.categories || []).filter((category:any)=>!category.parentId).slice(0, 4).map((category: any, index: number) => ({
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
  title: () => `${siteContent.value.brand.name} — профессиональные материалы для маникюра`,
  description: 'Официальный интернет-магазин SARKISIAN BRAND. Гели, базы, топы, инструменты и материалы для мастеров маникюра.',
  image: '/storefront/hero.jpg',
});
</script>

<template>
  <SiteShell>
    <h1 v-if="home.hidden.includes('hero')" class="sb-visually-hidden">{{ siteContent.brand.name }} — профессиональные материалы для мастеров маникюра</h1>
    <template v-for="section in visibleSections" :key="section">
    <section v-if="section === 'hero'" class="sb-hero sb-liquid-hero">
      <h1 class="sb-visually-hidden">{{ siteContent.brand.name }} — профессиональные материалы для мастеров маникюра</h1>
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

    <section v-if="section === 'categories'" class="sb-home-section sb-categories">
      <div class="sb-section-head">
        <div><p>{{ home.categories.eyebrow }}</p><h2 ui-inline-i-02281a80fab7-1 >{{ home.categories.title }}</h2></div>
        <NuxtLink to="/catalog">{{ home.categories.buttonLabel }} <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div class="sb-category-grid">
        <NuxtLink v-for="category in displayCategories" :key="category.slug" :to="storefrontCatalogLink(category.slug)" class="sb-home-category">
          <img :src="category.image" :alt="category.title" loading="lazy" />
          <span>{{ category.title }}</span><ArrowRight :size="18" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="section === 'bestsellers'" class="sb-home-section sb-products-section">
      <div class="sb-section-head">
        <div><p>{{ home.bestsellers.eyebrow }}</p><h2>{{ home.bestsellers.title }}</h2></div>
        <NuxtLink to="/catalog">{{ home.bestsellers.buttonLabel }} <ArrowRight :size="17" /></NuxtLink>
      </div>
      <div v-if="pending" class="sb-state">Загружаем каталог…</div>
      <div v-else-if="error" class="sb-state is-error">Каталог временно недоступен. Попробуйте обновить страницу.</div>
      <div v-else-if="!products.length" class="sb-state">Товары подборки пока недоступны.</div>
      <div v-else class="sb-product-grid">
        <ProductCard v-for="product in products.slice(0, 8)" :key="product.id" :product="product" />
      </div>
    </section>

    <section v-if="section === 'club'" class="sb-club-banner">
      <div class="sb-club-banner__glow"></div>
      <div class="sb-club-banner__copy">
        <p class="sb-club-banner__label">{{ home.club.label }}</p>
        <h2>{{ home.club.title }}<br /><em>{{ home.club.accent }}</em></h2>
        <ul class="sb-club-perks">
          <li v-for="benefit in home.club.benefits" :key="benefit.id"><component :is="clubIcons[benefit.icon]" :size="20" /><span>{{ benefit.text }}</span></li>
        </ul>
        <div class="sb-club-actions">
          <button type="button" class="sb-liquid-primary sb-club-join" @click="openAuth('register')">{{ home.club.joinLabel }} <ArrowRight :size="17" /></button>
          <NuxtLink to="/club" class="sb-liquid-primary sb-club-about">{{ home.club.aboutLabel }} <ArrowRight :size="17" /></NuxtLink>
        </div>
      </div>
      <SiteLoyaltyPreview class="sb-card-tilt" @pointerenter="bonusCardTilt.onPointerEnter" @pointermove="bonusCardTilt.onPointerMove" @pointerleave="bonusCardTilt.onPointerLeave" @pointercancel="bonusCardTilt.onPointerCancel" />
    </section>

    <section v-if="section === 'manifesto'" class="sb-brand-manifesto" :aria-label="`О бренде ${siteContent.brand.name}`">
      <h2 v-if="home.manifesto.text === defaultSiteContent.home.manifesto.text"><span class="is-dark">SARKISIAN — премиальный бренд</span><span class="is-dark">для мастеров маникюра, <em>который</em></span><span>понимает профессию изнутри.</span></h2>
      <h2 ui-inline-i-02281a80fab7-2 v-else >{{ home.manifesto.text }}</h2>
    </section>

    <section v-if="section === 'story'" id="about" class="sb-brand-story">
      <div>
        <p>{{ home.story.eyebrow }}</p>
        <h2>{{ home.story.title }} <em>{{ home.story.accent }}</em></h2>
        <span ui-inline-i-02281a80fab7-3 >{{ home.story.body }}</span>
        <NuxtLink to="/catalog">{{ home.story.buttonLabel }} <ArrowRight :size="17" /></NuxtLink>
      </div>
      <figure class="sb-brand-story__portrait">
        <img :src="storefrontMediaUrl(home.story.portraitUrl)" alt="Светлана Саркисян — основательница SARKISIAN BRAND" width="1254" height="1254" loading="lazy" decoding="async" />
      </figure>
    </section>

    <section v-if="section === 'benefits' && home.benefits.length" id="delivery" class="sb-benefits">
      <article v-for="benefit in home.benefits" :key="benefit.id"><i><component :is="benefitIcons[benefit.icon]" :size="28" /></i><div><small>{{ benefit.eyebrow }}</small><b>{{ benefit.title }}</b><span>{{ benefit.body }}</span></div></article>
    </section>
    </template>
  </SiteShell>
</template>
