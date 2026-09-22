<script setup lang="ts">
import { FileText, Folder } from '@lucide/vue';
const props = defineProps<{ item: any }>();
const { request } = useCrmDrive();
const host = ref<HTMLElement | null>(null), url = ref('');
let observer: IntersectionObserver | undefined, disposed = false;
onMounted(() => {
  if (!['image/png','image/jpeg','image/webp'].includes(props.item.mime) || props.item.size > 8 * 1024 ** 2) return;
  observer = new IntersectionObserver(async entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer?.disconnect();
    try { const blob = await request<Blob>(`drive/${props.item.id}/content`, { responseType: 'blob' }); if (!disposed) url.value = URL.createObjectURL(new Blob([blob], { type: props.item.mime })); } catch { /* File icon remains available; opening reports any error. */ }
  });
  if (host.value) observer.observe(host.value);
});
onBeforeUnmount(() => { disposed = true; observer?.disconnect(); if (url.value) URL.revokeObjectURL(url.value); });
</script>
<template><span ref="host" class="crm-file-thumbnail"><img v-if="url" :src="url" alt="" /><component v-else :is="item.kind === 'FOLDER' ? Folder : FileText" :size="42" aria-hidden="true" /></span></template>
