<script setup lang="ts">
import { ArrowRight, Award, Gift, ShieldCheck } from '@lucide/vue';
import type { SiteContent } from '~/shared/site-content';
defineProps<{ block: SiteContent['home']['club'] }>();
const { openAuth } = useStorefrontPanels();
const tilt = useStorefrontCardTilt();
const icons = { award: Award, gift: Gift, shield: ShieldCheck };
</script>

<template>
  <section class="sb-club-banner">
    <div class="sb-club-banner__glow"></div>
    <div class="sb-club-banner__copy">
      <p class="sb-club-banner__label">{{ block.label }}</p>
      <h2>{{ block.title }}<br /><em>{{ block.accent }}</em></h2>
      <ul class="sb-club-perks"><li v-for="benefit in block.benefits" :key="benefit.id"><component :is="icons[benefit.icon]" :size="20" /><span>{{ benefit.text }}</span></li></ul>
      <div class="sb-club-actions"><button type="button" class="sb-liquid-primary sb-club-join" @click="openAuth('register')">{{ block.joinLabel }} <ArrowRight :size="17" /></button><NuxtLink to="/club" class="sb-liquid-primary sb-club-about">{{ block.aboutLabel }} <ArrowRight :size="17" /></NuxtLink></div>
    </div>
    <SiteLoyaltyPreview class="sb-card-tilt" @pointerenter="tilt.onPointerEnter" @pointermove="tilt.onPointerMove" @pointerleave="tilt.onPointerLeave" @pointercancel="tilt.onPointerCancel" />
  </section>
</template>
