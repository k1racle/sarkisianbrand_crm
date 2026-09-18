<script setup lang="ts">
import { siteContentPhoneHref, safeSiteContentUrl } from '~/shared/site-content';
import { ArrowRight, UserRound } from '@lucide/vue';
const props = defineProps<{ page: any }>();
const club = computed(() => props.page.slug === 'club');
const { openAuth } = useStorefrontPanels();
const clubTilt = useStorefrontCardTilt();
const paragraphs = (body: string) => String(body || '').split(/\n+/).filter(Boolean);
const heading = computed(() => { const parts = String(props.page.title || '').split(/(?<=\.)\s+/); return { main: parts[0], accent: parts.slice(1).join(' ') }; });
const legal = computed(() => ['privacy', 'oferta', 'returns'].includes(props.page.slug));
const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
await loadStorefrontContent();
const aboutLogoUrl = computed(() => storefrontMediaUrl(siteContent.value.brand.logoUrl === '/sarkisian-logo.png' ? '/storefront/sarkisian-logo-original.png' : siteContent.value.brand.logoUrl));
const socialIcon = (key: string) => ({ vk: '/storefront/icons/vk.svg', telegram: '/storefront/icons/telegram.svg', max: '/storefront/icons/max.svg' } as Record<string, string>)[key];
const contactText = computed(() => (props.page.blocks || []).map((block: any) => block.body).join('\n'));
const structuredContacts = computed(() => content.value.settings.siteContent?.contacts != null);
const contactPhone = computed(() => structuredContacts.value ? siteContent.value.contacts.phone : contactText.value.match(/(?:8|\+7)\s*\(\d{3}\)\s*\d{3}[ -]\d{2}[ -]\d{2}/)?.[0] || '');
const contactEmail = computed(() => structuredContacts.value ? siteContent.value.contacts.email : contactText.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '');
</script>

<template>
  <SitePartnershipPage v-if="!club && page.slug !== 'about' && (['business', 'partnerships'].includes(page.slug) || page.blocks?.some((block: any) => block.kind && block.kind !== 'text'))" :page="page" />
  <article v-else class="sb-content-page" :class="{ 'is-legal': legal, 'is-about': page.slug === 'about', 'is-club': club, 'is-contacts': page.slug === 'contacts', 'is-delivery': page.slug === 'delivery' }">
    <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>{{ page.eyebrow || page.title }}</span></nav>
    <header class="sb-content-hero">
      <img v-if="page.slug === 'about'" class="sb-about-hero-logo" :src="aboutLogoUrl" :alt="siteContent.brand.name" />
      <div class="sb-content-hero__copy"><p class="sb-kicker">{{ page.eyebrow }}</p><h1>{{ legal ? page.title : heading.main }} <em v-if="!legal && heading.accent">{{ heading.accent }}</em></h1><p class="sb-content-lead">{{ page.lead }}</p>
        <div v-if="page.slug === 'about'" class="sb-content-actions"><NuxtLink class="sb-primary" to="/catalog">Посмотреть коллекцию <ArrowRight :size="18" /></NuxtLink></div>
        <div v-if="club" class="sb-content-actions"><button class="sb-primary" @click="openAuth('register')">{{ siteContent.home.club.joinLabel }} <ArrowRight :size="18" /></button><NuxtLink class="sb-club-account-link" to="/account"><UserRound :size="19" aria-hidden="true" /><span>Мой кабинет</span></NuxtLink></div>
      </div>
      <figure v-if="page.slug === 'about'" class="sb-content-photo"><img :src="storefrontMediaUrl(siteContent.home.story.portraitUrl)" alt="Светлана Саркисян — основательница SARKISIAN" /></figure>
      <SitePageArt v-if="page.slug === 'contacts' || page.slug === 'delivery'" :kind="page.slug" :phone="contactPhone" :email="contactEmail" />
      <figure v-if="club" class="sb-club-banner sb-club-page-preview"><SiteLoyaltyPreview class="sb-card-tilt" @pointerenter="clubTilt.onPointerEnter" @pointermove="clubTilt.onPointerMove" @pointerleave="clubTilt.onPointerLeave" @pointercancel="clubTilt.onPointerCancel" /><figcaption>Пример бонусной карты. Ваш баланс — в личном кабинете.</figcaption></figure>
    </header>
    <aside v-if="page.reviewRequired" class="sb-review-notice" role="note"><b>Редакция для новой платформы</b><p>Перед публичным запуском документ должен быть проверен и утверждён оператором. Реквизиты, условия работы и подключённые сервисы необходимо сверить с фактическими данными.</p></aside>
    <section v-if="page.slug === 'contacts'" class="sb-contact-cards" aria-label="Способы связи">
      <a v-if="contactPhone" :href="siteContentPhoneHref(contactPhone)" class="sb-contact-card"><span>Позвонить</span><strong>{{ contactPhone }}</strong></a>
      <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="sb-contact-card"><span>Написать</span><strong>{{ contactEmail }}</strong></a>
    </section>
    <div class="sb-content-layout">
      <aside v-if="page.blocks?.length && !club && page.slug !== 'about'" class="sb-content-toc"><span>На этой странице</span><nav aria-label="Содержание страницы"><a v-for="block in page.blocks" :key="block.id" :href="`#${block.id}`">{{ block.title }}</a></nav></aside>
      <div class="sb-content-sections"><template v-for="block in page.blocks" :key="block.id"><SiteFounderBiography v-if="page.slug === 'about' && block.kind === 'biography'" :block="block" /><SiteClubReferral v-else-if="club && block.id === 'referral'" :block="block" /><section v-else :id="block.id" class="sb-content-block"><h2>{{ block.title }}</h2><p v-for="(text, index) in paragraphs(block.body)" :key="index">{{ text }}</p><NuxtLink v-if="block.buttonLabel && safeSiteContentUrl(block.buttonUrl)" :to="block.buttonUrl" class="sb-primary">{{ block.buttonLabel }} <ArrowRight :size="16" /></NuxtLink></section></template></div>
    </div>
    <div v-if="page.slug === 'contacts' && content.socialLinks.length" class="sb-content-socials"><span>Мы в социальных сетях</span><a v-for="social in content.socialLinks" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer"><img v-if="socialIcon(social.iconKey)" :src="socialIcon(social.iconKey)" alt="" /><span>{{ social.name }}</span></a></div>
    <footer class="sb-content-help"><div><span>Остались вопросы?</span><h2>Мы рядом, чтобы помочь.</h2></div><NuxtLink class="sb-primary" :to="page.slug === 'contacts' ? '/catalog' : '/contacts'">{{ page.slug === 'contacts' ? 'Вернуться к покупкам' : 'Связаться с нами' }} <ArrowRight :size="18" /></NuxtLink></footer>
  </article>
</template>
