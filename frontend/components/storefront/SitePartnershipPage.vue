<script setup lang="ts">
import { ArrowRight, Building2, CalendarDays, ChartNoAxesCombined, Gift, Link, ShieldCheck, Users, Wallet } from '@lucide/vue';
import { safeSiteContentUrl, type HomePartnershipBlock } from '~/shared/site-content';
const props = defineProps<{ page: any }>();
const { siteContent } = useStorefrontContent();
const business = computed(() => props.page.slug === 'business');
const hero = computed(() => props.page.blocks?.find((block: any) => block.kind === 'hero'));
const blocks = computed(() => (props.page.blocks || []).filter((block: any) => block.kind !== 'hero'));
const features = computed(() => blocks.value.filter((block: any) => !['faq', 'action', 'steps'].includes(block.kind)));
const steps = computed(() => blocks.value.filter((block: any) => block.kind === 'steps'));
const faqs = computed(() => blocks.value.filter((block: any) => block.kind === 'faq'));
const actions = computed(() => blocks.value.filter((block: any) => block.kind === 'action'));
const config = useRuntimeConfig();
const { data: productData } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: { limit: 12 }, immediate: business.value });
const sceneProducts = computed(() => (productData.value?.items || []).filter((p: any) => p.productType !== 'GIFT_CARD' && storefrontProductImage(p)));
const sceneKind = (index: number) => business.value ? index === 0 ? 'purchases' : 'salon' : index === 0 ? 'creators' : 'business-reward';
const paragraphs = (body: string) => String(body || '').split(/\n+/).filter(Boolean);
const icons: Record<string, any> = { business: Building2, calendar: CalendarDays, users: Users, gift: Gift, link: Link, chart: ChartNoAxesCombined, wallet: Wallet, shield: ShieldCheck };
const hasLink = (label: unknown, url: unknown) => typeof label === 'string' && !!label && safeSiteContentUrl(url);
const heroBlock = computed<HomePartnershipBlock>(() => {
  const base = siteContent.value.home[business.value ? 'business' : 'bloggers'];
  const title = String(props.page.title || '').split('\n');
  return { ...base, eyebrow: props.page.eyebrow, title: title[0], accent: title.slice(1).join(' '), body: props.page.lead,
    theme: business.value ? 'light' : 'dark', buttonLabel: hero.value?.buttonLabel || '', url: hero.value?.buttonUrl || '',
    visualLabel: hero.value?.title || base.visualLabel, visualTitle: base.visualTitle,
    visualLines: paragraphs(hero.value?.body || '').slice(0, 4) };
});
</script>

<template>
  <article class="sb-partnership-page" :class="{ 'sb-partnership-page--business': business }">
    <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>{{ business ? 'Для бизнеса' : 'Для блогеров' }}</span></nav>
    <header class="sb-partnership-cover">
      <SitePartnershipBlock :block="heroBlock" :kind="business ? 'business' : 'bloggers'" heading-tag="h1" />
      <NuxtLink v-if="hasLink(hero?.secondaryLabel, hero?.secondaryUrl)" :to="hero.secondaryUrl" class="sb-partnership-text-link sb-partnership-cover__login">{{ hero.secondaryLabel }} <ArrowRight :size="16" /></NuxtLink>
    </header>
    <aside v-if="page.reviewRequired" class="sb-review-notice" role="note">Информация требует утверждения перед публичным запуском.</aside>
    <div class="sb-partnership-features">
      <section v-for="(block, index) in features" :id="block.id" :key="block.id" class="sb-partnership-section sb-partnership-feature" :class="{ 'sb-partnership-feature--scene': index < 2, 'sb-partnership-feature--dark': index === 1 }">
        <div class="sb-partnership-feature__copy">
        <div class="sb-partnership-feature__mark" aria-hidden="true"><component :is="icons[block.icon] || ShieldCheck" :size="24" /><span>{{ String(index + 1).padStart(2, '0') }}</span></div>
        <h2>{{ block.title }}</h2><div class="sb-partnership-section__body"><p v-for="(line, n) in paragraphs(block.body)" :key="n">{{ line }}</p></div>
        <div v-if="hasLink(block.buttonLabel, block.buttonUrl) || hasLink(block.secondaryLabel, block.secondaryUrl)" class="sb-partnership-actions"><NuxtLink v-if="hasLink(block.buttonLabel, block.buttonUrl)" :to="block.buttonUrl" class="sb-partnership-text-link">{{ block.buttonLabel }} <ArrowRight :size="16" /></NuxtLink><NuxtLink v-if="hasLink(block.secondaryLabel, block.secondaryUrl)" :to="block.secondaryUrl" class="sb-partnership-text-link">{{ block.secondaryLabel }} <ArrowRight :size="16" /></NuxtLink></div>
        </div><SitePartnershipScene v-if="index < 2" :kind="sceneKind(index)" :products="sceneProducts" />
      </section>
    </div>
    <section v-for="block in steps" :id="block.id" :key="block.id" class="sb-partnership-section sb-partnership-process"><p class="sb-kicker">SARKISIAN</p><h2>{{ block.title }}</h2><ol class="sb-partnership-steps"><li v-for="(line, index) in paragraphs(block.body)" :key="index"><span aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><p>{{ line }}</p></li></ol></section>
    <div v-if="faqs.length" class="sb-partnership-faq"><h2>Вопросы и ответы</h2><div><section v-for="block in faqs" :id="block.id" :key="block.id" class="sb-partnership-section"><details><summary>{{ block.title }}</summary><p v-for="(line, index) in paragraphs(block.body)" :key="index">{{ line }}</p></details></section></div></div>
    <section v-for="block in actions" :id="block.id" :key="block.id" class="sb-partnership-section sb-partnership-end"><div><h2>{{ block.title }}</h2><p v-for="(line, n) in paragraphs(block.body)" :key="n">{{ line }}</p></div><div class="sb-partnership-actions"><NuxtLink v-if="hasLink(block.buttonLabel, block.buttonUrl)" :to="block.buttonUrl" class="sb-partnership-button sb-liquid-primary">{{ block.buttonLabel }} <ArrowRight :size="18" /></NuxtLink><NuxtLink v-if="hasLink(block.secondaryLabel, block.secondaryUrl)" :to="block.secondaryUrl" class="sb-partnership-text-link">{{ block.secondaryLabel }} <ArrowRight :size="18" /></NuxtLink></div></section>
  </article>
</template>
