/** Decorative mouse-only waves. Leaving stops emission, not existing animations. */
export function useCreatorReactions(enabled: () => boolean) {
  const particles = ref<{ id: number; kind: 'heart' | 'like'; left: number; size: number; delay: number; duration: number; drift: number }[]>([]);
  let sequence = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const expiry = new Map<number, ReturnType<typeof setTimeout>>();
  let reduced: MediaQueryList | undefined;
  let finePointer: MediaQueryList | undefined;
  const allowed = () => enabled() && finePointer?.matches && !reduced?.matches && !document.hidden;
  function finish(id: number) {
    const timeout = expiry.get(id);
    if (timeout) clearTimeout(timeout);
    expiry.delete(id);
    particles.value = particles.value.filter(particle => particle.id !== id);
  }
  function wave() {
    if (!allowed()) { stop(); return; }
    // Spread behind and beside the phone; never cover the text or CTA.
    for (let index = 0; index < 3; index++) {
      if (particles.value.length >= 30) break;
      const id = ++sequence;
      const duration = 3.8 + Math.random() * 1.2;
      const delay = index * .13;
      particles.value.push({ id, kind: id % 3 === 0 ? 'like' : 'heart', left: 8 + index * 34 + Math.random() * 12, size: 16 + Math.random() * 11, delay, duration, drift: (Math.random() - .5) * 70 });
      expiry.set(id, setTimeout(() => finish(id), (duration + delay) * 1000 + 250));
    }
  }
  function start(event: PointerEvent) {
    if (timer || event.pointerType !== 'mouse' || !allowed()) return;
    wave();
    timer = setInterval(wave, 720);
  }
  function stop() { if (timer) clearInterval(timer); timer = undefined; }
  function preferenceChanged() { if (!allowed()) { stop(); for (const id of expiry.keys()) finish(id); } }
  function visibilityChanged() { if (document.hidden) stop(); }
  onMounted(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    reduced.addEventListener('change', preferenceChanged);
    finePointer.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
  });
  onBeforeUnmount(() => {
    stop();
    for (const timeout of expiry.values()) clearTimeout(timeout);
    expiry.clear();
    reduced?.removeEventListener('change', preferenceChanged);
    finePointer?.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
  });
  return { particles, start, stop, finish };
}
