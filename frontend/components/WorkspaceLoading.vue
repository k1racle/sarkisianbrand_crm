<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue';
withDefaults(defineProps<{ label?: string }>(), { label: 'Загружаем рабочее пространство' });
</script>
<template><div data-v-ui-74ff4091789e class="workspace-loading"><LoaderCircle data-v-ui-74ff4091789e :size="24" /><span data-v-ui-74ff4091789e>{{ label }}</span></div></template>

