<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
const { active, moduleItems, legacyAlternative } = useCrmNavigation();
const sectionLinks = ref<HTMLElement | null>(null);
function revealActive() {
  const bar = sectionLinks.value;
  const selected = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !selected) return;
  const bounds = bar.getBoundingClientRect(), item = selected.getBoundingClientRect();
  if (item.left < bounds.left) bar.scrollLeft -= bounds.left - item.left;
  else if (item.right > bounds.right) bar.scrollLeft += item.right - bounds.right;
}
watch(() => active.value?.id, async () => { await nextTick(); revealActive(); });
onMounted(revealActive);
</script>
<template>
  <div v-if="active && active.id !== 'crm-dashboard'" class="crm-section-navigation">
    <nav class="crm-breadcrumbs" aria-label="Путь раздела CRM">
      <span>{{ active.group }}</span>
      <template v-if="active.parentLabel"><ChevronRight :size="14" aria-hidden="true" /><NuxtLink :to="moduleItems[0].to">{{ active.parentLabel }}</NuxtLink></template>
      <ChevronRight :size="14" aria-hidden="true" /><span aria-current="page">{{ active.label }}</span>
    </nav>
    <nav v-if="moduleItems.length > 1" ref="sectionLinks" class="crm-section-links" :aria-label="`Подразделы: ${active.parentLabel}`">
      <NuxtLink v-for="item in moduleItems" :key="item.id" :to="item.to" class="crm-button" :aria-current="active.id === item.id ? 'page' : undefined">{{ item.label }}</NuxtLink>
    </nav>
    <p v-if="legacyAlternative" class="crm-legacy-navigation">Этот экран сохранён для прежних ссылок. <NuxtLink :to="legacyAlternative.to">Открыть единую базу клиентов</NuxtLink></p>
  </div>
</template>
