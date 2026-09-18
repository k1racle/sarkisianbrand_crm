import type { Ref } from 'vue';

/** Lock background scrolling only while a mobile navigation sheet is open. */
export function useMobileNavigationSheet(open: Ref<boolean>) {
  let media: MediaQueryList | undefined;
  let previousOverflow: string | undefined;
  function restoreScroll() {
    if (previousOverflow === undefined) return;
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }
  function closeOnDesktop() { if (media?.matches) open.value = false; }
  watch(open, value => {
    if (!import.meta.client) return;
    if (value) {
      if (previousOverflow === undefined) previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else restoreScroll();
  });
  onMounted(() => {
    media = window.matchMedia('(min-width: 801px)');
    media.addEventListener('change', closeOnDesktop);
  });
  onBeforeUnmount(() => {
    media?.removeEventListener('change', closeOnDesktop);
    restoreScroll();
  });
}
