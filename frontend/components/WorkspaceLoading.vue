<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue';
withDefaults(defineProps<{ label?: string }>(), { label: 'Загружаем рабочее пространство' });
</script>
<template><div class="workspace-loading"><LoaderCircle :size="24" /><span>{{ label }}</span></div></template>
<style scoped>.workspace-loading{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:14px;background:var(--sb-bg);color:var(--sb-muted);font:12px var(--sb-font)}.workspace-loading svg{color:var(--sb-coral);animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
