<script setup lang="ts">
import type { SiteContent } from '~/shared/site-content';
defineProps<{ home: SiteContent['home'] }>();
const root = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;
onMounted(() => {
  const club = root.value?.querySelector<HTMLElement>('.sb-club-banner');
  if (!club) return;
  observer = new ResizeObserver(() => root.value?.style.setProperty('--sb-club-height', `${club.offsetHeight}px`));
  observer.observe(club);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div ref="root" class="sb-club-referral-stack"><SiteClubBlock :block="home.club" /><SitePartnershipBlock :block="home.referral" kind="referral" /></div>
</template>
