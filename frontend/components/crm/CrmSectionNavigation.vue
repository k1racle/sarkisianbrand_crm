<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
withDefaults(defineProps<{ mode?: 'full' | 'breadcrumb' | 'tabs' }>(), { mode: 'full' });
const { active, moduleItems, legacyAlternative } = useCrmNavigation();
const sectionLinks = ref<HTMLElement | null>(null);
let resized: ResizeObserver | undefined;
let disposed = false;
function revealActive() {
  const bar = sectionLinks.value;
  const selected = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !selected) return;
  const bounds = bar.getBoundingClientRect(), item = selected.getBoundingClientRect();
  if (item.left < bounds.left) bar.scrollLeft -= bounds.left - item.left;
  else if (item.right > bounds.right) bar.scrollLeft += item.right - bounds.right;
}
async function revealWhenReady() {
  await nextTick();
  if (import.meta.client) await document.fonts.ready;
  if (!disposed) revealActive();
}
watch(() => [active.value?.id, ...moduleItems.value.map(item => `${item.id}:${item.label}`)].join('|'), revealWhenReady);
watch(sectionLinks, bar => {
  resized?.disconnect();
  if (!bar) return;
  resized = new ResizeObserver(revealActive);
  resized.observe(bar);
  void revealWhenReady();
}, { flush: 'post' });
onMounted(revealWhenReady);
onBeforeUnmount(() => { disposed = true; resized?.disconnect(); });
</script>
<template>
  <div v-if="active && (mode === 'breadcrumb' || moduleItems.length > 1 || legacyAlternative || mode === 'full' && active.id !== 'crm-dashboard')" :class="mode === 'breadcrumb' ? 'crm-topbar-context' : 'crm-section-navigation'">
    <nav v-if="mode !== 'tabs'" class="crm-breadcrumbs" aria-label="Путь раздела CRM">
      <span v-if="active.group !== active.label">{{ active.group }}</span>
      <template v-if="active.parentLabel"><ChevronRight :size="14" aria-hidden="true" /><NuxtLink :to="moduleItems[0].to">{{ active.parentLabel }}</NuxtLink></template>
      <ChevronRight v-if="active.group !== active.label || active.parentLabel" :size="14" aria-hidden="true" /><span aria-current="page">{{ active.label }}</span>
    </nav>
    <nav v-if="mode !== 'breadcrumb' && moduleItems.length > 1" ref="sectionLinks" class="crm-section-links" :aria-label="`Подразделы: ${active.parentLabel}`">
      <NuxtLink v-for="item in moduleItems" :key="item.id" :to="item.to" class="crm-button" :aria-current="active.id === item.id ? 'page' : undefined">{{ item.label }}</NuxtLink>
    </nav>
    <p v-if="mode !== 'breadcrumb' && legacyAlternative" class="crm-legacy-navigation">Этот экран сохранён для прежних ссылок. <NuxtLink :to="legacyAlternative.to">Открыть единую базу клиентов</NuxtLink></p>
  </div>
</template>
