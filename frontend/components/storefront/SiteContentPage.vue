<script setup lang="ts">
import { ArrowRight, Award, Gift, ListChecks, ShieldCheck, UserRound, Wallet } from '@lucide/vue';
const props = defineProps<{ page: any }>();
const club = computed(() => props.page.slug === 'club');
const { openAuth } = useStorefrontPanels();
const clubIcon = (id: string) => ({ rewards: Award, balance: Wallet, levels: Gift, joining: UserRound, rules: ListChecks, support: ShieldCheck } as Record<string, any>)[id] || Gift;
const paragraphs = (body: string) => String(body || '').split(/\n+/).filter(Boolean);
const legal = computed(() => ['privacy', 'oferta', 'returns'].includes(props.page.slug));
const { content, loadStorefrontContent } = useStorefrontContent();
await loadStorefrontContent();
const socialIcon = (key: string) => ({ vk: '/storefront/icons/vk.svg', telegram: '/storefront/icons/telegram.svg', max: '/storefront/icons/max.svg' } as Record<string, string>)[key];
const contactText = computed(() => (props.page.blocks || []).map((block: any) => block.body).join('\n'));
const contactPhone = computed(() => contactText.value.match(/(?:8|\+7)\s*\(\d{3}\)\s*\d{3}[ -]\d{2}[ -]\d{2}/)?.[0] || '');
const contactEmail = computed(() => contactText.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '');
</script>

<template>
  <article class="sb-content-page" :class="{ 'is-legal': legal, 'is-about': page.slug === 'about', 'is-club': club }">
    <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>{{ page.eyebrow || page.title }}</span></nav>
    <header class="sb-content-hero">
      <div><p class="sb-kicker">{{ page.eyebrow }}</p><h1>{{ page.title }}</h1><p class="sb-content-lead">{{ page.lead }}</p>
        <div v-if="page.slug === 'about'" class="sb-content-actions"><NuxtLink class="sb-primary" to="/catalog">Посмотреть коллекцию</NuxtLink><NuxtLink class="sb-primary" to="/b2b-login">Кабинет B2B</NuxtLink></div>
        <div v-if="club" class="sb-content-actions"><button class="sb-primary" @click="openAuth('register')">Вступить в клуб <ArrowRight :size="18" /></button><NuxtLink class="sb-primary" to="/account">Мой кабинет <ArrowRight :size="18" /></NuxtLink></div>
      </div>
      <figure v-if="page.slug === 'about'" class="sb-content-photo"><img src="/storefront/hero.jpg" alt="SARKISIAN — материалы для мастеров" /></figure>
      <figure v-if="club" class="sb-club-banner sb-club-page-preview"><SiteLoyaltyPreview /><figcaption>Пример бонусной карты. Ваш баланс — в личном кабинете.</figcaption></figure>
    </header>
    <aside v-if="page.reviewRequired" class="sb-review-notice" role="note"><b>Редакция для новой платформы</b><p>Перед публичным запуском документ должен быть проверен и утверждён оператором. Реквизиты, условия работы и подключённые сервисы необходимо сверить с фактическими данными.</p></aside>
    <section v-if="page.slug === 'contacts'" class="sb-contact-cards" aria-label="Способы связи">
      <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^\d+]/g, '')}`" class="sb-contact-card"><span>Позвонить</span><strong>{{ contactPhone }}</strong></a>
      <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="sb-contact-card"><span>Написать</span><strong>{{ contactEmail }}</strong></a>
    </section>
    <div class="sb-content-layout">
      <aside v-if="page.blocks?.length && !club" class="sb-content-toc"><span>На этой странице</span><nav aria-label="Содержание страницы"><a v-for="block in page.blocks" :key="block.id" :href="`#${block.id}`">{{ block.title }}</a></nav></aside>
      <div class="sb-content-sections"><section v-for="block in page.blocks" :id="block.id" :key="block.id" class="sb-content-block"><component :is="clubIcon(block.id)" v-if="club" class="sb-club-block-icon" :size="24" aria-hidden="true" /><h2>{{ block.title }}</h2><p v-for="(text, index) in paragraphs(block.body)" :key="index">{{ text }}</p></section></div>
    </div>
    <div v-if="page.slug === 'contacts' && content.socialLinks.length" class="sb-content-socials"><span>Мы в социальных сетях</span><a v-for="social in content.socialLinks" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer"><img v-if="socialIcon(social.iconKey)" :src="socialIcon(social.iconKey)" alt="" /><span>{{ social.name }}</span></a></div>
    <footer class="sb-content-help"><div><span>Остались вопросы?</span><h2>Мы рядом, чтобы помочь.</h2></div><NuxtLink class="sb-primary" :to="page.slug === 'contacts' ? '/catalog' : '/contacts'">{{ page.slug === 'contacts' ? 'Вернуться к покупкам' : 'Связаться с нами' }}</NuxtLink></footer>
  </article>
</template>
