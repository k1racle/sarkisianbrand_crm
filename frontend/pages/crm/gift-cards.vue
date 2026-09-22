<script setup lang="ts">
const { active } = useCrmNavigation();
useHead(() => ({ title: `${active.value?.label || 'Рабочее пространство'} — SARKISIAN CRM` }));
</script>
<template><StoreWorkspacePage page-section="gift-cards" /></template>
