<script setup lang="ts">
const { active } = useCrmNavigation();
useHead(() => ({ title: `${active.value?.label || 'Рабочее пространство'} — SARKISIAN CRM` }));
</script>
<template><SupportWorkspacePage page-section="knowledge" /></template>
