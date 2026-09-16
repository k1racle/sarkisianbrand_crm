/** Gentle, mouse-only card motion. Pointer updates never enter Vue reactivity. */
export function useStorefrontCardTilt() {
  const maxAngle = 3;
  let finePointer: MediaQueryList | undefined;
  let reducedMotion: MediaQueryList | undefined;
  let element: HTMLElement | null = null;
  let rect: DOMRect | null = null;
  let frame: number | null = null;
  let pointerX = 0;
  let pointerY = 0;

  const enabled = () => Boolean(finePointer?.matches && !reducedMotion?.matches);
  function reset() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (element) {
      element.classList.remove('is-card-tilting');
      element.style.setProperty('--sb-card-tilt-x', '0deg');
      element.style.setProperty('--sb-card-tilt-y', '0deg');
    }
    element = null; rect = null;
  }
  function paint() {
    frame = null;
    if (!enabled() || !element || !rect) { reset(); return; }
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const x = -clamp((pointerY - rect.top) / rect.height * 2 - 1) * maxAngle;
    const y = clamp((pointerX - rect.left) / rect.width * 2 - 1) * maxAngle;
    element.style.setProperty('--sb-card-tilt-x', `${x.toFixed(3)}deg`);
    element.style.setProperty('--sb-card-tilt-y', `${y.toFixed(3)}deg`);
  }
  function queue(event: PointerEvent) {
    pointerX = event.clientX; pointerY = event.clientY;
    if (frame === null) frame = requestAnimationFrame(paint);
  }
  function onPointerEnter(event: PointerEvent) {
    reset();
    if (!enabled() || event.pointerType !== 'mouse' || !(event.currentTarget instanceof HTMLElement)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    element = event.currentTarget;
    // Cache once, before any tilt writes: transformed bounds never feed back
    // into subsequent pointer calculations. No layout reads inside RAF/move.
    rect = bounds;
    element.classList.add('is-card-tilting');
    queue(event);
  }
  function onPointerMove(event: PointerEvent) {
    if (!enabled() || event.pointerType !== 'mouse') { reset(); return; }
    if (event.currentTarget === element && rect) queue(event);
  }
  function visibilityChanged() { if (document.hidden) reset(); }

  onMounted(() => {
    finePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    finePointer.addEventListener('change', reset);
    reducedMotion.addEventListener('change', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset, { passive: true });
    document.addEventListener('visibilitychange', visibilityChanged);
  });
  onBeforeUnmount(() => {
    reset();
    finePointer?.removeEventListener('change', reset);
    reducedMotion?.removeEventListener('change', reset);
    window.removeEventListener('blur', reset);
    window.removeEventListener('resize', reset);
    document.removeEventListener('visibilitychange', visibilityChanged);
  });
  return { onPointerEnter, onPointerMove, onPointerLeave: reset, onPointerCancel: reset };
}
