<script setup lang="ts">
import { ArrowRight, Building2, CalendarDays, Check, Gift, Heart, Music2, Pause, Play, RotateCcw, Signal, Sparkles, ThumbsUp, Wifi, X, Zap } from '@lucide/vue';
import { safeSiteContentUrl, type HomePartnershipBlock } from '~/shared/site-content';
const props = defineProps<{ block: HomePartnershipBlock; kind: 'business' | 'referral' | 'bloggers'; headingTag?: 'h1' | 'h2' }>();
const { storefrontMediaUrl } = useStorefrontContent();
const phoneTilt = useStorefrontCardTilt();
const reactions = useCreatorReactions(() => props.kind === 'bloggers' && props.headingTag !== 'h1');
const { particles } = reactions;
function enterPhone(event: PointerEvent) { phoneTilt.onPointerEnter(event); reactions.start(event); }
function leavePhone() { phoneTilt.onPointerLeave(); reactions.stop(); }
const video = ref<HTMLVideoElement | null>(null);
const paused = ref(true);
const deviceTime = ref('--:--');
let clockTimer: ReturnType<typeof setTimeout> | undefined;
function syncDeviceTime() {
  if (clockTimer) clearTimeout(clockTimer);
  if (props.kind !== 'bloggers' || document.hidden) return;
  deviceTime.value = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  clockTimer = setTimeout(syncDeviceTime, 60000 - Date.now() % 60000 + 20);
}
function visibilityChanged() { syncPlayback(); syncDeviceTime(); }
const videoFailed = ref(false);
const videoUrl = computed(() => safeSiteContentUrl(props.block.visualVideoUrl, true) ? storefrontMediaUrl(props.block.visualVideoUrl) : '');
let observer: IntersectionObserver | undefined;
let reduced: MediaQueryList | undefined;
let inView = false;
let manuallyPaused = false;
function syncPlayback() {
  if (!video.value) return;
  if (inView && !document.hidden && !reduced?.matches && !manuallyPaused) video.value.play().catch(() => { paused.value = true; });
  else video.value.pause();
}
function togglePlayback() {
  if (!video.value) return;
  manuallyPaused = !video.value.paused;
  if (manuallyPaused) video.value.pause(); else video.value.play().catch(() => { paused.value = true; });
}
function observeVideo() {
  observer?.disconnect();
  if (!video.value) return;
  observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncPlayback(); }, { threshold: .15 });
  observer.observe(video.value);
}
onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced.addEventListener('change', syncPlayback);
  document.addEventListener('visibilitychange', visibilityChanged);
  syncDeviceTime();
  observeVideo();
});
watch(videoUrl, async () => { videoFailed.value = false; await nextTick(); observeVideo(); });
onBeforeUnmount(() => { observer?.disconnect(); reduced?.removeEventListener('change', syncPlayback); document.removeEventListener('visibilitychange', visibilityChanged); if (clockTimer) clearTimeout(clockTimer); video.value?.pause(); });
</script>

<template>
  <section class="sb-home-partnership" :class="['sb-home-partnership--' + block.theme, 'sb-home-partnership--' + kind, { 'sb-home-partnership--workspace': kind === 'business' && headingTag !== 'h1' }]">
    <div class="sb-home-partnership__copy">
      <p class="sb-kicker">{{ block.eyebrow }}</p>
      <component :is="headingTag || 'h2'" class="sb-partnership-heading">{{ block.title }} <em>{{ block.accent }}</em></component>
      <p class="sb-home-partnership__body">{{ block.body }}</p>
      <NuxtLink v-if="block.buttonLabel && safeSiteContentUrl(block.url)" :to="block.url === '/partnerships#referral' ? '/club#referral' : block.url" class="sb-partnership-button sb-liquid-primary">{{ block.buttonLabel }} <ArrowRight :size="18" aria-hidden="true" /></NuxtLink>
    </div>
    <div v-if="kind === 'bloggers'" class="sb-creator-art">
      <div class="sb-creator-reactions" aria-hidden="true">
        <span v-for="particle in particles" :key="particle.id" class="sb-creator-reaction" :class="'is-' + particle.kind" :style="{ left: particle.left + '%', '--reaction-size': particle.size + 'px', '--reaction-duration': particle.duration + 's', '--reaction-delay': particle.delay + 's', '--reaction-drift': particle.drift + 'px' }" @animationend="reactions.finish(particle.id)"><component :is="particle.kind === 'heart' ? Heart : ThumbsUp" /></span>
      </div>
      <div class="sb-creator-phone sb-card-tilt" role="group" aria-label="Макет iPhone с экраном записи TikTok" @pointerenter="enterPhone" @pointermove="phoneTilt.onPointerMove" @pointerleave="leavePhone" @pointercancel="leavePhone">
        <div class="sb-creator-phone__screen" aria-hidden="true">
          <img v-if="safeSiteContentUrl(block.visualImageUrl, true)" :src="storefrontMediaUrl(block.visualImageUrl)" alt="" loading="lazy" decoding="async" />
          <video v-if="videoUrl && !videoFailed" ref="video" :src="videoUrl" :poster="storefrontMediaUrl(block.visualImageUrl)" muted loop playsinline preload="none" @play="paused = false" @pause="paused = true" @error="videoFailed = true"></video>
          <div class="sb-creator-phone__shade"></div>
          <div class="sb-creator-phone__status"><span>{{ deviceTime }}</span><span><Signal :size="12" /><Wifi :size="12" /><i></i></span></div>
          <div class="sb-creator-phone__island"></div>
          <div class="sb-creator-phone__top"><X :size="20" /><span><Music2 :size="13" /> TikTok</span><span class="sb-creator-phone__live"><i></i>00:12</span></div>
          <div class="sb-creator-phone__progress"><i></i></div>
          <div class="sb-creator-phone__tools"><RotateCcw :size="21" /><Zap :size="21" /><Sparkles :size="21" /></div>
          <div v-if="!videoUrl || videoFailed" class="sb-creator-phone__controls"><i class="sb-creator-phone__shutter"><i></i></i></div>
          <div class="sb-creator-phone__home"></div>
        </div>
        <button v-if="videoUrl && !videoFailed" type="button" class="sb-creator-phone__playback" :aria-label="paused ? 'Воспроизвести видео' : 'Приостановить видео'" @click="togglePlayback"><Play v-if="paused" :size="22" aria-hidden="true" /><Pause v-else :size="22" aria-hidden="true" /></button>
      </div>
    </div>
    <SiteBusinessPreview v-else-if="kind === 'business' && headingTag !== 'h1'" :block="block" />
    <div v-else class="sb-partnership-art" :class="'sb-partnership-art--' + kind">
      <div v-if="kind === 'referral'" class="sb-referral-card-back" aria-hidden="true"><Gift :size="26" /><span>{{ block.visualLabel }}</span><i></i><i></i></div>
      <div class="sb-partnership-art__card">
        <div class="sb-partnership-art__head"><span>{{ block.visualLabel }}</span><component :is="kind === 'business' ? Building2 : Gift" :size="20" aria-hidden="true" /></div>
        <h3>{{ block.visualTitle }}</h3>
        <ol><li v-for="(line, index) in block.visualLines" :key="index"><i aria-hidden="true"><Check :size="15" /></i><span>{{ line }}</span></li></ol>
        <div v-if="kind === 'business'" class="sb-business-calendar" aria-hidden="true"><CalendarDays :size="18" /><div><span v-for="day in 7" :key="day"></span><i v-for="slot in 14" :key="slot"></i></div></div>
      </div>
    </div>
  </section>
</template>
