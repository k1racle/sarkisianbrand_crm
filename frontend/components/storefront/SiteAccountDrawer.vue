<script setup lang="ts">
import { X } from '@lucide/vue';
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const motion = useStorefrontMotion(); const panel = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null, previousOverflow = '', locked = false;
function unlock() { if (!locked) return; document.documentElement.style.overflow = previousOverflow; locked = false; previousFocus?.focus(); }
function keydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); }
  if (event.key !== 'Tab') return;
  const elements = Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []).filter(el => el.getClientRects().length);
  const first = elements[0], last = elements[elements.length - 1];
  if (!first) { event.preventDefault(); panel.value?.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
watch(() => props.open, async open => { if (!import.meta.client || !open) return; if (!locked) { previousFocus = document.activeElement as HTMLElement; previousOverflow = document.documentElement.style.overflow; locked = true; } document.documentElement.style.overflow = 'hidden'; await nextTick(); panel.value?.focus(); });
onMounted(() => window.addEventListener('keydown', keydown));
onBeforeUnmount(() => { if (import.meta.client) { window.removeEventListener('keydown', keydown); unlock(); } });
</script>
<template><Teleport to="body"><Transition name="sf-drawer" :duration="motion" @after-leave="unlock"><div v-if="open" class="sb-glass-layer" @click.self="emit('close')"><aside ref="panel" class="sb-side-drawer sa-drawer" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1"><header class="sb-drawer-head"><h2>{{ title }}</h2><button class="sa-close" aria-label="Закрыть" @click="emit('close')"><X :size="20" /></button></header><div class="sa-drawer-body"><slot /></div></aside></div></Transition></Teleport></template>
