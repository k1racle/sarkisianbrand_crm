<script setup lang="ts">
import { ChevronLeft, ChevronRight, Music2 } from '@lucide/vue';
import { safeSiteContentUrl } from '~/shared/site-content';
const props = defineProps<{ block: { id: string; title: string; body: string; images?: string[]; socials?: Record<string, string> } }>();
const { storefrontMediaUrl } = useStorefrontContent();
const photos = computed(() => (props.block.images || []).filter(url => safeSiteContentUrl(url, true)).slice(0, 12));
const active = ref(0);
const socialNetworks = [{ key: 'vk', name: 'ВКонтакте', icon: '/storefront/icons/vk.svg' }, { key: 'telegram', name: 'Telegram', icon: '/storefront/icons/telegram.svg' }, { key: 'instagram', name: 'Instagram', icon: '/storefront/icons/instagram.svg' }, { key: 'youtube', name: 'YouTube', icon: '/storefront/icons/youtube.svg' }, { key: 'tiktok', name: 'TikTok', icon: '' }];
const socials = computed(() => socialNetworks.map(network => ({ ...network, url: props.block.socials?.[network.key] || '' })).filter(network => /^https:\/\//i.test(network.url) && safeSiteContentUrl(network.url)));
const paragraphs = computed(() => props.block.body.split(/\n+/).filter(Boolean));
const step = (direction: number) => { if (photos.value.length) active.value = (active.value + direction + photos.value.length) % photos.value.length; };
watch(photos, () => { active.value = 0; });
</script>

<template>
  <section :id="block.id" class="sb-founder-biography" aria-label="Об основательнице бренда">
    <div class="sb-founder-biography__copy"><p class="sb-kicker">Основательница SARKISIAN</p><h2>{{ block.title }}</h2><p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p><nav v-if="socials.length" class="sb-founder-socials" aria-label="Личные соцсети Светланы Саркисян"><a v-for="social in socials" :key="social.key" :href="social.url" target="_blank" rel="noopener noreferrer" :aria-label="social.name" :title="social.name"><img v-if="social.icon" :src="social.icon" alt="" /><Music2 v-else :size="22" /></a></nav></div>
    <div v-if="photos.length" class="sb-founder-gallery" role="region" aria-roledescription="карусель" aria-label="Фотографии Светланы Саркисян" tabindex="0" @keydown.left.prevent="step(-1)" @keydown.right.prevent="step(1)">
      <figure><img :src="storefrontMediaUrl(photos[active])" :alt="`Светлана Саркисян — фотография ${active + 1}`" loading="lazy" decoding="async" /></figure>
      <template v-if="photos.length > 1">
        <div class="sb-founder-gallery__controls"><button type="button" aria-label="Предыдущая фотография" @click="step(-1)"><ChevronLeft :size="28" /></button><button type="button" aria-label="Следующая фотография" @click="step(1)"><ChevronRight :size="28" /></button></div>
        <div class="sb-founder-gallery__pagination" role="group" aria-label="Выбор фотографии"><button v-for="(_, index) in photos" :key="index" type="button" :aria-label="`Показать фотографию ${index + 1}`" :aria-current="active === index ? 'true' : undefined" @click="active = index"><span aria-hidden="true" /></button></div>
        <span class="sb-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{ active + 1 }} / {{ photos.length }}</span>
      </template>
    </div>
  </section>
</template>
