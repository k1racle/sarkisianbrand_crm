<script setup lang="ts">
const layer = ref<HTMLElement | null>(null);
const cursor = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;
let reduced: MediaQueryList | undefined;
let finePointer: MediaQueryList | undefined;
let frame = 0;
let pointerX = 0;
let pointerY = 0;
const marked = new Set<HTMLElement>();
function clearReveals() {
  observer?.disconnect();
  observer = undefined;
  marked.forEach(el => el.classList.remove('sh-reveal', 'is-revealed'));
  marked.clear();
}
function hidePointer() { cancelAnimationFrame(frame); frame = 0; layer.value?.classList.remove('has-pointer'); cursor.value?.classList.remove('has-pointer'); document.body.classList.remove('sh-custom-cursor'); }
function movePointer(event: PointerEvent) {
  if (reduced?.matches || !finePointer?.matches || event.pointerType === 'touch') return;
  pointerX = event.clientX; pointerY = event.clientY;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    layer.value?.style.setProperty('--sh-pointer-x', `${pointerX}px`);
    layer.value?.style.setProperty('--sh-pointer-y', `${pointerY}px`);
    layer.value?.classList.add('has-pointer');
    cursor.value?.style.setProperty('--sh-pointer-x', `${pointerX}px`);
    cursor.value?.style.setProperty('--sh-pointer-y', `${pointerY}px`);
    cursor.value?.classList.add('has-pointer');
    document.body.classList.add('sh-custom-cursor');
    frame = 0;
  });
}
function setupMotion() {
  clearReveals(); hidePointer();
  if (reduced?.matches || !('IntersectionObserver' in window)) return;
  const root = layer.value?.closest('.sb-home');
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer?.unobserve(entry.target); }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -24px 0px' });
  root?.querySelectorAll<HTMLElement>('.sh-about > *, .sh-founder > *, .sh-products-intro, .sh-products-title, .sh-product, .sh-products-outro, .sh-benefits > h2, .sh-benefit-grid article, .sh-business > *, .sh-club > *, .sh-referral-copy, .sh-referral h2, .sh-referral-media, .sh-bloggers-copy, .sh-orbit, .sh-footer-marks, .sh-footer-links').forEach(el => {
    // Content is visible with SSR, without JS and when reduced motion is enabled.
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('sh-reveal'); marked.add(el); observer?.observe(el);
  });
}
function visibilityChanged() { layer.value?.classList.toggle('is-paused', document.hidden); if (document.hidden) hidePointer(); }
onMounted(async () => {
  await nextTick();
  reduced = matchMedia('(prefers-reduced-motion: reduce)');
  finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  reduced.addEventListener('change', setupMotion);
  finePointer.addEventListener('change', hidePointer);
  window.addEventListener('pointermove', movePointer, { passive: true });
  window.addEventListener('blur', hidePointer);
  document.documentElement.addEventListener('pointerleave', hidePointer);
  document.addEventListener('visibilitychange', visibilityChanged);
  setupMotion();
});
onBeforeUnmount(() => {
  clearReveals(); hidePointer(); cancelAnimationFrame(frame);
  reduced?.removeEventListener('change', setupMotion);
  finePointer?.removeEventListener('change', hidePointer);
  window.removeEventListener('pointermove', movePointer);
  window.removeEventListener('blur', hidePointer);
  document.documentElement.removeEventListener('pointerleave', hidePointer);
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>

<template>
  <div ref="layer" class="sh-ambience" aria-hidden="true"><div class="sh-lava"><span></span><span></span><span></span></div><div class="sh-concrete"></div><div class="sh-cursor-light"></div></div>
  <Teleport to="body"><div ref="cursor" class="sh-cursor-dot" aria-hidden="true"></div></Teleport>
</template>
