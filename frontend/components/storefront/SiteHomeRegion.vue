<script setup lang="ts">
import { homeRegions } from '~/composables/useHomeLocale';
const { region, t, selectRegion } = useHomeLocale();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
function close(restoreFocus = false) { open.value = false; if (restoreFocus) trigger.value?.focus(); }
async function show() {
  open.value = !open.value;
  if (open.value) { await nextTick(); root.value?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(); }
}
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) close(); }
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !open.value) return;
  event.preventDefault();
  const options = [...(root.value?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || [])];
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
}
function blur(event: FocusEvent) { if (!root.value?.contains(event.relatedTarget as Node)) close(); }
onMounted(() => document.addEventListener('pointerdown', outside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside));
</script>

<template>
  <div ref="root" class="sh-region" @keydown="keydown" @focusout="blur">
    <button ref="trigger" class="sh-language" :aria-label="`${t('Язык и валюта')}: ${region.label}`" aria-haspopup="menu" :aria-expanded="open" aria-controls="home-region-menu" @click="show">
      <span class="sh-flag" :class="`sh-flag-${region.flag}`" aria-hidden="true"><span v-if="region.flag === 'eu'">✦</span></span>
    </button>
    <div v-if="open" id="home-region-menu" class="sh-region-popover" role="menu" :aria-label="t('Язык и валюта')">
      <button v-for="item in homeRegions" :key="item.id" role="menuitemradio" :aria-checked="region.id === item.id" @click="selectRegion(item.id); close(true)">
        <span class="sh-flag" :class="`sh-flag-${item.flag}`" aria-hidden="true"><span v-if="item.flag === 'eu'">✦</span></span>{{ item.label }}
      </button>
      <p>{{ t('Курсы валют примерные') }}</p>
    </div>
  </div>
</template>
