<script setup lang="ts">
import { ArrowRight, Check, ChevronDown, ShoppingBag, CalendarDays, Link2, PackageCheck } from '@lucide/vue';
import { safeSiteContentUrl, type HomePartnershipBlock } from '~/shared/site-content';

const props = defineProps<{ page: any }>();
const { siteContent } = useStorefrontContent();
const blocks = computed<any[]>(() => props.page.blocks || []);
const block = (id: string) => computed<any>(() => blocks.value.find(item => item.id === id));
const cover = block('cover');
const purchases = block('purchases');
const salon = block('salon');
const booking = block('booking');
const supply = block('supply');
const workday = block('workday');
const start = block('start');
const faqIntro = block('faq-intro');
const contact = block('contact');
const faqs = computed(() => blocks.value.filter(item => item.kind === 'faq'));
const paragraphs = (body: unknown) => String(body || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
const titleParts = computed(() => String(props.page.title || '').split('\n'));
const workdayTitle = computed(() => String(workday.value?.title || 'Больше времени на клиентов.\nМеньше ручной работы.').split('\n'));
const canLink = (label: unknown, url: unknown) => typeof label === 'string' && !!label && !!safeSiteContentUrl(url);
const previewBlock = computed<HomePartnershipBlock>(() => siteContent.value.home.business);
const config = useRuntimeConfig();
const { data: productData } = await useFetch<any>('/products', { baseURL: config.public.apiBase, query: { limit: 12 } });
const sceneProducts = computed(() => (productData.value?.items || []).filter((product: any) => product.productType !== 'GIFT_CARD' && storefrontProductImage(product)));
</script>

<template>
  <article class="sb-partnership-page sb-business-page">
    <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Для бизнеса</span></nav>

    <header class="sb-business-hero sb-partnership-cover">
      <div class="sb-business-hero__copy">
        <p class="sb-kicker">{{ page.eyebrow }}</p>
        <h1>{{ titleParts[0] }}<em v-if="titleParts.length > 1">{{ titleParts.slice(1).join(' ') }}</em></h1>
        <p class="sb-business-hero__lead">{{ page.lead }}</p>
        <div class="sb-business-hero__actions">
          <NuxtLink v-if="canLink(cover?.buttonLabel, cover?.buttonUrl)" :to="cover.buttonUrl" class="sb-primary">{{ cover.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
          <NuxtLink v-if="canLink(cover?.secondaryLabel, cover?.secondaryUrl)" :to="cover.secondaryUrl" class="sb-business-hero__login">{{ cover.secondaryLabel }} <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
        </div>
      </div>
      <div class="sb-business-hero__preview"><SiteBusinessPreview :block="previewBlock" /></div>
      <ul v-if="cover?.body" class="sb-business-hero__benefits" aria-label="Возможности для бизнеса">
        <li v-for="(line, index) in paragraphs(cover.body)" :key="index"><Check :size="17" aria-hidden="true" />{{ line }}</li>
      </ul>
    </header>

    <aside v-if="page.reviewRequired" class="sb-review-notice" role="note">Информация требует утверждения перед публичным запуском.</aside>

    <div class="sb-business-intro"><p class="sb-kicker">{{ cover?.title }}</p><p>01 / 02</p></div>
    <section v-if="purchases" :id="purchases.id" class="sb-partnership-section sb-business-story sb-business-story--purchase sb-partnership-feature--scene">
      <div class="sb-business-story__copy"><div class="sb-business-story__eyebrow"><ShoppingBag :size="18" aria-hidden="true" /> ЗАКУПКИ</div><h2>{{ purchases.title }}</h2><p v-for="(line, index) in paragraphs(purchases.body)" :key="index">{{ line }}</p><NuxtLink v-if="canLink(purchases.buttonLabel, purchases.buttonUrl)" :to="purchases.buttonUrl" class="sb-business-story__link">{{ purchases.buttonLabel }} <ArrowRight :size="17" aria-hidden="true" /></NuxtLink></div>
      <SitePartnershipScene kind="purchases" :products="sceneProducts" />
    </section>
    <section v-if="salon" :id="salon.id" class="sb-partnership-section sb-business-story sb-business-story--salon sb-partnership-feature--scene">
      <div class="sb-business-story__copy"><div class="sb-business-story__eyebrow"><CalendarDays :size="18" aria-hidden="true" /> УПРАВЛЕНИЕ САЛОНОМ</div><h2>{{ salon.title }}</h2><p v-for="(line, index) in paragraphs(salon.body)" :key="index">{{ line }}</p><NuxtLink v-if="canLink(salon.buttonLabel, salon.buttonUrl)" :to="salon.buttonUrl" class="sb-business-story__link">{{ salon.buttonLabel }} <ArrowRight :size="17" aria-hidden="true" /></NuxtLink></div>
      <SitePartnershipScene kind="salon" :products="sceneProducts" />
    </section>

    <div v-if="booking || supply" class="sb-business-details">
      <div class="sb-business-details__head"><p class="sb-kicker">ДЛЯ ЕЖЕДНЕВНОЙ РАБОТЫ</p><h2>{{ workdayTitle[0] }}<br v-if="workdayTitle.length > 1" /><em v-if="workdayTitle.length > 1">{{ workdayTitle.slice(1).join(' ') }}</em></h2></div>
      <div class="sb-business-details__rows">
        <section v-if="booking" :id="booking.id" class="sb-partnership-section sb-business-detail"><Link2 :size="23" aria-hidden="true" /><div><h3>{{ booking.title }}</h3><p v-for="(line, index) in paragraphs(booking.body)" :key="index">{{ line }}</p></div></section>
        <section v-if="supply" :id="supply.id" class="sb-partnership-section sb-business-detail"><PackageCheck :size="23" aria-hidden="true" /><div><h3>{{ supply.title }}</h3><p v-for="(line, index) in paragraphs(supply.body)" :key="index">{{ line }}</p></div></section>
      </div>
    </div>

    <section v-if="start" :id="start.id" class="sb-partnership-section sb-business-start"><div><p class="sb-kicker">НАЧАТЬ РАБОТУ</p><h2>{{ start.title }}</h2><NuxtLink v-if="canLink(cover?.buttonLabel, cover?.buttonUrl)" :to="cover.buttonUrl" class="sb-primary">{{ cover.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink></div><ol><li v-for="(line, index) in paragraphs(start.body)" :key="index"><span>{{ String(index + 1).padStart(2, '0') }}</span><p>{{ line }}</p></li></ol></section>

    <div v-if="faqs.length" class="sb-business-faq"><div><p class="sb-kicker">КОРОТКО О ГЛАВНОМ</p><h2>{{ faqIntro?.title || 'Остались вопросы?' }}</h2><p>{{ faqIntro?.body || 'Самое важное перед подключением.' }}</p></div><div><section v-for="item in faqs" :id="item.id" :key="item.id" class="sb-partnership-section"><details><summary>{{ item.title }}<ChevronDown :size="20" aria-hidden="true" /></summary><p v-for="(line, index) in paragraphs(item.body)" :key="index">{{ line }}</p></details></section></div></div>

    <section v-if="contact" :id="contact.id" class="sb-partnership-section sb-business-end"><div><p class="sb-kicker">SARKISIAN ДЛЯ БИЗНЕСА</p><h2>{{ contact.title }}</h2><p v-for="(line, index) in paragraphs(contact.body)" :key="index">{{ line }}</p></div><div class="sb-business-end__actions"><NuxtLink v-if="canLink(contact.buttonLabel, contact.buttonUrl)" :to="contact.buttonUrl" class="sb-primary">{{ contact.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink><NuxtLink v-if="canLink(contact.secondaryLabel, contact.secondaryUrl)" :to="contact.secondaryUrl" class="sb-business-end__secondary">{{ contact.secondaryLabel }} <ArrowRight :size="16" aria-hidden="true" /></NuxtLink></div></section>
  </article>
</template>
