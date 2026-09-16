export function useStorefrontMotion() {
  const reducedMotion = ref(false);
  let preference: MediaQueryList | undefined;
  const updatePreference = () => { reducedMotion.value = Boolean(preference?.matches); };

  onMounted(() => {
    preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    updatePreference();
    preference.addEventListener('change', updatePreference);
  });

  onBeforeUnmount(() => preference?.removeEventListener('change', updatePreference));

  // Vue must keep the layer mounted until the longer, nested panel motion completes.
  return computed(() => reducedMotion.value ? 0 : { enter: 720, leave: 520 });
}
