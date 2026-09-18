<script setup lang="ts">
import { ArrowRight, Gift, Link2, ShoppingBag } from '@lucide/vue';
import { safeSiteContentUrl } from '~/shared/site-content';
const props = defineProps<{ block: any }>();
const { siteContent } = useStorefrontContent();
const heading = computed(() => {
  const parts = String(props.block.title || '').split(/(?<=\.)\s+/);
  return { main: parts[0], accent: parts.slice(1).join(' ') };
});
const paragraphs = computed(() => String(props.block.body || '').split(/\n+/).filter(Boolean));
const icons = [Link2, ShoppingBag, Gift];
</script>

<template>
  <section :id="block.id" class="sb-club-referral">
    <div class="sb-club-referral__copy">
      <h2>{{ heading.main }} <em v-if="heading.accent">{{ heading.accent }}</em></h2>
      <p v-for="(text, index) in paragraphs" :key="index">{{ text }}</p>
      <NuxtLink v-if="block.buttonLabel && safeSiteContentUrl(block.buttonUrl)" :to="block.buttonUrl" class="sb-primary">{{ block.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
    </div>
    <ol class="sb-club-referral__flow">
      <li v-for="(line, index) in siteContent.home.referral.visualLines" :key="index">
        <span class="sb-club-referral__node" aria-hidden="true"><component :is="icons[index % icons.length]" :size="25" /></span>
        <span>{{ line }}</span>
      </li>
    </ol>
  </section>
</template>
