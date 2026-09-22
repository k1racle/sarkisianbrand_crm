<script setup lang="ts">
import { ArrowRight, BarChart3, Building2, Check, ChevronDown, CircleDollarSign, Link2, Wallet } from '@lucide/vue';
import { safeSiteContentUrl, type HomePartnershipBlock } from '~/shared/site-content';

const props = defineProps<{ page: any }>();
const { siteContent } = useStorefrontContent();
const blocks = computed<any[]>(() => props.page.blocks || []);
const findBlock = (id: string) => computed<any>(() => blocks.value.find(item => item.id === id));
const cover = findBlock('cover');
const value = findBlock('bloggers');
const rewards = findBlock('rewards');
const businessReward = findBlock('business-reward');
const transparent = findBlock('transparent');
const start = findBlock('creator-start');
const contact = findBlock('together');
const faqs = computed(() => blocks.value.filter(item => item.kind === 'faq'));
const paragraphs = (body: unknown) => String(body || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
const canLink = (label: unknown, url: unknown) => typeof label === 'string' && !!label && !!safeSiteContentUrl(url);
const titleParts = computed(() => String(props.page.title || '').split('\n'));
const heroBlock = computed<HomePartnershipBlock>(() => {
  const base = siteContent.value.home.bloggers;
  return { ...base, eyebrow: props.page.eyebrow, title: titleParts.value[0], accent: titleParts.value.slice(1).join(' '), body: props.page.lead, theme: 'dark', buttonLabel: cover.value?.buttonLabel || '', url: cover.value?.buttonUrl || '', visualLines: paragraphs(cover.value?.body).slice(0, 4) };
});
</script>

<template>
  <article class="sb-partnership-page sb-bloggers-page">
    <nav class="sb-breadcrumbs" aria-label="Навигационная цепочка"><NuxtLink to="/">Главная</NuxtLink><span>/</span><span>Для блогеров</span></nav>

    <header class="sb-blogger-hero sb-partnership-cover">
      <SitePartnershipBlock :block="heroBlock" kind="bloggers" heading-tag="h1" />
    </header>

    <aside v-if="page.reviewRequired" class="sb-review-notice" role="note">Информация требует утверждения перед публичным запуском.</aside>

    <section v-if="value" :id="value.id" class="sb-blogger-value sb-blogger-panel">
      <div class="sb-blogger-value__copy"><p class="sb-kicker">ЧТО ПОЛУЧАЕТ АВТОР</p><h2>{{ value.title }}</h2><p v-for="(line, index) in paragraphs(value.body)" :key="index">{{ line }}</p><NuxtLink v-if="canLink(value.buttonLabel, value.buttonUrl)" :to="value.buttonUrl" class="sb-primary">{{ value.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink></div>
      <div class="sb-blogger-value__list"><div v-for="(line, index) in paragraphs(cover?.body)" :key="index"><span><Check :size="17" aria-hidden="true" /></span><div><b>{{ ['Персональная ссылка', 'Денежное вознаграждение', 'Бонус за новый бизнес'][index] || line }}</b><p>{{ line }}</p></div></div></div>
    </section>

    <div class="sb-blogger-section-head"><p class="sb-kicker">КАК РАБОТАЕТ ВОЗНАГРАЖДЕНИЕ</p><h2>Два способа зарабатывать<br /><em>вместе с SARKISIAN.</em></h2></div>
    <section v-if="rewards" :id="rewards.id" class="sb-blogger-offer sb-blogger-offer--light sb-partnership-feature--scene">
      <div class="sb-blogger-offer__copy"><div class="sb-blogger-offer__eyebrow"><CircleDollarSign :size="19" aria-hidden="true" /> РЕКОМЕНДАЦИИ И ПРОДАЖИ</div><h2>{{ rewards.title }}</h2><p v-for="(line, index) in paragraphs(rewards.body)" :key="index">{{ line }}</p></div><SitePartnershipScene kind="creators" />
    </section>
    <section v-if="businessReward" :id="businessReward.id" class="sb-blogger-offer sb-blogger-offer--dark sb-partnership-feature--scene">
      <div class="sb-blogger-offer__copy"><div class="sb-blogger-offer__eyebrow"><Building2 :size="19" aria-hidden="true" /> НОВЫЙ САЛОН ИЛИ БИЗНЕС</div><h2>{{ businessReward.title }}</h2><p v-for="(line, index) in paragraphs(businessReward.body)" :key="index">{{ line }}</p></div><div class="sb-blogger-reward-visual"><div class="sb-blogger-reward-visual__top"><span>Фиксированная награда</span><Building2 :size="18" aria-hidden="true" /></div><strong>Бонус</strong><div class="sb-blogger-reward-visual__bars"><i></i><i></i><i></i><i></i><i></i></div><small>После проверки и активации организации</small></div>
    </section>

    <section v-if="transparent" :id="transparent.id" class="sb-blogger-analytics"><div class="sb-blogger-analytics__copy"><p class="sb-kicker">ЛИЧНЫЙ КАБИНЕТ</p><h2>{{ transparent.title }}</h2><p v-for="(line, index) in paragraphs(transparent.body)" :key="index">{{ line }}</p></div><div class="sb-blogger-dashboard"><header><span>Партнёрская статистика</span><BarChart3 :size="19" aria-hidden="true" /></header><div class="sb-blogger-dashboard__numbers"><div><b>Переходы</b><strong>—</strong></div><div><b>Заказы</b><strong>—</strong></div><div><b>Начисления</b><strong>—</strong></div></div><div class="sb-blogger-dashboard__chart"><i v-for="bar in [28,45,36,64,52,78,61,92]" :key="bar" :style="{ height: bar + '%' }"></i></div><footer><Link2 :size="16" aria-hidden="true" /> Данные обновляются в кабинете партнёра</footer></div></section>

    <section v-if="start" :id="start.id" class="sb-blogger-start"><div><p class="sb-kicker">КАК УЧАСТВОВАТЬ</p><h2>{{ start.title }}</h2><NuxtLink v-if="canLink(cover?.buttonLabel, cover?.buttonUrl)" :to="cover.buttonUrl" class="sb-primary">{{ cover.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink></div><ol><li v-for="(line, index) in paragraphs(start.body)" :key="index"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><b>{{ ['Подайте заявку', 'Получите персональную ссылку', 'Создавайте и отслеживайте'][index] || 'Следующий шаг' }}</b><p>{{ line }}</p></div></li></ol></section>

    <div v-if="faqs.length" class="sb-blogger-faq"><div><p class="sb-kicker">ПРОЗРАЧНЫЕ УСЛОВИЯ</p><h2>Вопросы и ответы</h2><p>Главное о покупках, сроках и выплатах.</p></div><div><section v-for="item in faqs" :id="item.id" :key="item.id" class="sb-partnership-section"><details><summary>{{ item.title }}<ChevronDown :size="20" aria-hidden="true" /></summary><p v-for="(line, index) in paragraphs(item.body)" :key="index">{{ line }}</p></details></section></div></div>

    <section v-if="contact" :id="contact.id" class="sb-blogger-end"><div><p class="sb-kicker">SARKISIAN × АВТОРЫ</p><h2>{{ contact.title }}</h2><p v-for="(line, index) in paragraphs(contact.body)" :key="index">{{ line }}</p></div><div class="sb-blogger-end__actions"><NuxtLink v-if="canLink(contact.buttonLabel, contact.buttonUrl)" :to="contact.buttonUrl" class="sb-primary">{{ contact.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink><NuxtLink v-if="canLink(contact.secondaryLabel, contact.secondaryUrl)" :to="contact.secondaryUrl" class="sb-blogger-end__secondary">{{ contact.secondaryLabel }} <ArrowRight :size="16" aria-hidden="true" /></NuxtLink></div></section>
  </article>
</template>
