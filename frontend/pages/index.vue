<script setup lang="ts">
import { defaultSiteContent, type HomeSection } from '~/shared/site-content';
const config = useRuntimeConfig();
const { openAuth } = useStorefrontPanels();
const { user } = useStorefront();
const { t, english, region, rates, ratesLoading, ratesError, loadRates } = useHomeLocale();
onMounted(() => { void loadRates(); });
useHead(() => ({ htmlAttrs: { lang: english.value ? 'en' : 'ru' } }));
const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const home = computed(() => siteContent.value.home);
const designOrder: HomeSection[] = ['hero', 'manifesto', 'story', 'bestsellers', 'benefits', 'business', 'club', 'referral', 'bloggers'];
// Preserve editor visibility/reordering; replace only the legacy default order.
const visibleSections = computed(() => (home.value.order.join() === defaultSiteContent.home.order.join() ? designOrder : home.value.order).filter(key => !home.value.hidden.includes(key)));
const productQuery = computed(() => home.value.bestsellers.mode === 'manual' ? { limit: 8, ids: home.value.bestsellers.productIds.join(','), sort: 'new' } : { limit: 6, sort: 'popular' });
const { data, pending, error, refresh } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: productQuery });
const products = computed(() => {
  const items = (data.value?.items || []).filter((item: any) => item.isActive !== false);
  if (home.value.bestsellers.mode !== 'manual') return items.slice(0, 6);
  const byId = new Map<string, any>(items.map((item: any) => [item.id, item]));
  return home.value.bestsellers.productIds.flatMap(id => byId.has(id) ? [byId.get(id)] : []);
});
const joinClub = () => user.value ? navigateTo('/account?tab=loyalty') : openAuth('register');
const founderPortrait = computed(() => home.value.story.portraitUrl === defaultSiteContent.home.story.portraitUrl ? '/storefront/home/svetlana-founder.png' : storefrontMediaUrl(home.value.story.portraitUrl));
const orbitLabels = [
  { key: 'salon', text: '[ За привлечение нового салона ]' },
  { key: 'reward', text: '[ Фиксированная награда ]' },
  { key: 'share', text: '[ Делитесь опытом с аудиторией ]' },
  { key: 'track', text: '[ Следите за рекомендациями ]' },
  { key: 'payment', text: '[ Получайте денежное вознаграждение ]' },
];
useStorefrontSeo({ title: () => `${siteContent.value.brand.name} — профессиональные материалы для маникюра`, description: 'Официальный интернет-магазин SARKISIAN BRAND. Профессиональные материалы для маникюра, клуб мастеров и решения для бизнеса.', image: '/storefront/home/svetlana-hero.png' });
</script>

<template>
  <SiteShell editorial>
    <h1 v-if="home.hidden.includes('hero')" class="sb-visually-hidden">{{ siteContent.brand.name }} — материалы для мастеров маникюра</h1>
    <template v-for="section in visibleSections" :key="section">
      <section v-if="section === 'hero'" class="sh-hero sh-container">
        <h1><span class="sb-visually-hidden">SARKISIAN — профессиональные материалы для мастеров маникюра</span><img src="/storefront/home/hero-wordmark.svg" alt="" fetchpriority="high" /></h1>
        <div class="sh-hero-copy"><p>{{ t("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри.") }}<br />{{ t("Материалы, которые помогают работать быстрее и увереннее") }}</p><span>{{ t("От мастера — к мастерам") }}</span></div>
        <img class="sh-hero-portrait" src="/storefront/home/svetlana-hero.png" alt="Светлана Саркисян — основательница бренда" width="796" height="1195" fetchpriority="high" />
      </section>
      <section v-else-if="section === 'manifesto'" id="about" class="sh-about sh-container">
        <h2 class="sh-about-label"><span>{{ t("О") }}</span><span>{{ t("бренде") }}</span></h2>
        <div class="sh-about-intro"><span aria-hidden="true">SARKISIAN</span><p>{{ t(home.manifesto.text) }}<br />{{ t("Материалы, которые помогают работать быстрее и увереннее.") }}</p></div>
        <p class="sh-about-body">{{ t(home.story.body) }}</p>
        <div class="sh-media-placeholder sh-about-media" aria-hidden="true"></div>
      </section>
      <section v-else-if="section === 'story'" class="sh-founder sh-container" aria-labelledby="founder-heading">
        <h2 id="founder-heading"><span class="sh-founder-first">{{ t("Светлана") }}</span><span class="sh-founder-last">{{ t("Саркисян") }}</span></h2>
        <p class="sh-founder-intro">{{ t("В её работе встречаются два направления: практика мастера и создание профессиональных материалов для ногтевого сервиса.") }}</p>
        <img class="sh-founder-portrait" :src="founderPortrait" alt="Светлана Саркисян" width="609" height="914" loading="lazy" />
        <ul class="sh-founder-roles"><li>{{ t("Основатель") }}<br />{{ t("бренда") }}</li><li>{{ t("Блогер") }}</li><li>{{ t("Мастер") }}<br />{{ t("маникюра") }}</li></ul>
        <div class="sh-founder-story"><p>{{ t("Понимаем профессию изнутри") }}</p><p>{{ t("Опыт ежедневной работы стал основой бренда. SARKISIAN выпускает материалы для маникюра под личным контролем Светланы — с вниманием к тому, как продукт ведёт себя в руках мастера.") }}</p></div>
        <p class="sh-founder-caption">{{ t("Бренд объединяет материалы и инструменты для мастеров, которые ценят понятный выбор и внимательное отношение к своей работе.") }}</p>
      </section>
      <section v-else-if="section === 'bestsellers'" id="products" class="sh-products sh-container" aria-labelledby="products-heading">
        <h2 id="products-heading" class="sh-products-title">{{ t("Продукты") }}</h2>
        <p class="sh-products-intro">{{ t("В каталоге представлены гели, гель-лаки, базы, топы, фрезы и инструменты.") }}<br />{{ t("В карточках товаров можно посмотреть фотографии, описание, стоимость и доступные варианты.") }}</p>
        <div v-if="region.currency !== 'RUB'" class="sh-products-currency" role="status"><span>{{ t(rates ? 'Приблизительный пересчёт. Оплата в рублях.' : ratesLoading ? 'Загружаем курсы. Пока цены в рублях.' : 'Курсы недоступны — цены показаны в рублях.') }}</span><a v-if="rates" href="https://www.cbr.ru/currency_base/daily/" target="_blank" rel="noopener noreferrer">{{ t('Курс ЦБ от') }} {{ rates.date }}</a><button v-if="ratesError" @click="loadRates">{{ t('Обновить курсы') }}</button></div>
        <div v-if="pending" class="sh-products-state" role="status">{{ t("Загружаем каталог…") }}</div>
        <div v-else-if="error" class="sh-products-state" role="alert"><p>{{ t("Не удалось загрузить товары.") }}</p><button class="sh-pill" @click="refresh()">{{ t("Попробовать ещё раз") }}</button></div>
        <div v-else-if="!products.length" class="sh-products-state">{{ t("Товары подборки пока недоступны.") }}</div>
        <div v-else class="sh-product-grid"><ProductCard v-for="product in products" :key="product.id" :product="product" editorial /></div>
        <div class="sh-products-outro"><NuxtLink to="/catalog" class="sh-pill">{{ t(home.bestsellers.buttonLabel) }}</NuxtLink><p>{{ t("Выбирайте продукты под привычную технику и задачи. Если сомневаетесь,") }} <NuxtLink to="/contacts">{{ t("напишите нам") }}</NuxtLink>{{ t(": поможем разобраться в ассортименте, не обещая универсального решения для всех.") }}</p></div>
      </section>
      <section v-else-if="section === 'categories'" class="sh-categories sh-container"><h2>{{ t(home.categories.title) }}</h2><div><NuxtLink v-for="category in storefrontActiveCategories(content.categories).filter(item => !item.parentId)" :key="category.id" class="sh-pill" :to="storefrontCatalogLink(category.slug)">{{ category.nameRu }}</NuxtLink></div></section>
      <section v-else-if="section === 'benefits'" class="sh-benefits sh-container" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading"><span>{{ t("Почему") }}</span><span>{{ t("нас? выбирают") }}</span></h2>
        <div class="sh-benefit-grid"><article v-for="(benefit, index) in home.benefits" :key="benefit.id"><span class="sh-benefit-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><h3>{{ t(benefit.title) }}</h3><p>{{ t(benefit.body) }}</p></article></div>
        <NuxtLink to="/catalog" class="sh-pill">{{ t("Заказать") }}</NuxtLink>
      </section>
      <section v-else-if="section === 'business'" class="sh-business sh-container" aria-labelledby="business-heading">
        <div class="sh-business-swatches" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="sh-business-copy"><p>{{ t(home.business.body) }}</p><p>{{ t(home.business.title) }}<br />{{ t(home.business.accent) }}</p><h2 id="business-heading">{{ t("Для") }}<br />{{ t("бизнеса") }}</h2></div>
        <nav class="sh-business-directions" aria-label="Решения для бизнеса"><NuxtLink :to="home.business.url">{{ t("Мой") }}<br />{{ t("салон") }}</NuxtLink><NuxtLink :to="home.business.url">{{ t("Онлайн") }}<br />{{ t("запись") }}</NuxtLink><NuxtLink :to="home.business.url">{{ t("Закупки") }}<br />SARKISIAN</NuxtLink></nav>
        <div class="sh-business-media sh-media-placeholder" aria-hidden="true"><img v-if="home.business.visualImageUrl" :src="storefrontMediaUrl(home.business.visualImageUrl)" alt="" loading="lazy" /></div>
        <NuxtLink :to="home.business.url" class="sh-pill sh-business-open">{{ t("Открыть") }}</NuxtLink>
      </section>
      <section v-else-if="section === 'club'" class="sh-club sh-container" aria-labelledby="club-heading">
        <ul><li v-for="benefit in [...home.club.benefits].reverse()" :key="benefit.id">{{ t(benefit.text) }}</li></ul>
        <p class="sh-club-lead">{{ t(home.club.title) }}</p>
        <h2 id="club-heading"><img src="/storefront/home/club-wordmark.svg" :alt="home.club.label" loading="lazy" /></h2>
        <p>{{ t(home.club.accent) }}</p>
        <div class="sh-club-actions"><NuxtLink to="/club" class="sh-pill">{{ t(home.club.aboutLabel) }}</NuxtLink><button class="sh-pill" @click="joinClub">{{ t(home.club.joinLabel) }}</button></div>
      </section>
      <section v-else-if="section === 'referral'" class="sh-referral" aria-labelledby="referral-heading">
        <div class="sh-container"><div class="sh-referral-copy"><p>{{ t(home.referral.body) }}</p><NuxtLink :to="home.referral.url" class="sh-pill">{{ t("Как это работает?") }}</NuxtLink></div><h2 id="referral-heading"><span v-if="english" class="sh-referral-english">From a professional.<br />To friends.</span><img v-else src="/storefront/home/referral-title.svg" alt="От мастера — друзьям" loading="lazy" /></h2></div>
        <div class="sh-referral-media" aria-hidden="true"><div><img v-if="home.referral.visualImageUrl" :src="storefrontMediaUrl(home.referral.visualImageUrl)" alt="" loading="lazy" /></div><div></div></div>
      </section>
      <section v-else-if="section === 'bloggers'" class="sh-bloggers sh-container" aria-labelledby="bloggers-heading">
        <div class="sh-bloggers-copy"><p>{{ t("За привлечение нового салона или бизнеса предусмотрена отдельная фиксированная награда.") }}</p><NuxtLink :to="home.bloggers.url" class="sh-pill">{{ t("Узнать подробнее") }}</NuxtLink></div>
        <div class="sh-orbit">
          <h2 id="bloggers-heading">{{ t("Для") }}<br />{{ t("блогеров") }}</h2>
          <img class="sh-orbit-outer" src="/storefront/home/orbit-outer.svg" alt="" loading="lazy" />
          <img class="sh-orbit-top" src="/storefront/home/orbit-top.svg" alt="" loading="lazy" />
          <img class="sh-orbit-inner" src="/storefront/home/orbit-inner.svg" alt="" loading="lazy" />
          <img class="sh-orbit-eyedropper" src="/storefront/home/eyedropper.svg" alt="" loading="lazy" />
          <div v-for="item in orbitLabels" :key="item.key" class="sh-orbit-chip" :class="`sh-orbit-${item.key}`"><img :src="`/storefront/home/sample-${item.key}.svg`" alt="" loading="lazy" /><span>{{ t(item.text) }}</span></div>
        </div>
      </section>
    </template>
  </SiteShell>
</template>
