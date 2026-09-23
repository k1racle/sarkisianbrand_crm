<script setup lang="ts">
const { active } = useCrmNavigation();
useHead(() => ({ title: `${active.value?.label || 'Настройки'} — SARKISIAN CRM` }));
</script>
<template><SystemWorkspacePage page-section="access" /></template>
