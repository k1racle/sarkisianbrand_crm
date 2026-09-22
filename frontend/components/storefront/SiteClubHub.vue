<script setup lang="ts">
import { ArrowRight, Building2, Gift, PenLine, UserRound } from '@lucide/vue';

const { siteContent } = useStorefrontContent();
const { openAuth } = useStorefrontPanels();
const props = defineProps<{ page?: any }>();
const pageBlocks = computed(() => Object.fromEntries((props.page?.blocks || []).map((block: any) => [block.id, block])));
const paragraphs = (body: string) => String(body || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
const heroTitle = computed(() => {
  const parts = String(props.page?.title || 'Один клуб. Выберите свой формат.').split(/(?<=\.)\s+/);
  return { main: parts[0], accent: parts.slice(1).join(' ') };
});
const contentBlock = (id: string) => pageBlocks.value[id];
const fromPage = (id: string, fallback: any) => {
  const block = contentBlock(id);
  if (!block) return fallback;
  const lines = paragraphs(block.body);
  return { ...fallback, title: block.title || fallback.title, body: lines[0] || fallback.body, benefits: lines.slice(1, 4), url: block.buttonUrl || fallback.url, label: block.buttonLabel || fallback.label };
};

const directions = computed(() => {
  const home = siteContent.value.home;
  return [
    fromPage('buyers', {
      key: 'b2c',
      eyebrow: 'ДЛЯ МАСТЕРОВ И ПОКУПАТЕЛЕЙ',
      title: home.club.title,
      accent: home.club.accent,
      body: 'Покупайте материалы для работы, получайте бонусы и храните всю историю участия в одном личном кабинете.',
      benefits: home.club.benefits.map(item => item.text).slice(0, 3),
      url: '/club/referrals',
      label: 'Как работает клуб',
      icon: Gift,
      tone: 'light',
    }),
    fromPage('business', {
      key: 'b2b',
      eyebrow: 'ДЛЯ САЛОНОВ И БИЗНЕСА',
      title: home.business.title,
      accent: home.business.accent,
      body: home.business.body,
      benefits: home.business.visualLines.slice(0, 3),
      url: '/business',
      label: 'Решения для бизнеса',
      icon: Building2,
      tone: 'dark',
    }),
    fromPage('bloggers', {
      key: 'bloggers',
      eyebrow: 'ДЛЯ БЛОГЕРОВ И АВТОРОВ',
      title: home.bloggers.title,
      accent: home.bloggers.accent,
      body: home.bloggers.body,
      benefits: home.bloggers.visualLines.slice(0, 3),
      url: '/partnerships',
      label: 'Условия для авторов',
      icon: PenLine,
      tone: 'rose',
    }),
  ];
});
const directionsBlock = computed(() => contentBlock('directions'));
const footerBlock = computed(() => contentBlock('footer'));
</script>

<template>
<article class="sb-club-hub">
  <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>О клубе</span></nav>

  <header class="sb-club-hub__hero">
    <div>
      <p class="sb-kicker">{{ props.page?.eyebrow || 'SARKISIAN CLUB' }}</p>
      <h1>{{ heroTitle.main }}<br /><em>{{ heroTitle.accent }}</em></h1>
      <p class="sb-club-hub__lead">{{ props.page?.lead || 'Для мастеров, салонов и авторов: бонусы, удобные закупки и понятное партнёрство в одном пространстве.' }}</p>
      <div class="sb-club-hub__actions">
        <button class="sb-primary" type="button" @click="openAuth('register')">{{ siteContent.home.club.joinLabel }} <ArrowRight :size="18" /></button>
        <NuxtLink class="sb-club-hub__account" to="/account"><UserRound :size="18" aria-hidden="true" /><span>Мой кабинет</span></NuxtLink>
      </div>
    </div>
    <div class="sb-club-hub__signal" aria-hidden="true"><span>01</span><i></i><span>03</span><small>Покупки · бизнес · авторы</small></div>
  </header>

  <section class="sb-club-hub__directions" aria-labelledby="club-directions-title">
    <div class="sb-club-hub__section-head"><p class="sb-kicker">ВЫБЕРИТЕ СВОЙ ФОРМАТ</p><h2 id="club-directions-title">{{ directionsBlock?.title || 'Клуб подстраивается под вашу работу.' }}</h2><p v-if="directionsBlock?.body">{{ directionsBlock.body }}</p></div>
    <div class="sb-club-hub__grid">
      <div v-for="direction in directions" :key="direction.key" class="sb-club-direction" :class="`is-${direction.tone}`">
        <div class="sb-club-direction__top"><component :is="direction.icon" :size="21" /><span>{{ direction.eyebrow }}</span></div>
        <h3>{{ direction.title }} <em>{{ direction.accent }}</em></h3>
        <p>{{ direction.body }}</p>
        <ul><li v-for="benefit in direction.benefits" :key="benefit">{{ benefit }}</li></ul>
        <NuxtLink :to="direction.url">{{ direction.label }} <ArrowRight :size="17" /></NuxtLink>
      </div>
    </div>
  </section>

  <footer class="sb-club-hub__footer"><div><p class="sb-kicker">SARKISIAN CLUB</p><h2>{{ footerBlock?.title || 'Выберите направление, а дальше мы поможем.' }}</h2><p v-if="footerBlock?.body">{{ footerBlock.body }}</p></div><NuxtLink class="sb-primary" :to="footerBlock?.buttonUrl || '/contacts'">{{ footerBlock?.buttonLabel || 'Задать вопрос' }} <ArrowRight :size="18" /></NuxtLink></footer>
</article>
</template>
