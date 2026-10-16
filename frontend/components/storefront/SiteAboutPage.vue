<script setup lang="ts">
import { safeSiteContentUrl } from '~/shared/site-content';
const props = defineProps<{ page: any }>();
const { content, storefrontMediaUrl } = useStorefrontContent();
const { t, english } = useHomeLocale();
useHead(() => ({ htmlAttrs: { lang: english.value ? 'en' : 'ru' } }));
const biography = computed(() => props.page.blocks?.find((block: any) => block.kind === 'biography'));
const founderCopy = computed(() => String(biography.value?.body || props.page.lead || '').split(/\n+/).filter(Boolean));
const founderName = computed(() => {
  const words = String(biography.value?.title || 'Светлана Саркисян').trim().split(/\s+/);
  return [words.shift(), words.join(' ')];
});
// The supplied export uses exactly this existing portrait. A CMS replacement
// continues to win over the original legacy default photo.
const portrait = computed(() => {
  const custom = biography.value?.images?.[0];
  return custom && custom !== '/storefront/svetlana-portrait.png' && safeSiteContentUrl(custom, true)
    ? storefrontMediaUrl(custom) : '/storefront/home/svetlana-hero.png';
});
const networks = [{ key: 'vk', label: 'ВКонтакте' }, { key: 'telegram', label: 'Telegram' }, { key: 'instagram', label: 'Instagram' }, { key: 'youtube', label: 'YouTube' }, { key: 'tiktok', label: 'TikTok' }];
const founderSocials = computed(() => networks.map(network => ({ ...network, url: biography.value?.socials?.[network.key] })).filter(network => network.url && /^https:\/\//i.test(network.url) && safeSiteContentUrl(network.url)));
const brandSocials = computed(() => content.value.socialLinks.filter(social => social.isActive !== false && /^https:\/\//i.test(social.url) && safeSiteContentUrl(social.url)));
const blocks = computed(() => (props.page.blocks || []).filter((block: any) => block.kind !== 'biography'));
const paragraphs = (body: string) => String(body || '').split(/\n+/).filter(Boolean);
const introTitle = computed(() => String(props.page.title || '').split(/(?<=\.)\s+/).map(part => part.replace(/\.$/, '')));
</script>

<template>
  <article class="sa-page">
    <header class="sa-hero sh-container">
      <h1><span class="sb-visually-hidden">{{ t('О бренде') }} SARKISIAN</span><img src="/storefront/home/hero-wordmark.svg" alt="" width="1412" height="196" fetchpriority="high" /></h1>
      <div class="sa-hero-copy"><p>{{ t('Премиальный бренд для мастеров маникюра, который понимает профессию изнутри.') }}<br />{{ t('Материалы, которые помогают работать быстрее и увереннее') }}</p><span>{{ t('От мастера — к мастерам') }}</span></div>
    </header>

    <section class="sa-intro sh-container" aria-labelledby="about-intro-title">
      <div class="sa-intro-media sh-media-placeholder" aria-hidden="true"></div>
      <div class="sa-intro-copy"><h2 id="about-intro-title"><span v-for="part in introTitle" :key="part">{{ t(part) }}</span></h2><div><p>{{ t(page.lead) }}</p><p>{{ t(page.lead) }}</p></div></div>
      <p class="sa-section-label" aria-hidden="true">{{ t(page.eyebrow || 'О бренде') }}</p>
    </section>

    <section class="sa-founder sh-container" aria-labelledby="about-founder-title">
      <div class="sa-founder-stage">
        <h2 id="about-founder-title"><span>{{ t(founderName[0] || '') }}</span><span>{{ t(founderName[1]) }}</span></h2>
        <img class="sa-founder-portrait" :src="portrait" :alt="biography?.title || 'Светлана Саркисян'" width="853" height="1280" loading="lazy" />
        <span class="sa-role sa-role-founder">{{ t('Основательница') }}</span><span class="sa-role sa-role-blogger">{{ t('Блогер') }}</span><span class="sa-role sa-role-master">{{ t('Мастер маникюра') }}</span>
        <p class="sa-founder-copy sa-founder-copy-left">{{ t(founderCopy[0] || page.lead) }}</p>
        <div class="sa-founder-copy sa-founder-copy-right"><p v-for="(paragraph, index) in founderCopy.slice(2)" :key="index">{{ t(paragraph) }}</p></div>
        <p class="sa-founder-summary">{{ t(founderCopy[1] || page.lead) }}</p>
      </div>
      <div class="sa-founder-footer"><nav v-if="founderSocials.length" class="sa-founder-socials" aria-label="Личные соцсети Светланы Саркисян"><a v-for="social in founderSocials" :key="social.key" :href="social.url" target="_blank" rel="noopener noreferrer">{{ social.label }}<span class="sb-visually-hidden"> — {{ biography?.title || 'Светлана Саркисян' }}</span></a></nav><NuxtLink to="/catalog" class="sb-design-button">{{ t('Заказать') }}</NuxtLink></div>
    </section>

    <nav v-if="brandSocials.length" id="brand-socials" class="sa-brand-socials sh-container" :aria-label="t('Соцсети бренда')"><a v-for="social in brandSocials" :key="social.id" :href="social.url" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">+</span>{{ social.name }}</a><span aria-hidden="true">+</span></nav>

    <div class="sa-values sh-container"><section v-for="block in blocks" :id="block.id" :key="block.id" class="sa-value"><h2>{{ t(block.title) }}</h2><p v-for="(paragraph, index) in paragraphs(block.body)" :key="index">{{ t(paragraph) }}</p><NuxtLink v-if="block.buttonLabel && safeSiteContentUrl(block.buttonUrl)" :to="block.buttonUrl" class="sb-design-button">{{ t(block.buttonLabel) }}</NuxtLink></section><a v-if="brandSocials.length" class="sa-socials-button sb-design-button" href="#brand-socials">{{ t('Соцсети') }}</a></div>
  </article>
</template>
